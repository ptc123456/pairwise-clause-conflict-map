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
STUDIO_PRE_E2E_ACTION_LEDGER_STATUS: READY
STUDIO_PRE_E2E_ACTIONS: NOT_STARTED_AT_PROBE
STUDIO_PRE_E2E_TRANSACTIONS: NOT_STARTED_AT_PROBE
STUDIO_PRE_E2E_TRANSACTION_HASHES: []
STUDIO_PRE_E2E_STATUS_POLL_ATTEMPTS: NOT_STARTED_AT_PROBE
STUDIO_PRE_E2E_TERMINAL_RECEIPT_READS: NOT_STARTED_AT_PROBE
STUDIO_PRE_E2E_AUTHORITATIVE_READBACKS: NOT_STARTED_AT_PROBE
STUDIO_PRE_E2E_DUPLICATE_TRANSACTIONS: 0
STUDIO_PRE_E2E_MATRIX_VARIANCE: NONE_BEFORE_E2E

## OBSERVED STUDIO E2E LEDGER (POST_DEPLOY)

STUDIO_ACTION_LEDGER_STATUS: COMPLETE
STUDIO_MEASUREMENT_MODE: OBSERVABLE_ACTION_LEDGER
STUDIO_PHYSICAL_COUNT_CLAIM: NONE
STUDIO_DUPLICATE_TRANSACTIONS: 0
STUDIO_DEPLOYMENT_ACTIONS_OBSERVED: 1
STUDIO_METHOD_SUBMISSIONS_OBSERVED: 9
STUDIO_TRANSACTION_HASHES: [`0x8c8b776c326e1d9e2e99a728cba59a75fffb3af0f6ab5f23c96d9bf6ad52a80d`, `0x3781d8f12c9f7fe35f01ec9850470756e77b8bc494554c205003ddf19228f97d`, `0x4ef75c947748914a5d460c87dffe1ba122feb321def429bedd1687623b91441e`, `0xb048ad585122e023e188d279a1b4ca22bf5f36527efd32d531e27fef253ce016`, `0x8a0547e853d39a509f0215c13d4e8064d43659201cca6fbe81f53e3049f9fdc5`, `0xe88ae2afc2e96911f1f07f45de63b04f2c3164d274d74c9a71ac9b464f3628f1`, `0x22c3c22f456808382a831e6844c09bb495f454700cadb81621be16cad5d4b625`, `0xc4ccc6ab027d5b91b769c8dc833f42751daf06c2d45d3b815b95878fa481bac2`, `0x609c97f1fff07f32490aa9c6990bf0c558c0816bc954c927f9a3d60403a62cc9`]
STUDIO_METHOD_SUBMISSIONS: two `create_bundle`, one successful `replace_bundle`, two successful `freeze_bundle`, two successful `analyze_conflicts`, one successful cooldown-gated `retry_bundle`, and one expected stale-revision `freeze_bundle` rejection
STUDIO_TERMINAL_RECEIPT_DETAIL_READS_OBSERVED: 9 method receipts
STUDIO_STATUS_POLL_ATTEMPTS: NOT_SEPARATELY_OBSERVABLE; five bounded DOM status observations for replacement, three for freeze, four for case 2 analysis, and six for retry were recorded in the E2E ledger
STUDIO_AUTHORITATIVE_READBACKS_OBSERVED: 10 successful reads: method inventory, `get_upgrader()`, `get_case(1)` after analyze and stale rejection, initial `get_count()`, `get_version(2,1)`, `get_version(2,2)`, `get_version(2,3)`, `get_case(2)` after analysis, and `get_case(2)` after retry; two `get_id_by_nonce` calls failed validation and returned no value
STUDIO_MATRIX_VARIANCE: Replacement remained `REVEALING` across four of five bounded UI observations, then finalized on the fifth at about 35.8s; row nominal maximum was three observations. Freeze finalized within three observations. Case 2 analysis finalized after four observations and retry after six, above their nominal three-observation rows. Browser telemetry does not expose corresponding physical poll counts. No resubmission or duplicate transaction.

Nine of at most ten method submissions have been used; the stale-revision call returned `ERROR` with validator `[rollback] STALE_REVISION` and was not appealed or resubmitted. Case 2 replacement, freeze, analysis, and the single cooldown-gated retry finalized successfully; `get_version(2,2)`, `get_version(2,3)`, and the two `get_case(2)` readbacks verify the exact stored draft, locks, attempt-1 prestate, and attempt-2 final state. The final attempt-2 state is intentionally `UNRESOLVED` because both live nondeterministic classifications contained `UNKNOWN`; local tests cover third-unknown exhaustion, while the approved live matrix stops after one retry. The finalized post-rejection `get_case(1)` remained `DONE`, `revision=3`, `base_locked=true`, and `CLASH`. Physical network request totals are intentionally not inferred from console/resource observations. Studio E2E is complete with one method-transaction slot unused.
