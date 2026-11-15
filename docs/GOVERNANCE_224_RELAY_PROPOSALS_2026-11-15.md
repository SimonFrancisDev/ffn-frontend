# Proposal 224 helper: 257 available, 258 held

Following explicit user approval, helper
`0x16F9ac40B06e2a17bc0CC145b211A176E8654906` was deployed on Polygon mainnet
in transaction `0x68b7345b487be9ac68ffee0a75ff6866f0644e87c33804c0c61d1478f4ce017d`.
Its runtime hash is
`0x391bdf63a93a9ec64929f8ab3dacb79371054365a6ae6f336a22b3af80aa96f4`.
It can execute only existing proposal 224, once, through the existing multisig,
and only when called by the fixed project operator. It cannot approve, submit,
cancel, manage owners or execute another proposal. Deployment did not authorize it.

The verified governance address is
`0x785cC854ce9e13CE1140cbFD7C08620713E1711d`, chain 137.

- 257: `addOwner(helper)`, zero value. Three founder approvals and execution grant
  the restricted contract temporary authority. The threshold remains three.
- 258: `removeOwner(helper)`, zero value. Remains held until the actual repair
  receipt and resulting records are verified. Removal must follow, not precede,
  the repair. Original proposals 224-256 remain held as before.

The panel uses exact chain, governance, proposal ID, target, value and calldata
matching for the new descriptions. Mismatches require review. The execution
entry point also blocks premature removal before estimation/signing. Unrelated
governance proposals retain their existing handling. This UI hold does not impose
an on-chain restriction, so founders must not bypass it through other interfaces.

Next founder action: refresh the production admin page, approve and execute 257
only, then stop and report completion. Do not retry 224 through a founder wallet.
No keys need to be exported and no security setting should be disabled.

Detailed runtime, read-only gas/authorization tests, mined transaction evidence,
fees and later execution gates are recorded in the contract-source repository's
`docs/REPAIR_224_RELAY_DEPLOYMENT_2026-11-15.md`.
