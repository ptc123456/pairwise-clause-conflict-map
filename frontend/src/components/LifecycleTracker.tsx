import type { CaseRecord } from "../domain";

export function LifecycleTracker({
  record,
  caseId: _caseId,
}: {
  record?: CaseRecord;
  caseId: string;
}) {
  const isLoaded = Boolean(record);
  const currentPhase = record?.phase;
  const revision = record?.revision;
  const attempts = record?.accepted_attempts ?? 0;
  const outcome = record?.outcome ?? "";

  const steps = [
    {
      key: "DRAFT",
      label: isLoaded ? "1. Base Draft" : "1. Local Draft",
      desc: isLoaded ? "Editable clauses & DAG" : "Unsaved local material",
      active: !isLoaded || currentPhase === "BASE_DRAFT",
      passed: isLoaded && currentPhase !== "BASE_DRAFT",
    },
    {
      key: "FROZEN",
      label: "2. Frozen",
      desc: isLoaded ? "Exact content locked" : "Awaiting on-chain freeze",
      active: isLoaded && currentPhase === "FROZEN",
      passed: isLoaded && ["UNRESOLVED", "DONE", "EXHAUSTED"].includes(currentPhase ?? ""),
    },
    {
      key: "ANALYSIS",
      label: "3. Evaluated",
      desc: isLoaded && attempts > 0 ? `${attempts}/3 attempt(s)` : "Awaiting validator rerun",
      active: isLoaded && ["UNRESOLVED", "DONE", "EXHAUSTED"].includes(currentPhase ?? ""),
      passed: isLoaded && ["DONE", "EXHAUSTED"].includes(currentPhase ?? ""),
    },
    {
      key: "OUTCOME",
      label: "4. Status",
      desc: outcome ? outcome.replaceAll("_", " ") : isLoaded ? currentPhase : "No contract outcome",
      active: Boolean(outcome),
      passed: currentPhase === "DONE",
    },
  ];

  return (
    <aside className="lifecycle-tracker" aria-label="Bundle lifecycle state">
      <div className="lifecycle-header">
        <div className="lifecycle-meta">
          {isLoaded ? (
            <>
              <span className="meta-chip">
                <span className="meta-label">CASE</span>
                <span className="meta-value">#{record!.id}</span>
              </span>
              <span className="meta-chip">
                <span className="meta-label">REV</span>
                <span className="meta-value">{revision}</span>
              </span>
              <span className="meta-chip">
                <span className="meta-label">PHASE</span>
                <span className={`phase-badge phase-${currentPhase!.toLowerCase()}`}>
                  {currentPhase!.replaceAll("_", " ")}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="meta-chip">
                <span className="meta-label">RECORD</span>
                <span className="meta-value meta-value-unsaved">Unsaved draft / not loaded</span>
              </span>
              <span className="meta-chip">
                <span className="meta-label">REV</span>
                <span className="meta-value meta-value-dim">—</span>
              </span>
              <span className="meta-chip">
                <span className="meta-label">PHASE</span>
                <span className="phase-badge phase-unsaved">LOCAL DRAFT (UNSAVED)</span>
              </span>
            </>
          )}
        </div>
        {outcome && (
          <div className="outcome-banner">
            <span className="outcome-tag">OUTCOME</span>
            <strong className="outcome-text">{outcome.replaceAll("_", " ")}</strong>
          </div>
        )}
      </div>

      <ol className="lifecycle-steps" aria-label="Lifecycle progress">
        {steps.map((step) => {
          const statusClass = step.active
            ? "is-active"
            : step.passed
            ? "is-passed"
            : "is-future";
          return (
            <li key={step.key} className={`lifecycle-step ${statusClass}`}>
              <div className="step-bullet" aria-hidden="true">
                {step.passed && !step.active ? "✓" : ""}
              </div>
              <div className="step-content">
                <span className="step-label">{step.label}</span>
                <span className="step-desc">{step.desc}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
