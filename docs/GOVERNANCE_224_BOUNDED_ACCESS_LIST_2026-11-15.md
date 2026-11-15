# Proposal 224: bounded access-list execution

## Scope and status

Polygon mainnet only, chain ID 137. Governance:
`0x785cC854ce9e13CE1140cbFD7C08620713E1711d`.
This supersedes the application hold on **224 only**. Proposals 225-256 remain
blocked for approval/execution pending verification of 224's actual result.
Revocation remains available. These UI holds do not prevent direct contract calls.

No contract, proxy, ABI, proposal target, calldata, value, repair plan, historical
payment or approved placement is changed by this frontend release. Existing
approvals remain attached to the original proposal. No transaction was signed or
broadcast during these checks; simulation is not proof of completed execution.

## Diagnosis and evidence

At mainnet block 97361857, the unchanged outer multisig call consumed
44,094,863 gas without an access list. The node charged 5,460 gas per cold SLOAD,
not the 2,100 assumed by the earlier local rehearsal. This explains why local
gas results were not sufficient for mainnet admissibility.

Bor v2.11.0 defines `MaxTxGas = 1 << 25` (33,554,432), often described as
32 million in announcements. We use a stricter 31,800,000 signing limit. The
previous 50-million signing workaround was invalid; it is not restored.

| Candidate | Gas used | Encoded size | Decision |
| --- | ---: | ---: | --- |
| No access list | 44,094,863 | Below size cap | Reject: too much gas |
| Full 5,940-key list | 23,543,963 | About 196,366 unsigned bytes | Reject: exceeds 128 KiB txpool limit |
| Bounded 3,900-key list | 30,602,763 | 129,080 bytes including conservative 128-byte allowance | Pass simulation and size checks |

The bounded execution has 1,197,237 gas headroom against the signing ceiling.
Compared with the original diagnostic trace, it produced identical application
storage changes in six contracts and all 46 repair events, with zero token
transfers. Native POL gas accounting and its fee event differ as expected.

The actual frontend helper also passed read-only execution using VoidSigner for
both funded owners at checkpoint block 97362487:
`0x04eaa54e7896C24aF2622b804Bf35E4C662bf12f` and
`0x67E138a2f46AEF2a0031CfCb5Ae843b41c973f41`.
Maximum fee reservations were approximately 12.74 and 12.73 POL at those checks;
these are not fixed charges or current fee quotes.

## Fail-closed execution preparation

Before requesting a signature, the helper verifies both networks, governance and
executor bytecode, exact approved target/value/calldata, proposal status, owner,
quorum, timelock, block capacity and current fee affordability. It discovers an
access list with a **read-only** call, limits it to 3,900 storage keys, checks the
serialized size including signature/nonce allowance, estimates the bounded outer
transaction and simulates that same request against latest state. It rechecks the
wallet account and network before returning signing options.

The 50-million discovery limit is never a signing option. Missing RPC support,
failed simulation, changed payload, insufficient funds or exceeded bounds stops
before requesting execution. Nested RPC errors are surfaced instead of being
hidden behind the generic incomplete-response message. Wallet submission remains
unconfirmed until a transaction hash/receipt or on-chain execution establishes it.

Validation: 46 focused tests passed across governance execution, access-list
preparation, maintenance classification and withdrawn-proposal policy. Tests also
verify ethers preserves the access list in the EIP-1193 wallet request. This does
not guarantee every external wallet will accept that request or its simulation.

## Founder instructions and next gate

1. Refresh the official `https://www.finfreedomnetwork.io/admin` after this release
   is confirmed live. Use Polygon mainnet and a sufficiently funded founder owner.
2. Check proposal 224, then execute **224 only**. Do not change its gas settings,
   override a security warning, or repeatedly retry an uncertain submission.
3. Report its transaction hash. If submission is unclear, check wallet activity
   and on-chain status before any retry. Send the exact error if it stops.
4. Keep 225-256 on hold. Verify the successful 224 receipt, executor flag, agreed
   repaired positions, relationships, event/payment invariants and paused state
   before authorizing the next step. Later final-code, permission-removal and
   reopening gates still apply; successful 224 does not complete the package.

## References

- [Bor gas constants](https://github.com/0xPolygon/bor/blob/v2.11.0/params/protocol_params.go)
- [Bor transaction size limit](https://github.com/0xPolygon/bor/blob/v2.11.0/core/txpool/legacypool/legacypool.go)
- [Polygon upgrade announcement](https://polygon.technology/blog/polygon-speeds-up-by-33-with-madhugiri-hardfork)
- Source/audit repository: `docs/COMBINED_REPAIR_224_BOUNDED_ACCESS_LIST_2026-11-15.md`.
