# Pairwise Clause Conflict Map — PRE_DEPLOY review package

Checkpoint: `PRE_DEPLOY` only. This package does not authorize deployment, publication or release. The exact Git revision is supplied by the review transport after this file is committed.

## Product and revision boundary

- Product baseline: `RESEARCH-HANDOFF.md`, `STAGE-1.md`, `STAGE-2.md`, `SPECIFICATION.md`, `IMPLEMENTATION-PLAN.md`.
- Candidate contract: `contracts/main.py`.
- Contract SHA-256: `F04CD0DF757BE71A7EA129C73113E78238C6364FBAEEC90F4275156CC90D7103`.
- Schema SHA-256: `2CAB2C53E8CCA884ED518E6D6A704702917C660FDC6968C4160D42B63378E4D9`.
- Intended Studio deployer and initial Root upgrader: `0x15872d1887b8ff7322F2aa7c3c535f1F00dbb452` (selected from the currently available Studio accounts; visible balance 1,000,000 GEN).
- No deployment, signature, transaction, contract address, GitHub target or Vercel target exists at this checkpoint.

## Toolchain and commands

Verified on 2026-09-07: Python 3.13.6; `genvm-lint 0.11.0`; `genlayer-test 0.29.2`; GenVM bundle `v0.3.0-rc7`; runner dependency `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.

```powershell
$env:PYTHONUTF8='1'
python -m pytest -q
genvm-lint check contracts\main.py
genvm-lint schema contracts\main.py --output contract-schema.json
genvm-lint validate contracts\main.py
npm --prefix frontend test -- --run
npm --prefix frontend run build
npm --prefix frontend audit --omit=dev
```

Results: 14 Python tests passed; lint and semantic validation passed; schema exposed 14 methods (8 view, 6 write); 5 frontend files/13 tests passed; production build passed; production dependency audit found 0 vulnerabilities. Vite reported one non-blocking bundle-size warning for an 841.20 kB minified chunk (203.12 kB gzip); no runtime or correctness failure resulted.

## ABI inventory

Writes: `create_bundle(str,str,u256)->u256`, `replace_bundle(u256,str,u256)`, `freeze_bundle(u256,u256)`, `analyze_conflicts(u256,u256)`, `retry_bundle(u256,u256)`, `upgrade(bytes)`.

Views: `get_case(u256)->str`, `get_version(u256,u256)->str`, `get_id_by_nonce(Address,str)->u256`, `get_count()->u256`, `list_cases(u256,u256)->str`, `list_actor(Address,u256,u256)->str`, `list_children(u256,u256,u256)->str`, `get_upgrader()->str`.

Frontend callers use only the five product writes and seven product views. Recovery methods are operational and not advertised in the product UI. `contract-schema.json` is the exact generated ABI evidence.

## Storage and deterministic controls

Persistent fields are one `u256` scalar and six fully typed `TreeMap` indexes: cases, nonce, actor, children, revision and history. JSON is canonicalized with sorted keys, compact separators, UTF-8 and no NaN. IDs, addresses, nonces, integers, object key sets, DAG edges, text bytes, record bytes, pagination, case count, child count, actor count, attempts and revisions are bounded before mutation. Duplicate JSON keys, cyclic/duplicate/self precedence, stale revisions, wrong actors, nonce conflicts and capacity overflow revert without state change. Create replay returns the original ID only when its complete creation hash matches.

The constructor registers the actual deployment sender in `gl.storage.Root.get().upgraders`. `upgrade(bytes)` checks that exact runtime list before replacing Root code. Direct Mode proves initial registration, authorized replacement, unauthorized rejection and unchanged bytes after rejection. Storage order/types must remain unchanged across any future upgrade without a separately reviewed migration.

## Nondeterministic inventory

Only `analyze_conflicts` and `retry_bundle` reach nondeterminism, through one shared `_evaluate` path. One-clause input deterministically returns `NO_PAIRS_TO_COMPARE` with zero model calls. Otherwise:

- acquisition: `gl.nondet.exec_prompt(..., response_format="json")` inside the leader;
- wrapper: one `gl.vm.run_nondet_unsafe(leader, validator)`;
- untrusted boundary: frozen canonical base JSON is delimited and explicitly non-instructional;
- stable consequential object: exactly `{v:1,labels:[OK|CLASH|UNKNOWN,...]}` with exact cell count and 4096-byte cap;
- independent validation: validator executes its own leader classification and compares canonical complete consequential output;
- failures: wrong wrapper, malformed/oversized output, wrong fields/count/labels, validator exception or disagreement fail closed before storage mutation;
- consequence: any UNKNOWN is retryable UNRESOLVED; accepted third UNKNOWN becomes phase EXHAUSTED while retaining semantic outcome UNRESOLVED; deterministic DAG path reduction never removes a clash.

Tests cover agreement, every single changed cell across the 264-cell maximum, malformed and oversized output, cooldown using transaction time, attempt exhaustion and no-write failure behavior.

## Frontend and transaction controls

The React/Vite frontend retains the exact announced EIP-6963 provider object for MetaMask, OKX and Rabby; unknown announcements are hidden and no synthetic wallet is offered. All seven product views route through one shared bounded/single-flight read wrapper and are exposed through case detail plus Count, Cases, My cases, Children and History controls. One wallet store and one Web Locks journal own writes. The lifecycle does not claim success from a hash: it requires terminal semantic success and authoritative readback; ambiguous/interrupted writes remain reconciliation-only and cannot be resubmitted blindly. A finalized execution failure is persisted as `FINALIZED_ERROR` only after the nonce/history or exact prestate readback distinguishes it from an ambiguous receipt; readback failure remains `RECONCILE`. Reproducible design QA in `docs/FRONTEND-QA-EVIDENCE.md` covers 320/375/414/768 widths, horizontal overflow, 44 px targets, labels, modal keyboard/focus behavior and reduced motion.

## Studio and RPC boundary

`docs/RPC-BUDGET.md` locks `OBSERVABLE_ACTION_LEDGER`, with no physical-request-count claim. `docs/STUDIO-PREFLIGHT.md` records the read-only source import and reconciles its immutable contract hash to the externally supplied review candidate, selected account, one transient 30 requests/minute rate limit, one bounded cooldown retry, zero Monaco error markers afterward, two inaccessible warning markers, and the fact that Run & Debug recognized the contract but does not expose method forms until deployment. No validator was configured and no transaction occurred. After approval, deployment must stop if Studio does not expose all 14 methods or if finalized `get_upgrader()` does not equal the locked account.

## Anonymous review correction delta

The first anonymous review returned `CHANGES REQUIRED` with F-001 through F-005. This revision routes every product read through the bounded wrapper (F-001), exposes every required product view (F-002), separates finalized execution errors from receipt ambiguity with exact historical/prestate readback (F-003), removes the impossible self-referential commit claim while preserving Studio-import/source-hash provenance (F-004), and records reproducible viewport/accessibility/focus evidence plus regression checks (F-005). No contract, schema, scope, deployment, signature or transaction changed.

## Experience application and disclosed limits

Applied current experience: independent consequence rederivation; exact EIP-6963 provider-object routing; global RPC budgeting; transaction-specific create identity; protocol-schema parity; current runner pin; separate Studio deployer provenance from Root authorization; immutable transaction reconciliation. Upgrade payload syntax is not exercised because upgradeability is not advertised and local exact-runtime rehearsal passed.

Disclosed limits: pairwise-only semantic assessment; no whole-bundle or single-clause consistency claim; no external-fact or legal verification; hypothetical scenarios only; public/permanent input warning; maximum 12 clauses, 4 scenarios, 264 cells, 32 cases and 3 accepted analysis attempts. Studio lint warnings lack accessible text and therefore are not claimed resolved; local exact lint/schema/validate are green, and deployed ABI parity remains a mandatory post-approval stop condition.

## Reviewer decision requested

Independently inspect the exact revision and verify source hashes, ABI/spec/frontend parity, mutation guards, validator independence, recovery path, tests, Studio limitation and RPC plan. Return every actionable finding with severity, cause, impact and exact correction. End with exactly one checkpoint verdict: `PRE_DEPLOY: APPROVED` or `PRE_DEPLOY: CHANGES REQUIRED`. Approval permits only the governed Studio deployment/test stage for this exact revision and locked account.
