# Proposal 224: signing-stage failure and execution hold

The founder reported that the wallet could not return a sign-only transaction.
The application stopped before broadcasting. The message alone cannot identify
the specific wallet or signing-stage cause; it is not a new mined revert.

At Polygon mainnet block 97365396 (2026-11-15 14:39:23 UTC), proposal 224 was
unexecuted with three confirmations. The previously identified founder's nonce
remained 282 and POL balance remained 91.591760909664564467. No new paid attempt
was mined at this checkpoint. The two earlier failed transactions are documented
separately in GOVERNANCE_224_MINED_REVERT_2026-11-15.md.

## Containment

The public execution entry point and proposal UI hold 224-256 for this exact
mainnet governance address. Neither sign-only nor ordinary wallet submission is
offered for 224. No automatic retry, private-key export, disabled wallet protection
or old execution path is requested. Other governance contracts and proposals are
unchanged. This is a frontend hold, not an on-chain cancellation or permission
change; founders must not execute held proposals through another interface.

## Candidate alternative, not live

A one-use execution relay has passed a read-only mainnet state-override simulation
with identical application repair events and storage changes. It can call only
the already-approved proposal 224 and cannot submit or approve proposals, manage
owners, transfer funds directly or execute another proposal.

Using it requires a temporary governance-owner grant to the restricted contract,
then removal. This authority change requires explicit user approval and founder
authorization. No relay was deployed, no permission granted and no new proposal
submitted in this pass. Additional authorization tests and checks against its
real deployed address remain necessary before release.

The complete candidate design and limits are recorded in the contract-source
repository's docs/REPAIR_224_RESTRICTED_RELAY_CANDIDATE_2026-11-15.md. Do not tell
founders to retry 224 or continue with dependent repair/reopening proposals.
