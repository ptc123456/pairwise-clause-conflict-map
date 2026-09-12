# Pairwise Clause Conflict Map

Pairwise Clause Conflict Map is a GenLayer Studionet workbench for examining whether policy clauses conflict under declared hypothetical scenarios and whether a declared precedence graph orders each clash.

## Links

- Website: https://pairwise-clause-conflict-map.vercel.app
- Studionet contract: https://explorer-studio.genlayer.com/address/0x712f40879a84c6D3849421c8a54417681F1A165e
- GitHub: https://github.com/ptc123456/pairwise-clause-conflict-map

## Why this uses GenLayer

The central decision is semantic and nondeterministic. GenLayer validators independently classify each clause pair as `OK`, `CLASH`, or `UNKNOWN`. The contract accepts the normalized result through validator consensus, stores it on chain, and reduces `CLASH` cells against the declared directed precedence graph.

## How it works

1. Connect a supported wallet to GenLayer Studionet, chain 61999.
2. Author 1 to 12 clauses and 1 to 4 hypothetical scenarios.
3. Optionally declare higher and lower precedence edges. Cyclic graphs are rejected.
4. Select `Create bundle`, wait for the finalized `BASE_DRAFT` readback, and review the generated Case ID.
5. Select `Freeze`, wait for the finalized `FROZEN` readback, then select `Analyze`.
6. Inspect the `Pair × scenario map`. Each assessed cell displays `OK`, `CLASH`, or `UNKNOWN`. Clash cells show a precedence path when one exists.

If a result remains `UNKNOWN`, the case becomes `UNRESOLVED` and can be retried after the displayed cooldown. The contract can end in `DONE` or `EXHAUSTED` according to the result and retry limit.

## Trust boundaries and limitations

- Submitted clauses and scenarios are public and permanent.
- The product assesses only the exact submitted clauses under the exact declared scenarios.
- It does not verify external facts, historical records, or real-world truth.
- It does not certify whole-bundle consistency or internal consistency within one clause.
- It does not assess scenarios that were not submitted.
- The precedence reducer is deterministic, while semantic pair classification is performed through GenLayer validator consensus.

## Architecture

- `contracts/main.py` owns the bundle lifecycle, validation, freezing, semantic classification, consensus result, precedence reduction, retry handling, and readback state.
- `frontend/` provides the authoring workbench, wallet selection, transaction lifecycle, case history, pair map, and authoritative readback.
- `tests/` contains contract behavior tests. Frontend unit tests are colocated under `frontend/src/`.
- No backend or project database is required.

## Run locally

Requirements: Node.js 20 or newer and a wallet that can connect to GenLayer Studionet.

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_CONTRACT_ADDRESS` in `.env.local` to the Studionet contract address before using the live contract from a local build.

## Tests and build

```bash
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for the verified deployment, source parity, live journey, and current limitations.

## License

This repository is provided for public review and experimentation on GenLayer Studionet.
