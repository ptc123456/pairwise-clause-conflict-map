# Studio preflight evidence

Recorded: 2026-09-07; provenance and account binding reconciled 2026-09-11 (Asia/Saigon)

Studio source-import commit: `3ec91915bcbad5614438076b153a2029cae7063f`

Review candidate: supplied by the immutable PRE_DEPLOY transport after this evidence file is committed. The later candidate changes before review were documentation/state only; `contracts/main.py` retained the exact hash below.
Contract SHA-256: `F04CD0DF757BE71A7EA129C73113E78238C6364FBAEEC90F4275156CC90D7103`

## Read-only Studio checks

- Studio account selected without transaction: `0x15872d1887b8ff7322F2aa7c3c535f1F00dbb452`, visible balance 1,000,000 GEN. Intended role: deployer and initial Root upgrader. This replaces the unavailable prior account binding as a scoped PRE_DEPLOY identity correction; contract and schema bytes are unchanged.
- Exact local `contracts/main.py` was imported into Studio and visibly retained the pinned `v0.3.0` header, dependency and source body.
- Exact-revision reconciliation confirmed the reviewed candidate contains the same contract bytes as the Studio source import. This is source-parity evidence, not deployment evidence.
- Initial import triggered Studio's automatic Monaco linter while the shared endpoint was already at its 30 requests/minute limit. The exact observed error was `Rate limit exceeded: 30 requests per minute -32029`; no source-specific error was inferred from it.
- After one 45-second bounded cooldown and one no-net-change edit trigger, Studio exposed zero error markers. Two warning markers remained with no accessible warning text. The local exact-runtime linter and semantic validator independently passed; warnings are disclosed and are not relabeled as errors or silently discarded.
- Run & Debug recognized `Contract main.py` and reported `Not deployed yet.` It did not expose method forms before deployment and also reported that at least one validator must exist before deploy/interact. No validator was configured and no deployment, signature or transaction occurred.

## Schema boundary

The exact local candidate passed `genvm-lint 0.11.0` schema and semantic validation with 14 methods (8 view, 6 write), including `get_upgrader()->string` and `upgrade(bytes)->null`. Studio's live deployed method inventory remains a post-`PRE_DEPLOY` deployment check. If Studio does not expose the same 14 methods after deployment, stop before any E2E write and treat the deployment/schema mismatch as a blocker.

## Pre-deployment read-only snapshot (2026-09-07)

- Studio page opens: 1 fresh governed session plus navigation within the same tab.
- Source imports: 1 exact file.
- Account selections: 1 read-only selection.
- Rate-limit retries: 1 bounded cooldown retry with changed timing.
- At this snapshot only: transactions, hashes, status polls, terminal receipts, authoritative contract readbacks and duplicate transactions had not started. Subsequent live activity is recorded below and in `docs/preflight/studio-e2e-ledger.md`.

## Post-deploy observation

- On 2026-09-12, after the exact PRE_DEPLOY approval and explicit user authorization, the primary AI performed one deployment action using the locked account `0x15872d1887b8ff7322F2aa7c3c535f1F00dbb452`.
- Studio observed transaction `0xa9629490ae894894e82479c28acad1e08059cf147fd11956d4457bbccc81bd39` through `PROPOSING`, `COMMITTING`, `REVEALING`, `ACCEPTED` and `FINALIZED`, with `Contract deployed` and `Reached consensus` logs.
- Studio displayed deployed contract `0x712f40879a84c6D3849421c8a54417681F1A165e`. At that observation only, semantic owner/method/readback checks and E2E writes remained pending; they were later completed as recorded in `docs/preflight/studio-e2e-ledger.md`.
- Reopening Studio and selecting the retained `main.py` instance preserved the deployed address. A subsequent schema/readback attempt hit the observed `30 requests per minute` limit; no redeploy, duplicate transaction or blind retry was made.
- The secret-free recovery manifest is `docs/DEPLOYMENT-MANIFEST.md`; the detailed transaction ledger is `docs/preflight/deployment-ledger.md`.

## Current post-deploy status

- Deployed method inventory and finalized owner/case readbacks were observed; the successful create/freeze/analyze path and stale-revision no-write rejection are recorded in `docs/preflight/studio-e2e-ledger.md`.
- The PRE_DEPLOY matrix's live draft replacement and unresolved/retry continuation is complete. The separate ledger records nine method submissions, one cooldown-gated retry, final readbacks, timing variance, and no replay; the approved aggregate ceiling of 10 method submissions was not exceeded.
