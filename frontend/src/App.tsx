import { useEffect, useMemo, useRef, useState } from "react";
import { bundleJson, CONTRACT, finalized, getCase, getIdByNonce, getVersion, submit, writer } from "./contract";
import { cells, EMPTY_BUNDLE, resolutionPath, type Bundle, type CaseRecord } from "./domain";
import { journalJson, removeUnsigned, reserve, update } from "./pending";
import { useWallet, walletStore } from "./wallet";

type Progress = "IDLE" | "WAITING_FOR_WALLET" | "SUBMITTED" | "WAITING_FOR_FINALITY" | "VERIFYING_EXECUTION" | "VERIFYING_READBACK" | "SUCCESS" | "REJECTED" | "FAILED" | "RECONCILIATION_REQUIRED";

function TransactionProgress({ phase, hash, message }: { phase: Progress; hash?: string; message?: string }) {
  if (phase === "IDLE") return null;
  const pending = ["WAITING_FOR_WALLET", "SUBMITTED", "WAITING_FOR_FINALITY", "VERIFYING_EXECUTION", "VERIFYING_READBACK"].includes(phase);
  const alert = ["REJECTED", "FAILED", "RECONCILIATION_REQUIRED"].includes(phase);
  return <section className="progress" data-transaction-phase={phase} role={alert ? "alert" : "status"} aria-live={alert ? "assertive" : "polite"}>
    {pending && <span className="spinner" aria-hidden="true" />}
    <strong>{phase.replaceAll("_", " ")}</strong><span>{message}</span>
    {hash && <code>{hash}</code>}
  </section>;
}

function WalletChooser() {
  const wallet = useWallet();
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!['CHOOSER_OPEN', 'CONNECTING', 'ERROR'].includes(wallet.phase)) return;
    const prior = document.activeElement as HTMLElement | null; dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && wallet.phase !== "CONNECTING") walletStore.close();
      if (event.key !== "Tab" || !dialog.current) return;
      const items = [...dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled)")]; if (!items.length) return;
      const first = items[0], last = items.at(-1)!; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown); return () => { document.removeEventListener("keydown", keydown); prior?.focus(); };
  }, [wallet.phase]);
  if (!['CHOOSER_OPEN', 'CONNECTING', 'ERROR'].includes(wallet.phase)) return null;
  return <div className="backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && walletStore.close()}>
    <section ref={dialog} className="dialog" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
      <button className="close" onClick={() => walletStore.close()} aria-label="Close wallet chooser">×</button>
      <h2 id="wallet-title">Choose a detected wallet</h2>
      {wallet.wallets.length === 0 ? <p>No supported wallet was detected.</p> : wallet.wallets.map((item) =>
        <button key={item.id} disabled={wallet.phase === "CONNECTING"} onClick={() => void walletStore.connect(item)}>{item.name}</button>)}
      {wallet.error && <p role="alert">{wallet.error}</p>}
    </section>
  </div>;
}

function Editor({ bundle, setBundle }: { bundle: Bundle; setBundle: (bundle: Bundle) => void }) {
  const setClause = (index: number, key: "id" | "text", value: string) => setBundle({ ...bundle, clauses: bundle.clauses.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  const setScenario = (index: number, key: "id" | "text", value: string) => setBundle({ ...bundle, scenarios: bundle.scenarios.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  return <>
    <h2>Clauses</h2>{bundle.clauses.map((clause, index) => <fieldset key={index}><legend>Clause {index + 1}</legend><input aria-label={`Clause ${index + 1} ID`} value={clause.id} onChange={(e) => setClause(index, "id", e.target.value)} /><textarea aria-label={`Clause ${index + 1} text`} value={clause.text} onChange={(e) => setClause(index, "text", e.target.value)} /></fieldset>)}
    <button disabled={bundle.clauses.length >= 12} onClick={() => setBundle({ ...bundle, clauses: [...bundle.clauses, { id: `clause_${bundle.clauses.length + 1}`, text: "" }] })}>Add clause</button>
    <h2>Hypothetical scenarios</h2>{bundle.scenarios.map((scenario, index) => <fieldset key={index}><legend>Scenario {index + 1}</legend><input aria-label={`Scenario ${index + 1} ID`} value={scenario.id} onChange={(e) => setScenario(index, "id", e.target.value)} /><textarea aria-label={`Scenario ${index + 1} text`} value={scenario.text} onChange={(e) => setScenario(index, "text", e.target.value)} /></fieldset>)}
    <button disabled={bundle.scenarios.length >= 4} onClick={() => setBundle({ ...bundle, scenarios: [...bundle.scenarios, { id: `scenario_${bundle.scenarios.length + 1}`, text: "" }] })}>Add scenario</button>
    <h2>Precedence</h2><div className="edge"><select aria-label="Higher clause" id="higher">{bundle.clauses.map((item) => <option key={item.id}>{item.id}</option>)}</select><span>over</span><select aria-label="Lower clause" id="lower">{bundle.clauses.map((item) => <option key={item.id}>{item.id}</option>)}</select><button onClick={() => { const higher = (document.getElementById("higher") as HTMLSelectElement).value; const lower = (document.getElementById("lower") as HTMLSelectElement).value; if (higher !== lower && !bundle.precedence.some((edge) => edge.higher === higher && edge.lower === lower)) setBundle({ ...bundle, precedence: [...bundle.precedence, { higher, lower }] }); }}>Add edge</button></div>
    <ul>{bundle.precedence.map((edge, i) => <li key={`${edge.higher}-${edge.lower}`}>{edge.higher} → {edge.lower} <button onClick={() => setBundle({ ...bundle, precedence: bundle.precedence.filter((_, j) => i !== j) })}>Remove</button></li>)}</ul>
  </>;
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
  const preview = useMemo(() => cells(bundle), [bundle]);

  async function write(method: string, args: unknown[], intent: string, expectedRevision: string) {
    if (wallet.phase !== "CONNECTED" || !wallet.selected || !wallet.account) { setPhase("FAILED"); return setMessage("Connect a detected wallet before writing."); }
    if (!CONTRACT) { setPhase("FAILED"); return setMessage("Contract address will be configured after deployment."); }
    const journal = await reserve({ chain: String(61999), contract: CONTRACT, account: wallet.account, method, intent, args_json: journalJson(args), pre_revision: expectedRevision, pre_hash: "0".repeat(64) });
    setPhase("WAITING_FOR_WALLET"); setMessage("Confirm this exact action in your wallet.");
    let submittedHash = "";
    try {
      const tx = await submit(writer(wallet.selected.provider, wallet.account), method, args);
      submittedHash = tx;
      setHash(tx); await update(journal.reservation, { status: "SUBMITTED", tx_hash: tx });
      setPhase("SUBMITTED"); setPhase("WAITING_FOR_FINALITY"); setMessage("Validators are processing the submitted transaction.");
      await finalized(tx); setPhase("VERIFYING_EXECUTION");
      setPhase("VERIFYING_READBACK");
      let id = caseId; let revision = String(Number(expectedRevision) + 1);
      if (method === "create_bundle") { const nonce = String(args[0]); id = await getIdByNonce(wallet.account, nonce); revision = "1"; if (id === "0") throw new Error("Finalized create was not found by its nonce."); setCaseId(id); }
      const next = await getVersion(id, revision);
      if (next.last_operation?.method !== method || next.last_operation.caller !== wallet.account) throw new Error("Authoritative readback does not match the submitted operation.");
      setRecord(next);
      await update(journal.reservation, { status: "VERIFIED", tx_hash: tx }); setPhase("SUCCESS"); setMessage("Execution and authoritative contract readback agree.");
    } catch (cause) {
      const rejected = typeof cause === "object" && cause !== null && "code" in cause && Number((cause as { code: unknown }).code) === 4001;
      if (rejected) { await removeUnsigned(journal.reservation); setPhase("REJECTED"); }
      else { await update(journal.reservation, { status: "RECONCILE", tx_hash: submittedHash }); setPhase("RECONCILIATION_REQUIRED"); }
      setMessage(cause instanceof Error ? cause.message : "The operation could not be verified.");
    }
  }

  return <main>
    <header><div><strong>Pairwise Clause Conflict Map</strong><small>GenLayer semantic conflict mapping</small></div>{wallet.phase === "CONNECTED" ? <div><span>{wallet.selected?.name} · {wallet.account?.slice(0, 6)}…{wallet.account?.slice(-4)}</span><button onClick={() => walletStore.disconnect()}>Disconnect</button></div> : <button onClick={() => walletStore.open()}>Connect wallet</button>}</header>
    <section className="hero"><p className="eyebrow">AUDIT DECLARED SCENARIOS</p><h1>See where policy clauses collide—and whether precedence resolves the pair.</h1><p>Assessment of this exact submitted material only; not verification of external facts.</p></section>
    <p className="warning">All submitted text will be public and permanent. Do not include private information, credentials or personal records.</p>
    <nav><a href="#author">Author</a><a href="#map">Pair map</a><a href="#docs">How it works</a></nav>
    <section id="author" className="panel"><Editor bundle={bundle} setBundle={setBundle} /><div className="actions"><button onClick={() => { const nonce = crypto.randomUUID().replaceAll("-", "").slice(0, 32); void write("create_bundle", [nonce, bundleJson(bundle), 0n], `create:${wallet.account ?? "disconnected"}:${nonce}`, "0"); }}>Create bundle</button>{record?.phase === "BASE_DRAFT" && <><button onClick={() => void write("replace_bundle", [BigInt(record.id), bundleJson(bundle), BigInt(record.revision)], `replace_bundle:${record.id}:${record.revision}`, record.revision)}>Save changes</button><button onClick={() => void write("freeze_bundle", [BigInt(record.id), BigInt(record.revision)], `freeze_bundle:${record.id}:${record.revision}`, record.revision)}>Freeze</button></>}{record?.phase === "FROZEN" && <button onClick={() => void write("analyze_conflicts", [BigInt(record.id), BigInt(record.revision)], `analyze_conflicts:${record.id}:${record.revision}`, record.revision)}>Analyze</button>}{record?.phase === "UNRESOLVED" && <button onClick={() => void write("retry_bundle", [BigInt(record.id), BigInt(record.revision)], `retry_bundle:${record.id}:${record.revision}`, record.revision)}>Retry</button>}</div></section>
    <TransactionProgress phase={phase} hash={hash} message={message} />
    <section id="map" className="panel"><h2>Pair × scenario map</h2><div className="lookup"><input aria-label="Case ID" value={caseId} onChange={(e) => setCaseId(e.target.value)} /><button onClick={() => void getCase(caseId).then((next) => { setRecord(next); setBundle(next.base); setPage(0); }).catch((error) => { setPhase("FAILED"); setMessage(error.message); })}>Load case</button></div><p>Preview: {preview.length} cells</p><div className="grid">{preview.slice(page * 24, page * 24 + 24).map((cell, offset) => { const index = page * 24 + offset; const label = record?.result.labels?.[index] ?? "PENDING"; const forward = label === "CLASH" ? resolutionPath(bundle, cell.left.id, cell.right.id) : []; const reverse = label === "CLASH" ? resolutionPath(bundle, cell.right.id, cell.left.id) : []; return <article key={index}><small>{cell.scenario.id}</small><strong>{cell.left.id} × {cell.right.id}</strong><span>{label}</span>{label === "CLASH" && <small>{forward.length ? forward.join(" → ") : reverse.length ? reverse.join(" → ") : "No precedence path"}</small>}</article>; })}</div>{preview.length > 24 && <div className="pager"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page + 1} of {Math.ceil(preview.length / 24)}</span><button disabled={(page + 1) * 24 >= preview.length} onClick={() => setPage((value) => value + 1)}>Next</button></div>}{record && <div className="outcome"><strong>{record.outcome || record.phase}</strong><span>Revision {record.revision} · {record.accepted_attempts} accepted analysis attempt(s)</span></div>}</section>
    <section id="docs" className="panel"><h2>How it works</h2><ol><li>Author clauses and hypothetical scenarios.</li><li>Declare a cycle-free higher/lower precedence graph.</li><li>Freeze the exact public bundle.</li><li>GenLayer validators independently classify each pair in each scenario.</li><li>The contract exposes raw clashes and whether one directed precedence path resolves each clash.</li></ol><p><strong>Permanent scope:</strong> Pairwise map only. Whole-bundle and internal single-clause consistency are not assessed. Other scenarios are not assessed.</p></section>
    <WalletChooser />
  </main>;
}
