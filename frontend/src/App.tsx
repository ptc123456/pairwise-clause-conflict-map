import { useEffect, useMemo, useRef, useState } from "react";
import { bundleJson, CONTRACT, FinalizedExecutionError, finalized, getCase, getCount, getIdByNonce, getOptionalVersion, getVersion, listActor, listCases, listChildren, submit, writer } from "./contract";
import { cells, contractArgs, digest, EMPTY_BUNDLE, resolutionPath, type Bundle, type CaseRecord } from "./domain";
import { journalJson, loadJournal, removeUnsigned, reserve, update } from "./pending";
import { useWallet, walletStore } from "./wallet";
import { BrandMark } from "./components/BrandMark";
import { LifecycleTracker } from "./components/LifecycleTracker";
import { PrecedenceInspector } from "./components/PrecedenceInspector";
import { HowItWorksSection } from "./components/HowItWorksSection";

type Progress = "IDLE" | "WAITING_FOR_WALLET" | "SUBMITTED" | "WAITING_FOR_FINALITY" | "VERIFYING_EXECUTION" | "VERIFYING_READBACK" | "SUCCESS" | "REJECTED" | "FAILED" | "RECONCILIATION_REQUIRED";

function TransactionProgress({ phase, hash, message }: { phase: Progress; hash?: string; message?: string }) {
  const [copied, setCopied] = useState(false);

  if (phase === "IDLE") return null;
  const pending = ["WAITING_FOR_WALLET", "SUBMITTED", "WAITING_FOR_FINALITY", "VERIFYING_EXECUTION", "VERIFYING_READBACK"].includes(phase);
  const alert = ["REJECTED", "FAILED", "RECONCILIATION_REQUIRED"].includes(phase);
  const isSuccess = phase === "SUCCESS";

  const copyHash = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op if clipboard unavailable in test runner
    }
  };

  return (
    <section
      className={`progress ${alert ? "progress-alert" : isSuccess ? "progress-success" : "progress-pending"}`}
      data-transaction-phase={phase}
      role={alert ? "alert" : "status"}
      aria-live={alert ? "assertive" : "polite"}
    >
      <div className="progress-indicator">
        {pending && <span className="spinner" aria-hidden="true" />}
        {isSuccess && <span className="progress-glyph glyph-success" aria-hidden="true">✓</span>}
        {alert && <span className="progress-glyph glyph-alert" aria-hidden="true">⚠</span>}
      </div>

      <div className="progress-content">
        <div className="progress-headline">
          <strong className="progress-phase-title">{phase.replaceAll("_", " ")}</strong>
          {phase === "RECONCILIATION_REQUIRED" && (
            <span className="reconcile-tag">PERSISTED IN JOURNAL</span>
          )}
        </div>
        {message && <span className="progress-message">{message}</span>}
        {hash && (
          <div className="progress-hash-row">
            <span className="hash-label">TX</span>
            <code className="progress-hash">{hash}</code>
            <button
              type="button"
              onClick={() => void copyHash()}
              className="btn-copy-hash"
              aria-label="Copy transaction hash"
              title="Copy transaction hash to clipboard"
            >
              {copied ? "Copied!" : "Copy hash"}
            </button>
            <span className="sr-only" aria-live="polite">
              {copied ? "Transaction hash copied to clipboard" : ""}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function WalletChooser() {
  const wallet = useWallet();
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!['CHOOSER_OPEN', 'CONNECTING', 'ERROR'].includes(wallet.phase)) return;
    const prior = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && wallet.phase !== "CONNECTING") walletStore.close();
      if (event.key !== "Tab" || !dialog.current) return;
      const items = [...dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      if (!items.length) return;
      const first = items[0], last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      prior?.focus();
    };
  }, [wallet.phase]);

  if (!['CHOOSER_OPEN', 'CONNECTING', 'ERROR'].includes(wallet.phase)) return null;

  return (
    <div
      className="backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && walletStore.close()}
    >
      <section
        ref={dialog}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-title"
      >
        <button
          className="close btn-close-dialog"
          onClick={() => walletStore.close()}
          aria-label="Close wallet chooser"
        >
          ×
        </button>
        <div className="dialog-header">
          <span className="dialog-kicker">EIP-6963 PROVIDER SELECTION</span>
          <h2 id="wallet-title">Choose a detected wallet</h2>
          <p className="dialog-desc">
            Select an announced provider connected to GenLayer Studionet (Chain 61999).
          </p>
        </div>

        <div className="wallet-options-list">
          {wallet.wallets.length === 0 ? (
            <div className="no-wallets-notice">
              <span className="notice-icon" aria-hidden="true">∅</span>
              <p>No supported EIP-6963 wallet was detected in this browser.</p>
              <small>Ensure MetaMask, OKX, or Rabby extension is active and reload.</small>
            </div>
          ) : (
            wallet.wallets.map((item) => (
              <button
                key={item.id}
                disabled={wallet.phase === "CONNECTING"}
                onClick={() => void walletStore.connect(item)}
                className="wallet-item-button"
              >
                <span className="wallet-icon-slot" aria-hidden="true">◈</span>
                <span className="wallet-name">{item.name}</span>
                <span className="wallet-status-tag">
                  {wallet.phase === "CONNECTING" ? "Connecting…" : "Connect"}
                </span>
              </button>
            ))
          )}
        </div>

        {wallet.error && (
          <div className="wallet-error-box" role="alert">
            <span className="error-glyph" aria-hidden="true">⚠</span>
            <span>{wallet.error}</span>
          </div>
        )}
      </section>
    </div>
  );
}

function Editor({
  bundle,
  setBundle,
  isLocked,
}: {
  bundle: Bundle;
  setBundle: (bundle: Bundle) => void;
  isLocked?: boolean;
}) {
  const setClause = (index: number, key: "id" | "text", value: string) =>
    setBundle({
      ...bundle,
      clauses: bundle.clauses.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    });

  const setScenario = (index: number, key: "id" | "text", value: string) =>
    setBundle({
      ...bundle,
      scenarios: bundle.scenarios.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    });

  return (
    <div className="editor-workbench">
      {/* Clauses Section */}
      <div className="editor-section">
        <div className="editor-section-header">
          <div>
            <h2 className="editor-heading">Clauses</h2>
            <p className="editor-sub">
              Draft 1–12 clauses. Each requires a unique identifier (max 16 bytes) and substantive text (max 384 bytes).
            </p>
          </div>
          <span className="count-pill">{bundle.clauses.length} / 12 clauses</span>
        </div>

        <div className="fieldsets-stack">
          {bundle.clauses.map((clause, index) => (
            <fieldset key={index} className="clause-fieldset">
              <legend className="clause-legend">
                <span className="legend-badge">#{index + 1}</span>
                <span className="legend-label">Clause {index + 1}</span>
              </legend>
              <div className="input-row">
                <div className="input-group input-group-id">
                  <label htmlFor={`clause-id-${index}`} className="field-label">
                    ID
                  </label>
                  <input
                    id={`clause-id-${index}`}
                    aria-label={`Clause ${index + 1} ID`}
                    value={clause.id}
                    disabled={isLocked}
                    onChange={(e) => setClause(index, "id", e.target.value)}
                    placeholder="e.g. clause_1"
                    className="form-input mono"
                    maxLength={16}
                  />
                </div>
                <div className="input-group input-group-text">
                  <label htmlFor={`clause-text-${index}`} className="field-label">
                    Clause text
                  </label>
                  <textarea
                    id={`clause-text-${index}`}
                    aria-label={`Clause ${index + 1} text`}
                    value={clause.text}
                    disabled={isLocked}
                    onChange={(e) => setClause(index, "text", e.target.value)}
                    placeholder="Declare obligations, prohibitions, or permissions..."
                    className="form-textarea"
                    rows={2}
                    maxLength={384}
                  />
                  <span className="char-count">{clause.text.length}/384</span>
                </div>
              </div>
            </fieldset>
          ))}
        </div>

        <div className="editor-sub-actions">
          <button
            type="button"
            disabled={isLocked || bundle.clauses.length >= 12}
            onClick={() =>
              setBundle({
                ...bundle,
                clauses: [
                  ...bundle.clauses,
                  { id: `clause_${bundle.clauses.length + 1}`, text: "" },
                ],
              })
            }
            className="btn btn-secondary"
          >
            + Add clause
          </button>
        </div>
      </div>

      {/* Hypothetical Scenarios Section */}
      <div className="editor-section">
        <div className="editor-section-header">
          <div>
            <h2 className="editor-heading">Hypothetical scenarios</h2>
            <p className="editor-sub">
              Draft 1–4 factual scenarios. Pairwise comparisons evaluate whether both clauses apply and conflict under these specific facts.
            </p>
          </div>
          <span className="count-pill">{bundle.scenarios.length} / 4 scenarios</span>
        </div>

        <div className="fieldsets-stack">
          {bundle.scenarios.map((scenario, index) => (
            <fieldset key={index} className="scenario-fieldset">
              <legend className="scenario-legend">
                <span className="legend-badge">#{index + 1}</span>
                <span className="legend-label">Scenario {index + 1}</span>
              </legend>
              <div className="input-row">
                <div className="input-group input-group-id">
                  <label htmlFor={`scenario-id-${index}`} className="field-label">
                    ID
                  </label>
                  <input
                    id={`scenario-id-${index}`}
                    aria-label={`Scenario ${index + 1} ID`}
                    value={scenario.id}
                    disabled={isLocked}
                    onChange={(e) => setScenario(index, "id", e.target.value)}
                    placeholder="e.g. scenario_1"
                    className="form-input mono"
                    maxLength={16}
                  />
                </div>
                <div className="input-group input-group-text">
                  <label htmlFor={`scenario-text-${index}`} className="field-label">
                    Scenario conditions
                  </label>
                  <textarea
                    id={`scenario-text-${index}`}
                    aria-label={`Scenario ${index + 1} text`}
                    value={scenario.text}
                    disabled={isLocked}
                    onChange={(e) => setScenario(index, "text", e.target.value)}
                    placeholder="Describe hypothetical factual conditions..."
                    className="form-textarea"
                    rows={2}
                    maxLength={256}
                  />
                  <span className="char-count">{scenario.text.length}/256</span>
                </div>
              </div>
            </fieldset>
          ))}
        </div>

        <div className="editor-sub-actions">
          <button
            type="button"
            disabled={isLocked || bundle.scenarios.length >= 4}
            onClick={() =>
              setBundle({
                ...bundle,
                scenarios: [
                  ...bundle.scenarios,
                  { id: `scenario_${bundle.scenarios.length + 1}`, text: "" },
                ],
              })
            }
            className="btn btn-secondary"
          >
            + Add scenario
          </button>
        </div>
      </div>

      {/* Precedence Section */}
      <PrecedenceInspector bundle={bundle} setBundle={setBundle} disabled={isLocked} />
    </div>
  );
}

export default function App() {
  const wallet = useWallet();
  const [bundle, setBundle] = useState<Bundle>(EMPTY_BUNDLE);
  const [caseId, setCaseId] = useState("1");
  const [record, setRecord] = useState<CaseRecord>();
  const [phase, setPhase] = useState<Progress>("IDLE");
  const [hash, setHash] = useState<string>();
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(0);
  const [viewEvidence, setViewEvidence] = useState("");
  const lifecycle = useRef(new AbortController());

  useEffect(() => () => lifecycle.current.abort(new Error("Transaction view closed.")), []);

  const preview = useMemo(() => cells(bundle), [bundle]);

  async function write(method: string, args: unknown[], intent: string, expectedRevision: string) {
    if (wallet.phase !== "CONNECTED" || !wallet.selected || !wallet.account) {
      setPhase("FAILED");
      return setMessage("Connect a detected wallet before writing.");
    }
    if (!CONTRACT) {
      setPhase("FAILED");
      return setMessage("Contract address will be configured after deployment.");
    }
    let journal;
    let submittedHash = "";
    try {
      const preHash = record ? await digest(record) : "0".repeat(64);
      const expectedArgsHash = await digest(contractArgs(method, args));
      journal = await reserve({
        chain: String(61999),
        contract: CONTRACT,
        account: wallet.account,
        method,
        intent,
        args_json: journalJson(args),
        pre_revision: expectedRevision,
        pre_hash: preHash,
      });
      setPhase("WAITING_FOR_WALLET");
      setMessage("Confirm this exact action in your wallet.");
      const tx = await submit(writer(wallet.selected.provider, wallet.account), method, args);
      submittedHash = tx;
      setHash(tx);
      await update(journal.reservation, { status: "SUBMITTED", tx_hash: tx });
      setPhase("SUBMITTED");
      setPhase("WAITING_FOR_FINALITY");
      setMessage("Validators are processing the submitted transaction.");
      await finalized(tx, lifecycle.current.signal);
      setPhase("VERIFYING_EXECUTION");
      setPhase("VERIFYING_READBACK");
      let id = caseId;
      let revision = String(Number(expectedRevision) + 1);
      if (method === "create_bundle") {
        const nonce = String(args[0]);
        id = await getIdByNonce(wallet.account, nonce);
        revision = "1";
        if (id === "0") throw new Error("Finalized create was not found by its nonce.");
        setCaseId(id);
      }
      const next = await getVersion(id, revision);
      if (
        next.last_operation?.method !== method ||
        next.last_operation.caller !== wallet.account ||
        next.last_operation.args_hash !== expectedArgsHash
      ) {
        throw new Error("Authoritative readback does not match the submitted operation.");
      }
      setRecord(next);
      await update(journal.reservation, { status: "VERIFIED", tx_hash: tx });
      setPhase("SUCCESS");
      setMessage("Execution and authoritative contract readback agree.");
    } catch (cause) {
      const rejected =
        typeof cause === "object" &&
        cause !== null &&
        "code" in cause &&
        Number((cause as { code: unknown }).code) === 4001;
      if (rejected && journal) {
        await removeUnsigned(journal.reservation);
        setPhase("REJECTED");
      } else if (cause instanceof FinalizedExecutionError && journal) {
        try {
          const failedRevision = method === "create_bundle" ? "1" : String(BigInt(expectedRevision) + 1n);
          let accepted: CaseRecord | undefined;
          if (method === "create_bundle") {
            const createdId = await getIdByNonce(wallet.account, String(args[0]));
            if (createdId !== "0") accepted = await getVersion(createdId, failedRevision);
          } else {
            accepted = await getOptionalVersion(caseId, failedRevision);
            if (!accepted) {
              const prior = await getVersion(caseId, expectedRevision);
              if (await digest(prior) !== journal.pre_hash) throw new Error("Failed-write prestate readback mismatch.");
            }
          }
          await update(journal.reservation, { status: "FINALIZED_ERROR", tx_hash: submittedHash });
          setPhase("FAILED");
          setMessage(accepted
            ? `Finalized execution failed. Revision ${failedRevision} belongs to ${accepted.last_operation?.method ?? "another accepted operation"}; this transaction will not be retried.`
            : "Finalized execution failed and no accepted next revision was found; this transaction will not be retried.");
          return;
        } catch {
          await update(journal.reservation, { status: "RECONCILE", tx_hash: submittedHash });
          setPhase("RECONCILIATION_REQUIRED");
        }
      } else if (journal) {
        await update(journal.reservation, { status: "RECONCILE", tx_hash: submittedHash });
        setPhase("RECONCILIATION_REQUIRED");
      } else {
        setPhase("FAILED");
      }
      setMessage(cause instanceof Error ? cause.message : "The operation could not be verified.");
    }
  }

  const chooserOpen = ['CHOOSER_OPEN', 'CONNECTING', 'ERROR'].includes(wallet.phase);
  const isLocked = record ? record.phase !== "BASE_DRAFT" : false;
  const isConnected = wallet.phase === "CONNECTED";
  async function showView(label: string, work: () => Promise<unknown>) {
    try { setViewEvidence(`${label}: ${JSON.stringify(await work())}`); }
    catch (error) { setViewEvidence(`${label}: ${error instanceof Error ? error.message : "Read failed"}`); }
  }

  return (
    <main>
      <div id="app-shell" inert={chooserOpen ? true : undefined} aria-hidden={chooserOpen || undefined}>
        {/* Top Header & Navigation Bar */}
        <header className="app-header">
          <div className="header-brand">
            <BrandMark size={32} />
          </div>

          <div className="header-meta-actions">
            {/* Finding 3: Neutral Target state unless actually CONNECTED */}
            <div
              className={`network-indicator ${isConnected ? "network-connected" : "network-target"}`}
              title={
                isConnected
                  ? "Connected to GenLayer Studionet (Chain 61999)"
                  : "Target network: GenLayer Studionet (Chain 61999)"
              }
            >
              <span
                className={`network-dot ${isConnected ? "network-dot-connected" : "network-dot-target"}`}
                aria-hidden="true"
              />
              <span className="network-label">
                {isConnected ? "Connected · Studionet 61999" : "Target · Studionet 61999"}
              </span>
            </div>

            {isConnected ? (
              <div className="wallet-connected-pill">
                <span className="wallet-account-chip">
                  <span className="provider-name">{wallet.selected?.name}</span>
                  <span className="account-address">
                    {wallet.account?.slice(0, 6)}…{wallet.account?.slice(-4)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => walletStore.disconnect()}
                  className="btn btn-secondary btn-disconnect"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => walletStore.open()}
                className="btn btn-primary btn-connect"
              >
                Connect wallet
              </button>
            )}
          </div>
        </header>

        {/* Hero Section: Workbench Heading & Scope Statement */}
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">AUDIT DECLARED SCENARIOS</p>
          <h1 id="hero-title">
            See where policy clauses collide, and whether precedence resolves the pair.
          </h1>
          <p className="hero-lede">
            Assessment of this exact submitted material only; not verification of external facts.
          </p>
        </section>

        {/* Prominent Permanent Public Data Notice */}
        <div className="warning-banner" role="alert">
          <span className="warning-badge" aria-hidden="true">NOTICE</span>
          <p className="warning">
            All submitted text will be public and permanent. Do not include private information, credentials or personal records.
          </p>
        </div>

        {/* Workbench Primary Navigation */}
        <nav className="workbench-nav" aria-label="Workbench sections">
          <div className="nav-links-track">
            <a href="#author" className="nav-link">
              <span className="nav-idx">01</span>
              <span>Author</span>
            </a>
            <a href="#map" className="nav-link">
              <span className="nav-idx">02</span>
              <span>Pair map</span>
            </a>
            <a href="#docs" className="nav-link">
              <span className="nav-idx">03</span>
              <span>How it works</span>
            </a>
          </div>
          <div className="nav-badge-slot">
            <span className="workbench-badge">WORKBENCH v1.0</span>
          </div>
        </nav>

        {/* Lifecycle Tracker Banner */}
        <LifecycleTracker record={record} caseId={caseId} />

        {/* Section 01: Author Workbench */}
        <section id="author" className="panel author-panel" aria-labelledby="author-section-title">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <span className="panel-kicker">STEP 01 / SPECIFICATION</span>
              <h2 id="author-section-title" className="panel-title">Policy Bundle Authoring</h2>
            </div>
            {isLocked && (
              <span className="locked-pill" title="Bundle is locked in FROZEN/TERMINAL phase">
                🔒 Locked ({record?.phase})
              </span>
            )}
          </div>

          <Editor bundle={bundle} setBundle={setBundle} isLocked={isLocked} />

          {/* Action Toolbar */}
          <div className="actions-toolbar actions">
            <div className="action-button-group">
              <button
                type="button"
                onClick={() => {
                  const nonce = crypto.randomUUID().replaceAll("-", "").slice(0, 32);
                  void write(
                    "create_bundle",
                    [nonce, bundleJson(bundle), 0n],
                    `create:${wallet.account ?? "disconnected"}:${nonce}`,
                    "0",
                  );
                }}
                className="btn btn-primary"
              >
                Create bundle
              </button>

              {record?.phase === "BASE_DRAFT" && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void write(
                        "replace_bundle",
                        [BigInt(record.id), bundleJson(bundle), BigInt(record.revision)],
                        `replace_bundle:${record.id}:${record.revision}`,
                        record.revision,
                      )
                    }
                    className="btn btn-secondary"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void write(
                        "freeze_bundle",
                        [BigInt(record.id), BigInt(record.revision)],
                        `freeze_bundle:${record.id}:${record.revision}`,
                        record.revision,
                      )
                    }
                    className="btn btn-freeze"
                  >
                    Freeze
                  </button>
                </>
              )}

              {record?.phase === "FROZEN" && (
                <button
                  type="button"
                  onClick={() =>
                    void write(
                      "analyze_conflicts",
                      [BigInt(record.id), BigInt(record.revision)],
                      `analyze_conflicts:${record.id}:${record.revision}`,
                      record.revision,
                    )
                  }
                  className="btn btn-accent-signal"
                >
                  Analyze
                </button>
              )}

              {record?.phase === "UNRESOLVED" && (
                <button
                  type="button"
                  onClick={() =>
                    void write(
                      "retry_bundle",
                      [BigInt(record.id), BigInt(record.revision)],
                      `retry_bundle:${record.id}:${record.revision}`,
                      record.revision,
                    )
                  }
                  className="btn btn-retry"
                >
                  Retry
                </button>
              )}
            </div>

            <div className="action-notes">
              {record?.phase === "BASE_DRAFT" && (
                <small className="toolbar-hint">
                  Base draft is editable. Freeze once ready to submit to validator consensus.
                </small>
              )}
              {record?.phase === "FROZEN" && (
                <small className="toolbar-hint">
                  Bundle is frozen. Run analyze to execute independent validator classification.
                </small>
              )}
              {record?.phase === "UNRESOLVED" && (
                <small className="toolbar-hint">
                  Unresolved UNKNOWN classifications detected. Retry is permitted after the 60s cooldown.
                </small>
              )}
            </div>
          </div>
        </section>

        {/* Live Transaction Progress Surface */}
        <TransactionProgress phase={phase} hash={hash} message={message} />

        {/* Section 02: Pair × Scenario Map */}
        <section id="map" className="panel map-panel" aria-labelledby="map-title">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <span className="panel-kicker">STEP 02 / AUDIT EVIDENCE</span>
              <h2 id="map-title" className="panel-title">Pair × scenario map</h2>
            </div>

            {/* Case Lookup Affordance */}
            <div className="lookup case-lookup-bar">
              <label htmlFor="case-id-input" className="sr-only">
                Case ID
              </label>
              <input
                id="case-id-input"
                aria-label="Case ID"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="Case ID"
                className="form-input mono lookup-input"
              />
              <button
                type="button"
                onClick={() =>
                  void getCase(caseId)
                    .then(async (next) => {
                      const operation = next.last_operation;
                      if (operation && wallet.account && CONTRACT) {
                        for (const item of loadJournal().filter((entry) =>
                          entry.status === "RECONCILE" &&
                          entry.chain === String(61999) &&
                          entry.contract.toLowerCase() === CONTRACT.toLowerCase() &&
                          entry.account.toLowerCase() === operation.caller.toLowerCase() &&
                          entry.method === operation.method,
                        )) {
                          try {
                            const args = JSON.parse(item.args_json) as unknown[];
                            if (Array.isArray(args) && await digest(contractArgs(item.method, args)) === operation.args_hash) {
                              await update(item.reservation, { status: "VERIFIED", tx_hash: item.tx_hash });
                              break;
                            }
                          } catch {
                            // Keep an unreadable journal record unresolved.
                          }
                        }
                      }
                      setRecord(next);
                      setBundle(next.base);
                      setPage(0);
                      setPhase("IDLE");
                      setMessage("");
                      setHash(undefined);
                    })
                    .catch((error) => {
                      setPhase("FAILED");
                      setMessage(error.message);
                    })
                }
                className="btn btn-secondary btn-load"
              >
                Load case
              </button>
            </div>
          </div>

          <div className="matrix-meta-strip">
            <p className="matrix-count">
              Preview: <strong>{preview.length} cells</strong>{" "}
              <span className="matrix-order-note">
                (scenario-major · i&lt;j lexicographic clause order)
              </span>
            </p>

            {record && (
              <div className="matrix-status-summary">
                <span className="summary-item">
                  Rev: <strong>{record.revision}</strong>
                </span>
                <span className="summary-divider">·</span>
                <span className="summary-item">
                  Attempts: <strong>{record.accepted_attempts}/3</strong>
                </span>
              </div>
            )}
          </div>

          <div className="evidence-views" aria-label="Bounded contract evidence views">
            <strong>Evidence views</strong>
            <div className="button-row">
              <button type="button" className="btn btn-secondary" onClick={() => void showView("Case count", getCount)}>Count</button>
              <button type="button" className="btn btn-secondary" onClick={() => void showView("Case list", () => listCases())}>Cases</button>
              <button type="button" className="btn btn-secondary" disabled={!wallet.account} onClick={() => wallet.account && void showView("Actor cases", () => listActor(wallet.account!))}>My cases</button>
              <button type="button" className="btn btn-secondary" onClick={() => void showView("Children", () => listChildren(caseId))}>Children</button>
              <button type="button" className="btn btn-secondary" onClick={() => void showView("History", () => getVersion(caseId, record?.revision ?? "1"))}>History</button>
            </div>
            {viewEvidence && <output className="view-evidence" aria-live="polite">{viewEvidence}</output>}
          </div>

          {/* Matrix Grid */}
          <div className="grid matrix-grid">
            {preview.slice(page * 24, page * 24 + 24).map((cell, offset) => {
              const index = page * 24 + offset;
              const label = record?.result.labels?.[index] ?? "PENDING";
              const forward = label === "CLASH" ? resolutionPath(bundle, cell.left.id, cell.right.id) : [];
              const reverse = label === "CLASH" ? resolutionPath(bundle, cell.right.id, cell.left.id) : [];
              const hasResolution = forward.length > 0 || reverse.length > 0;
              const pathText = forward.length
                ? forward.join(" → ")
                : reverse.length
                ? reverse.join(" → ")
                : "No precedence path";

              return (
                <article
                  key={index}
                  className={`matrix-card cell-state-${label.toLowerCase()} ${
                    label === "CLASH" ? (hasResolution ? "clash-resolved" : "clash-unresolved") : ""
                  }`}
                >
                  <div className="card-top-meta">
                    <small className="scenario-tag">{cell.scenario.id}</small>
                    <span className="cell-index-mono">#{index + 1}</span>
                  </div>

                  <strong className="pair-label">
                    {cell.left.id} <span className="pair-separator">×</span> {cell.right.id}
                  </strong>

                  <div className="label-status-row">
                    <span className={`label-badge label-${label.toLowerCase()}`}>
                      {label}
                    </span>
                  </div>

                  {label === "CLASH" && (
                    <div className="precedence-resolution-box">
                      <span className="resolution-label">
                        {hasResolution ? "RESOLVED VIA" : "PRECEDENCE PATH"}
                      </span>
                      <small className="resolution-path-text">{pathText}</small>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {preview.length > 24 && (
            <div className="pager matrix-pager">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
                className="btn btn-secondary btn-page"
              >
                Previous
              </button>
              <span className="pager-indicator">
                Page {page + 1} of {Math.ceil(preview.length / 24)}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 24 >= preview.length}
                onClick={() => setPage((value) => value + 1)}
                className="btn btn-secondary btn-page"
              >
                Next
              </button>
            </div>
          )}

          {/* Outcome Readout */}
          {record && (
            <div className="outcome authoritative-outcome-banner">
              <div className="outcome-icon" aria-hidden="true">
                {record.outcome === "NO_PAIRWISE_CLASH_DETECTED"
                  ? "✓"
                  : record.outcome === "ALL_PAIRWISE_CLASHES_ORDERED"
                  ? "✓"
                  : record.outcome === "UNORDERED_PAIRWISE_CLASHES"
                  ? "⚠"
                  : "◈"}
              </div>
              <div className="outcome-body">
                <span className="outcome-lead">AUTHORITATIVE CONTRACT OUTCOME</span>
                <strong className="outcome-title">{record.outcome || record.phase}</strong>
                <span className="outcome-meta-line">
                  Revision {record.revision} · {record.accepted_attempts} accepted analysis attempt(s)
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Wrong Chain Alert Banner */}
        {wallet.phase === "WRONG_CHAIN" && (
          <section className="progress progress-wrong-network" role="alert">
            <span className="progress-glyph glyph-alert" aria-hidden="true">⚠</span>
            <div className="progress-content">
              <strong>Wrong network</strong>
              <span>{wallet.error}</span>
            </div>
            <button
              type="button"
              onClick={() => void walletStore.recoverChain()}
              className="btn btn-primary"
            >
              Switch to Studionet
            </button>
          </section>
        )}

        {/* Section 03: How It Works & Permanent Scope */}
        <HowItWorksSection />

        {/* Compact Instrument Footer (Ft2 Inline Rule) */}
        <footer className="app-footer">
          <div className="footer-left">
            <span className="footer-brand">Pairwise Clause Conflict Map</span>
            <span className="footer-separator">·</span>
            <span className="footer-desc">GenLayer Studionet Policy Auditor</span>
          </div>
          <div className="footer-right">
            <span className="footer-spec">EIP-6963 · JSON-RPC 2.0 · Chain 61999</span>
          </div>
        </footer>
      </div>

      {/* Accessible Wallet Chooser Modal */}
      <WalletChooser />
    </main>
  );
}
