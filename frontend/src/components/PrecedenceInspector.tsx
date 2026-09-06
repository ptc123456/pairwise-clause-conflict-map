import type { Bundle } from "../domain";

export function PrecedenceInspector({
  bundle,
  setBundle,
  disabled,
}: {
  bundle: Bundle;
  setBundle: (bundle: Bundle) => void;
  disabled?: boolean;
}) {
  const addEdge = () => {
    const higherEl = document.getElementById("higher") as HTMLSelectElement | null;
    const lowerEl = document.getElementById("lower") as HTMLSelectElement | null;
    if (!higherEl || !lowerEl) return;
    const higher = higherEl.value;
    const lower = lowerEl.value;
    if (
      higher &&
      lower &&
      higher !== lower &&
      !bundle.precedence.some((edge) => edge.higher === higher && edge.lower === lower)
    ) {
      setBundle({ ...bundle, precedence: [...bundle.precedence, { higher, lower }] });
    }
  };

  const removeEdge = (index: number) => {
    setBundle({
      ...bundle,
      precedence: bundle.precedence.filter((_, j) => index !== j),
    });
  };

  return (
    <div className="precedence-module">
      <div className="module-header">
        <div>
          <h3 className="module-title">Precedence DAG</h3>
          <p className="module-caption">
            Declare directed priority edges (higher over lower). Must be cycle-free. Max 24 edges.
          </p>
        </div>
        <span className="count-pill">
          {bundle.precedence.length} / 24 edges
        </span>
      </div>

      <div className="edge-composer edge">
        <div className="select-group">
          <label htmlFor="higher" className="sr-only">
            Higher clause
          </label>
          <select
            id="higher"
            aria-label="Higher clause"
            disabled={disabled || bundle.clauses.length < 2}
            className="form-select"
          >
            {bundle.clauses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
          </select>
        </div>

        <span className="edge-direction-badge" aria-hidden="true">
          overrides →
        </span>

        <div className="select-group">
          <label htmlFor="lower" className="sr-only">
            Lower clause
          </label>
          <select
            id="lower"
            aria-label="Lower clause"
            disabled={disabled || bundle.clauses.length < 2}
            className="form-select"
          >
            {bundle.clauses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={addEdge}
          disabled={disabled || bundle.clauses.length < 2 || bundle.precedence.length >= 24}
          className="btn btn-secondary btn-compact"
        >
          Add edge
        </button>
      </div>

      {bundle.precedence.length === 0 ? (
        <div className="empty-edges-note">
          <span className="empty-icon" aria-hidden="true">∅</span>
          <span>No precedence edges declared yet. If any pair clashes, it will be classified as an unordered clash without a resolution path.</span>
        </div>
      ) : (
        <ul className="edge-list" aria-label="Declared precedence edges">
          {bundle.precedence.map((edge, i) => (
            <li key={`${edge.higher}-${edge.lower}`} className="edge-item">
              <span className="edge-flow">
                <code className="edge-node higher">{edge.higher}</code>
                <span className="edge-arrow" aria-label="overrides">→</span>
                <code className="edge-node lower">{edge.lower}</code>
              </span>
              <button
                type="button"
                onClick={() => removeEdge(i)}
                disabled={disabled}
                className="btn-remove-edge"
                aria-label={`Remove precedence ${edge.higher} over ${edge.lower}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
