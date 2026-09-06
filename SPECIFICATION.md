# Pairwise Clause Conflict Map — Build Specification

Status: `SPEC_LOCKED`

## Product boundary

Implement the exact approved C6 Stage 1/2 handoff. One author creates, edits and freezes up to 12 clauses, 4 declared hypothetical scenarios and a directed acyclic precedence graph. Anyone may analyze the frozen bundle. Validators independently classify every clause-pair/scenario cell as `OK`, `CLASH` or `UNKNOWN`; deterministic reduction reports only pairwise clashes and precedence paths.

The product never certifies whole-bundle consistency, single-clause consistency, legal compliance, readiness, approval or finalizability. There is no finalize API or eligibility field.

## Contract protocol

The authoritative product storage fields, record schema, capacities, validation rules, revision/history behavior, methods, outcomes and reducer are those in `STAGE-2.md`. The product write surface is exactly:

- `create_bundle(nonce:str,base_json:str,parent:u256)->u256`
- `replace_bundle(id:u256,base_json:str,expected_revision:u256)->None`
- `freeze_bundle(id:u256,expected_revision:u256)->None`
- `analyze_conflicts(id:u256,expected_revision:u256)->None`
- `retry_bundle(id:u256,expected_revision:u256)->None`

The seven common product views in `STAGE-2.md` are also required. The governance-required recovery surface additionally exposes `get_upgrader()->str` and `upgrade(new_code:bytes)->None`; it is operational recovery infrastructure, not an advertised conflict-map feature. One-clause analysis skips the model and commits `NO_PAIRS_TO_COMPARE`. Every other analysis uses one `gl.vm.run_nondet_unsafe` wrapper whose validator independently reruns the same bounded prompt and compares the complete consequential `{v:1,labels:[...]}` object. Failures and disagreement do not mutate state.

## Runtime lock

Probe environment on 2026-09-07: Python 3.13.6, `genvm-lint 0.11.0`, `genlayer-test 0.29.2`, GenVM bundle `v0.3.0-rc7`, runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.

The exact probe passed lint, schema, semantic validation and Direct Mode. The schema mapped `u256` to ABI `int`, `Address` to `address`, and write `None` to `null`. Product source uses the verified `# v0.3.0` header and `from genlayer import *` import form. These are version-sensitive implementation spellings, not product adaptations.

Official references checked 2026-09-07:

- https://docs.genlayer.com/developers/intelligent-contracts/storage
- https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle
- https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context
- https://docs.genlayer.com/api-references/genlayer-linter
- https://docs.genlayer.com/developers/intelligent-contracts/testing

## Frontend and evidence

React/Vite with the GenLayer JS SDK, no backend. Implement the frozen authoring journey, deterministic pair/scenario preview, case/history views, exact EIP-6963 MetaMask/OKX/Rabby selector, crash-recoverable Web Locks journal, bounded shared RPC client, full transaction lifecycle and authoritative historical readback described in Stage 2. Public copy must retain both scope disclaimers and the public-data warning.

All Stage 2 contract, validator, serialization, journal, wallet, browser and evidence acceptance criteria remain binding.
