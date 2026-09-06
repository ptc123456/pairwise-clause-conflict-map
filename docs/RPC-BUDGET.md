# Frontend RPC Budget

## FRONTEND RPC BUDGET MATRIX

FRONTEND_MATRIX_STATUS: COMPLETE

| Screen/workflow | Trigger | Reads | Writes | Poll cadence | Backoff | Hidden tab | Cache/dedupe | Teardown | Max requests | Max transactions | Failure state |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| Landing | page load | none | none | none | none | zero | static | none | 0 | 0 | render offline shell |
| Case list | explicit open/page | `list_cases` | none | none | explicit retry | zero | single-flight by page | abort on navigation | 1 | 0 | retain validated rows |
| Case detail | explicit select | `get_case` | none | none | explicit retry | zero | single-flight by ID | abort on change | 1 | 0 | retain last validated case |
| History | explicit revision click | `get_version` | none | none | explicit retry | zero | single-flight by ID/revision | abort on change | 1 | 0 | show retryable error |
| Connect | wallet selection | chain read | none | none | none | zero | session value | remove session listeners | 1 | 0 | remain disconnected |
| Case write | explicit confirmation | receipt and exact version/readback | one selected method | 2/4/8 seconds | bounded only | zero | one pending reservation | stop timers/abort reads | 6 | 1 | preserve RECONCILE journal |
| Resume | explicit reconcile | receipt plus exact view | none | none | explicit retry | zero | by immutable tx hash | abort on exit | 2 | 0 | remain blocked without replay |

Global constraints: one shared FIFO executor; no landing RPC; no interval portfolio polling; no hidden-tab polling; at most two explicit reconciliations concurrently; no automatic resubmit; every write stops after one submission, three receipt queries and two readbacks.

## STUDIO RPC BUDGET MATRIX

STUDIO_MATRIX_STATUS: COMPLETE

| Workflow | Trigger | Observable action | Transactions | Poll maximum | Terminal reads | Authoritative readbacks | Retry/resubmit | Terminal condition |
|---|---|---|---:|---:|---:|---:|---|---|
| Capability/schema probe | once before PRE_DEPLOY | open exact source in Studio, require Monaco lint with no errors, and bind local exact-runtime schema inventory; Studio method forms are verified after deployment | 0 | 0 | 0 | 1 source/lint check before review; 1 method inventory after deployment | one bounded retry after rate-limit cooldown | 0 Studio lint errors before review; 14 deployed methods visible later or stop |
| Deployment | after PRE_DEPLOY approval | deploy exact reviewed source once | 1 | 3 at 2/4/8 s | 1 | 1 contract/schema readback | no automatic redeploy | finalized semantic success plus address/schema parity |
| Create base case | explicit approved E2E step | `create_bundle` with one locked nonce | 1 | 3 at 2/4/8 s | 1 | 2: nonce ID then exact version 1 | no resubmit | success; nonce resolves exact record |
| Replace draft | after verified create | `replace_bundle` at expected revision | 1 | 3 at 2/4/8 s | 1 | 1 exact next version | no resubmit | success; base and operation hash match |
| Freeze draft | after verified replace | `freeze_bundle` at expected revision | 1 | 3 at 2/4/8 s | 1 | 1 exact next version | no resubmit | success; `FROZEN`, locks true |
| Analyze ordered clash | after verified freeze | `analyze_conflicts` with locked mock/validator outcome | 1 | 3 at 2/4/8 s | 1 | 1 exact next version | no resubmit | success; raw clash plus directed path and ordered outcome |
| Analyze unknown | separate minimal case after verified freeze | `analyze_conflicts` yielding `UNKNOWN` | 1 | 3 at 2/4/8 s | 1 | 1 exact next version | no resubmit | success; `UNRESOLVED`, attempt 1 |
| Retry unresolved | only after cooldown and verified unresolved readback | `retry_bundle` once | 1 | 3 at 2/4/8 s | 1 | 1 exact next version | no blind retry | success; attempt 2 and expected terminal/readback |
| Negative no-write checks | exact prestate then one invalid call per unique live-only boundary | stale revision, unauthorized actor when available, bad phase | at most 3 | at most 3 each | 1 each | 1 unchanged authoritative record each | never retry automatically | expected failure and byte-equivalent relevant state |

Studio aggregate ceiling for the planned matrix: one deployment, at most 10 method transactions including expected rejected submissions, at most 30 status polls, 10 terminal receipt reads and 13 authoritative schema/state readbacks. Deterministic size, malformed JSON, DAG-cycle, capacity, replay and validator-disagreement combinations remain covered locally and are not replayed live unless a current Studio-only discrepancy is observed. Every Studio action is appended to one ledger before the next action. A returned hash is immutable evidence; timeout or ambiguity routes to reconciliation of that hash, never resubmission.

## STUDIO RPC MEASUREMENT CAPABILITY PROBE

STUDIO_CAPABILITY_PROBE_STATUS: COMPLETE
STUDIO_MEASUREMENT_MODE: OBSERVABLE_ACTION_LEDGER
STUDIO_MEASUREMENT_TIMING: PRE_E2E
STUDIO_CAPABILITY_PROBE_AT: 2026-09-07T03:40:00+07:00
STUDIO_FIRST_ACTION_AT: NOT_STARTED
STUDIO_E2E_STARTED_AT: NOT_STARTED
STUDIO_CAPABILITY_TOOL_OR_API: Codex in-app Browser accessibility/DOM state, browser console log reader, and page Performance API
STUDIO_CAPABILITY_CHECK: Inspected the available Browser APIs before opening Studio. They expose primary-AI navigation/click/form actions, resulting DOM/accessibility state, console entries and page performance resource entries, but do not expose a complete physical request-event stream with stable one-event-per-wire-request identity across Studio workers and wallet/provider internals.
STUDIO_CAPABILITY_RESULT: Physical network requests cannot be counted reliably with the available surface. Every primary-AI Studio action, transaction submission/hash, bounded poll attempt, terminal receipt read and authoritative readback remains directly observable and will be recorded.
STUDIO_PHYSICAL_COUNT_CLAIM: NONE
STUDIO_ACTION_LEDGER_STATUS: READY
STUDIO_ACTIONS: NOT_STARTED
STUDIO_TRANSACTIONS: NOT_STARTED
STUDIO_TRANSACTION_HASHES: []
STUDIO_STATUS_POLL_ATTEMPTS: NOT_STARTED
STUDIO_TERMINAL_RECEIPT_READS: NOT_STARTED
STUDIO_AUTHORITATIVE_READBACKS: NOT_STARTED
STUDIO_DUPLICATE_TRANSACTIONS: 0
STUDIO_MATRIX_VARIANCE: NONE_BEFORE_E2E
