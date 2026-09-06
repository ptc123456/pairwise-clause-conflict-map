# Deployment and recovery boundary

The exact `PRE_DEPLOY` package locks Studio account `0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902` as both intended deployer and initial upgrader before any deployment transaction. The constructor registers the runtime deployment sender in `gl.storage.Root.get().upgraders`; finalized `get_upgrader()` readback must match this locked public address.

`upgrade(new_code: bytes)` replaces Root Slot code only when the caller is registered in the locked upgrader set. Every replacement must preserve the existing storage-field order and types unless a separately reviewed migration plan is approved. Upgrade payload bytes, source hash, caller identity, execution success and post-write code/readback parity must be verified independently.

Recovery is not guaranteed. Upgrade authority can be permanently lost if the selected Studio account becomes unavailable, its signing access is lost, Studio is reset, or the relevant Studionet state is reset or no longer accessible. Do not deploy until continued access to the selected account has been checked. Do not infer Studio sidebar deployment authority from contract-level `get_upgrader()` readback; those are separate controls.

The local Direct Mode rehearsal proves constructor registration, authorized code replacement, unauthorized rejection and no code mutation on rejection. It is not live deployment evidence. A live disposable upgrade rehearsal is required only if a later gate identifies a current Studio/runtime discrepancy, migration dependency or advertised upgradeability risk.
