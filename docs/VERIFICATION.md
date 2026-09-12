# Verification

## Current public deployment

- Network: GenLayer Studionet
- Chain ID: `61999`
- Contract: `0x712f40879a84c6D3849421c8a54417681F1A165e`
- Explorer: https://explorer-studio.genlayer.com/address/0x712f40879a84c6D3849421c8a54417681F1A165e
- Deployment transaction: `0xa9629490ae894894e82479c28acad1e08059cf147fd11956d4457bbccc81bd39`
- Deployment status: `FINALIZED`
- Deployment result: `SUCCESS`
- Consensus result: `Accepted`
- Website: https://pairwise-clause-conflict-map.vercel.app

The deployed contract source is `contracts/main.py`. Its verified source SHA-256 is:

```text
F04CD0DF757BE71A7EA129C73113E78238C6364FBAEEC90F4275156CC90D7103
```

The deployed contract exposes 14 methods, with 8 read methods and 6 write methods. The deployed source matches the repository contract source.

## Verified public journey

The following journey was completed against the public Vercel release and the Studionet contract:

| Action | Result | Transaction |
|---|---|---|
| Create bundle | `FINALIZED`, execution `SUCCESS`, readback `BASE_DRAFT`, revision 1 | `0xe41b5d3fbeb0c9d2c388764d62e24ac0c85f4b90ad0fbbc802700bf7c2d8459b` |
| Freeze bundle | `FINALIZED`, execution `SUCCESS`, readback `FROZEN`, revision 2 | `0x12b5c1fa02de007e885eaaad5dabc949a05945d8525f30c87c28f5ba0dc708af` |
| Analyze conflicts | `FINALIZED`, quorum accepted, readback `DONE`, ordered `CLASH` result | `0x7daf063a785faf65ddc205da720d7866f781679c4baf04775ea28af6bbccdbfd` |

The live journey also verified reload, reconnect, case readback, history, children, pending transaction presentation, and bounded reconciliation without resubmitting a retained transaction.

## Local verification

```bash
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

The current verification run passed 14 frontend tests across 5 files and produced a successful production build.

## Public security and scope notes

- Submitted text is public and permanent.
- No private key, seed phrase, credential, or wallet export belongs in this repository.
- The contract does not handle real-world funds or payouts.
- `UNKNOWN` is treated as unresolved and retryable. It is not converted into a definitive result.
- Precedence cycles are rejected before a bundle can be frozen.
