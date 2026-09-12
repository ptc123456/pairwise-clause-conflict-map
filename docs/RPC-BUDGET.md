# Frontend RPC Budget

RPC_BUDGET_REVISION: 2026-09-13
OFFICIAL_DOCS_CHECKED: GenLayer JS client and Studionet network documentation
FRONTEND_SCOPE: APPLICABLE
FRONTEND_MATRIX_STATUS: COMPLETE
FRONTEND_EVIDENCE_STATUS: COMPLETE

## FRONTEND RPC BUDGET MATRIX

The frontend uses one shared client path for contract reads and transaction status. Landing content performs no contract read. Case detail and history reads occur only after an explicit user action. Identical in-flight reads are coalesced, and each write retains its transaction hash for finality and authoritative readback.

| Operation | Public trigger | Behavior |
|---|---|---|
| Case detail | Load case | One bounded read for the selected case |
| History or children | Explicit view action | One bounded page read per action |
| State-changing write | Create, save, freeze, analyze, retry | One wallet submission, bounded finality checks, then authoritative readback |
| Reconciliation | Explicit recovery path | Reuses the retained transaction hash and never resubmits it |

## FRONTEND RPC BUDGET EVIDENCE

The implementation and tests cover FIFO execution, in-flight coalescing, per-operation bounds, cancellation, backoff, Strict Mode safety, measured transaction lifecycle states, duplicate prevention, reconciliation, and authoritative readback. No background portfolio polling or automatic resubmission is used.

MULTI_CLIENT_JUSTIFICATION: The read client and wallet-bound write client have separate authority requirements. Reads use the public Studionet client; writes use the explicitly selected wallet provider and account.
