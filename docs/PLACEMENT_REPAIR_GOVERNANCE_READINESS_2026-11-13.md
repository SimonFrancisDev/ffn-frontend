# Mainnet placement-repair governance readiness

## Changes

The founder panel now identifies maintenance calls using both calldata and the
configured destination. Previously shared selectors such as `pause()` and
`upgradeToAndCall()` could label Freedom Plus or orbit actions as LevelManager
actions. Guardian checks now receive the actual proxy and implementation.

Historical `execute(bytes[4])` repairs require an exact chain-137 multisig,
destination, native value and calldata match in a verified live-deployment
manifest. Unverified repairs are blocked from approval/execution in this UI;
revocation remains available. The manifest deliberately starts empty, not with
addresses predicted by a local fork. It must be populated after live inert
deployment verification, before the replacement proposals are submitted.

Withdrawn proposals 130-159 remain archived and blocked. The new UI does not
cancel proposals on chain or remove blockchain history. Cancellation proposals
160-189 were submitted separately and still require founder action.

Identical owner-list reads now preserve state identity, preventing the
owner-list/readTransaction/refresh effect loop found during browser testing.
Selected proposal details wrap within mobile width, so full targets and calldata
remain inspectable. The queue retains its horizontal scrolling table.

P4/P12/P39 ABI return tuples now include the candidate's `mirrorRecycleAmount`.
No user transaction or payment flow was changed. Existing unrelated Community
and overlay work was left untouched and excluded from this release.

## Verification

- Seven decoder/policy tests passed, including wrong chain, target, value and
  calldata rejection, and rejecting fork-only manifests.
- Actual AdminPanel browser fixture passed at 1440px and 390px: program-specific
  labels, full selected target, blocking unverified repairs, settled refreshes,
  and selected details fitting the viewport. Wallet writes and external requests
  were prohibited. Screenshots are local evidence under `tmp/repair-governance-browser`.
- Vite production build passed. Existing large-bundle warning remains.
- The actual served production bundle was independently inspected at
  2026-11-13 22:48 UTC: chain 137, production API and expected program addresses.
  The Vercel CLI's blank encrypted values were not treated as actual live values.
- Added only `VITE_FREEDOM_PLUS_SETTLEMENT_ROUTER_ADDRESS` to this production
  Vercel project, equal to the verified proxy
  `0x8C88262595cbEAA5FffB60a0689b3EAbe22B0498`. Existing variables were not replaced.

## Remaining boundary

Release these UI changes, verify the served result, then bind the exact verified
live deployment manifest. Proposal submission does not execute the repair.
Founders must follow the ordered cancellation and maintenance instructions;
reopening still requires post-execution chain/backend/UI reconciliation.
