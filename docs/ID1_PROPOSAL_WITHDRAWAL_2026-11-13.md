# Withdraw superseded ID1 repair proposals from signing

Scope: Polygon mainnet (137), multisig
`0x785cC854ce9e13CE1140cbFD7C08620713E1711d`, proposal IDs 130-159 only.

The revised repair preserves Sabina's positions. The prior package must not be
approved/executed. Remove it from the default queue across browsers, retain a
withdrawn/cancelled audit view, and reject approve/execute actions even when an
old proposal is loaded directly. Existing approvals may still be revoked.

This UI policy does NOT cancel proposals on chain. Display that distinction
explicitly. Only successful multisig cancellation makes a pending proposal
permanently unexecutable. No on-chain history is deleted or falsified.

Cancelled proposals now receive their actual status, are excluded from pending
counts and cannot be approved/executed/revoked. Unrelated mainnet proposals,
other multisigs and Amoy are not matched by the withdrawal policy.

No money values, NFT summaries, environment variables or contract addresses
are changed. Existing unrelated community-profile work is excluded from this
release. Policy tests cover network/address/ID isolation and mutation guards.

The existing multisig has no batching primitive. This release does not imply
that thirty on-chain actions have become two or three proposals.
