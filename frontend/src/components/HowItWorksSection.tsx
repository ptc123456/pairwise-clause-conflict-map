export function HowItWorksSection() {
  return (
    <section id="docs" className="panel docs-panel" aria-labelledby="docs-title">
      <div className="section-intro">
        <span className="section-kicker">TECHNICAL SPECIFICATION</span>
        <h2 id="docs-title" className="section-title">How it works</h2>
        <p className="section-lede">
          Pairwise Clause Conflict Map combines nondeterministic validator classification with a deterministic contract-level directed acyclic graph (DAG) precedence reducer.
        </p>
      </div>

      <div className="docs-lifecycle-grid">
        <ol className="docs-steps" aria-label="Workflow steps">
          <li className="docs-step-item">
            <div className="step-num-badge" aria-hidden="true">01</div>
            <div className="step-body">
              <strong>Author clauses and hypothetical scenarios</strong>
              <p>
                Define up to 12 distinct clauses (obligations, prohibitions, permissions) and up to 4 hypothetical test scenarios representing concrete factual states.
              </p>
            </div>
          </li>
          <li className="docs-step-item">
            <div className="step-num-badge" aria-hidden="true">02</div>
            <div className="step-body">
              <strong>Declare a cycle-free higher/lower precedence graph</strong>
              <p>
                Establish directed priority relationships between conflicting clauses. The smart contract strictly enforces cycle detection via topological traversal; cyclic graphs are rejected with <code>PRECEDENCE_CYCLE</code>.
              </p>
            </div>
          </li>
          <li className="docs-step-item">
            <div className="step-num-badge" aria-hidden="true">03</div>
            <div className="step-body">
              <strong>Freeze the exact public bundle</strong>
              <p>
                The author locks the bundle into phase <code>FROZEN</code>. Once frozen, clauses, scenarios, and precedence rules are immutable. The exact canonical JSON payload is hashed on-chain.
              </p>
            </div>
          </li>
          <li className="docs-step-item">
            <div className="step-num-badge" aria-hidden="true">04</div>
            <div className="step-body">
              <strong>GenLayer validators independently classify each pair</strong>
              <p>
                Validators execute the evaluation prompt in scenario-major order, evaluating clause pairs in lexicographic index order <code>i &lt; j</code>. Each validator independently rederives classification; consensus requires exact identity on <code>{`{v: 1, labels: [...]}`}</code> without sharing prompts or prose.
              </p>
            </div>
          </li>
          <li className="docs-step-item">
            <div className="step-num-badge" aria-hidden="true">05</div>
            <div className="step-body">
              <strong>The contract exposes raw clashes and directed precedence paths</strong>
              <p>
                For every pair where validators observe a <code>CLASH</code>, the on-chain reducer queries the precedence graph. If a directed transitive path exists from one clause to the other, the clash is ordered. If neither or both reach each other, it is flagged as unordered.
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div className="docs-deep-dive">
        <div className="deep-dive-card">
          <span className="card-kicker">SEMANTIC LABELS</span>
          <h3 className="card-title">Classification taxonomy</h3>
          <ul className="taxonomy-list">
            <li>
              <strong className="badge-inline badge-ok">OK</strong>
              <span>Both clauses apply and can simultaneously be honored, or an exception eliminates applicability.</span>
            </li>
            <li>
              <strong className="badge-inline badge-clash">CLASH</strong>
              <span>Both clauses apply and cannot simultaneously be honored because obligations, prohibitions, or mutually exclusive choices conflict.</span>
            </li>
            <li>
              <strong className="badge-inline badge-unknown">UNKNOWN</strong>
              <span>Ambiguity of applicability or meaning prevents deterministic classification. Triggers an <code>UNRESOLVED</code> bundle state eligible for retry.</span>
            </li>
          </ul>
        </div>

        <div className="deep-dive-card">
          <span className="card-kicker">DETERMINISTIC REDUCER</span>
          <h3 className="card-title">Precedence resolution logic</h3>
          <p>
            Given a clash between Clause <em>A</em> and Clause <em>B</em>:
          </p>
          <ul className="logic-list">
            <li>
              If a directed path exists <code>A →* B</code> and not <code>B →* A</code>, Clause <em>A</em> strictly overrides Clause <em>B</em>.
            </li>
            <li>
              If a directed path exists <code>B →* A</code> and not <code>A →* B</code>, Clause <em>B</em> strictly overrides Clause <em>A</em>.
            </li>
            <li>
              If neither path exists, the clash is an <strong>unordered pairwise collision</strong> requiring policy amendment.
            </li>
          </ul>
        </div>
      </div>

      <div className="warning-callout" role="note">
        <div className="warning-icon-col" aria-hidden="true">
          <span className="warning-glyph">⚠</span>
        </div>
        <div className="warning-body">
          <strong className="warning-heading">Permanent scope &amp; verification limits</strong>
          <p>
            <strong>Permanent scope:</strong> Pairwise map only. Whole-bundle and internal single-clause consistency are not assessed. Other scenarios are not assessed.
          </p>
          <p className="warning-sub">
            Assessment is restricted strictly to the exact submitted clauses under the exact declared scenarios. GenLayer does not verify external facts, historical records, or real-world truth.
          </p>
        </div>
      </div>
    </section>
  );
}
