# Deployment and recovery manifest

Status: live Studio deployment and bounded post-deploy E2E recorded; `POST_DEPLOY_TEST` approved; release publication is next and Vercel E2E remains intentionally unstarted.

- Network: GenLayer Studio / Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com/address/0x712f40879a84c6D3849421c8a54417681F1A165e`
- Contract address: `0x712f40879a84c6D3849421c8a54417681F1A165e`
- Deployment transaction: `0xa9629490ae894894e82479c28acad1e08059cf147fd11956d4457bbccc81bd39`
- Deployment status: `FINALIZED`; observed consensus states `PROPOSING -> COMMITTING -> REVEALING -> ACCEPTED -> FINALIZED`
- Exact source commit: `33936b3306ef0952d7a8770d02db9edb910ebc72`
- Exact source file: `contracts/main.py`
- Deployed source SHA-256: `F04CD0DF757BE71A7EA129C73113E78238C6364FBAEEC90F4275156CC90D7103`
- Explorer deployment receipt `contract_code` SHA-256: `F04CD0DF757BE71A7EA129C73113E78238C6364FBAEEC90F4275156CC90D7103` (exact match)
- Explorer sender/creator: `0x15872d1887b8ff7322F2aa7c3c535f1F00dbb452`; semantic execution `SUCCESS`; consensus `Accepted`; status `FINALIZED`
- Constructor arguments: none
- Intended deployer/upgrader: `0x15872d1887b8ff7322F2aa7c3c535f1F00dbb452`
- Final `get_upgrader()` readback: `0x15872d1887b8ff7322F2aa7c3c535f1F00dbb452` (Finalized state)
- Deployed method inventory: 14 methods (8 read, 6 write), matching the reviewed schema
- Finalized `get_case(1)` readback: `DONE`, `revision=3`, `base_locked=true`, result `CLASH`
- Linked contracts: none
- Configuration transactions: none

No secret, private key, seed phrase, credential or token is stored here.
