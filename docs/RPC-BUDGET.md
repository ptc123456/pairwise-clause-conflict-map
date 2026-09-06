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
