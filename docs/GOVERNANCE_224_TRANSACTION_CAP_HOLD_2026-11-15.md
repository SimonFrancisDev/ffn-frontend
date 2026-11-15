# Mainnet 224: transaction gas cap hold

## Correction

The preceding explicit-50-million-gas workaround was incorrect. It verified the
160-million block limit, but missed Polygon's separate 32-million transaction
cap. A successful eth_call/debug trace at ~44.1 million gas cannot establish
that a signed transaction is admissible. The successful simulation must not be
described as a transaction-ready repair.

Primary reference: [Polygon's Madhugiri upgrade](https://polygon.technology/blog/polygon-speeds-up-by-33-with-madhugiri-hardfork),
EIP-7825: maximum gas per transaction is 32 million. The current provider does
not implement the draft `eth_txGasLimitCap` method. Its client identifies as Bor
v2.11.1-private. No transaction was sent to probe the limit.

## Current evidence

At Polygon mainnet block 97361306 (2026-11-15 12:57:08 UTC):
- Proposals 224 and 225 were unexecuted, uncancelled, each with three approvals.
- Both target executors returned executed=false.
- No Execute(224) event occurred since the previous checkpoint, block 97360288.
- All four owners had equal confirmed/pending nonces at the queried provider.
  This does not prove absence from every provider's transaction pool.

The new message comes from the frontend's generic "could not coalesce" mapping;
the exact nested error from the founder's wallet has not yet been supplied. The
cap violation is independently sufficient to invalidate the previous retry
instruction, but the specific wallet rejection is not yet independently captured.

## Containment and next step

The 50-million override and its obsolete runtime fixture are removed. The exact
mainnet governance wallet now has a visible, fail-closed application hold on
approving/executing proposals 224-256, with revocation still available. A fresh
network/address check in execution preparation also enforces the hold. Other
governance wallets/networks and unrelated proposals retain normal estimation.

Do not raise gas, add POL as a workaround, disable warnings, execute 225 or skip
to final-code/reopening proposals. Application holds do not cancel on-chain
proposals and do not prevent direct contract calls from another interface.

Repair execution must be optimized or split, with exact original plan/state
bindings, intended corrections, no-transfer behavior and dependency order
preserved. The full outer multisig execution must pass at a gas limit below the
protocol cap with headroom before a revised founder instruction is released.
Any replacement implementations/proposals need their own review and approvals;
none has been deployed or submitted by this containment change.
