# Implementation Plan

1. Implement `contracts/main.py` as one contract with standard-library JSON validation, immutable pre-mutation guards, canonical hashing, bounded history/indexes, DAG validation, deterministic reducer and one independently rederived nondeterministic classification path.
2. Add pure/unit and Direct Mode tests for schemas, capacities, authority, revision reservation, replay, no-write failures, every outcome, 264-cell maximum, validator disagreement, pickling and transaction time.
3. Build the functional React/Vite frontend using one shared contract client, one EIP-6963 wallet-session store and one Web Locks journal. No speculative framework or backend.
4. Add focused frontend tests for RPC bounds, provider-object isolation, journal interruption/capacity/conflicts, transaction terminal classification/readback and the complete author/analyze/retry journey.
5. Run exact lint/schema/validate, Python tests and frontend tests/build. Produce the functional frontend before the mandatory manual Claude presentation redesign.
6. Assemble exact-revision `PRE_DEPLOY`; obtain anonymous approval before Studio deployment. Later gates remain `POST_DEPLOY_TEST`, `POST_GITHUB_VERCEL_FINAL`, and `EXPLORER_PRE_SUBMISSION`.

## Experience mapping

- Independently rederive consequential judgment: validator reruns classification; semantic-forgery/disagreement tests.
- Runtime-shaped test doubles: current Direct Mode plus explicit address/calldata and pickling tests; no invented runtime fields.
- JSON/receipt boundaries: lossless decimal strings and exact parsers; captured-receipt fixtures plus authoritative readback.
- Shared RPC capacity: one FIFO/single-flight client and the matrix in `docs/RPC-BUDGET.md`.
- EIP-6963 routing: retain the exact announced provider object and assert zero calls to unselected providers.
- Consequential consensus fields: only `{v,labels}` is compared/stored; no prose.
- Protocol-schema parity: key-for-key checklist across contract, frontend, tests and evidence.
- Runner pin/header: pin the verified bundle and rerun schema/validate on exact source; perform read-only Studio schema probe before PRE_DEPLOY.

## Mechanical corrections log

- Locked current verified source header/import spelling and UTF-8 CLI environment. No behavior or public interface changed.
- The pre-lock probe avoided dereferencing a Direct Mode bytes fixture as `Address`; production address normalization remains explicitly tested.
- Added the governance-required Root Slot recovery surface before `PRE_DEPLOY`: deployment sender registration, `get_upgrader()` readback, and authorization-checked `upgrade(bytes)`. This technical interface addition does not alter the approved conflict-map actors, workflow, outcomes, or frontend journey; Direct Mode covers registration, authorized replacement, unauthorized rollback, and code-byte preservation.
