# Mainnet proposal 224 execution preflight

## Scope and diagnosis

This is a production admin execution fix only. It changes no proposal payload,
contract implementation, approval threshold, placement, payment, RPC setting or
database. No staging service is resumed.

The reported wording, "The wallet could not confirm this transaction is safe to
submit", is the frontend's generic CALL_EXCEPTION/gas-estimation error mapping
in `src/utils/errorMap.js`. It is not by itself evidence of a wallet security
provider's finding. Independent wallet warnings must still be investigated.

Polygon mainnet (chain 137), governance:
`0x785cC854ce9e13CE1140cbFD7C08620713E1711d`.

At block 97359275 (2026-11-15 12:06:22 UTC), proposal 224 matched the bound
target, zero native value and all 76,452 calldata bytes. It had three approvals,
an elapsed timelock, and was neither executed nor cancelled. Proposal 225 was
also unexecuted with three approvals.

The exact outer `executeTransaction(224)` call reverted at 30, 35 and 40 million
gas but succeeded with 50 million gas. Automatic estimation failed even with a
50-million ceiling. A successful call trace used 44,094,863 gas in the outer
multisig call, with no failed nested call. The prior local fork receipt is not a
current mainnet gas estimate. The provider's internal estimation failure cause
has not been established.

## Restricted remedy

Only proposal 224 on this exact mainnet multisig uses an explicit 50-million
gas ceiling. All other proposals retain estimation and the existing 20% buffer.
The execution helper requires:

- Mainnet on both read RPC and connected signing wallet.
- An exact verified manifest target/value/calldata match and a separately pinned
  calldata hash; matching live governance and executor runtime code.
- A currently unexecuted, uncancelled proposal, an actual owner, quorum and an
  elapsed timelock.
- A sufficient block gas limit, valid current fee quotes and enough POL in the
  signing wallet for the maximum fee reservation.
- A fresh successful simulation of the outer multisig call from that actual
  owner, at the exact gas/fee options that will be submitted.
- An unchanged signing account/network after simulation.

The repair contracts retain their paused-state, plan/state-hash and one-time
execution guards. No warning, guard or founder signature is bypassed. Simulation
failure stops before signing. Simulation success is not proof of execution, and
state or fees can change between simulation and inclusion.

## Validation

- 33 focused governance tests passed, including negative network, payload,
  bytecode, quorum, timelock, balance and failed-simulation cases.
- The actual helper passed a live Polygon call using `VoidSigner`, which cannot
  sign. Its quoted maximum reservation was 19.8306070057 POL, not a promised fee;
  current quotes and actual gas use determine cost.
- Public runtime fixtures were read at block 97359780, hash
  `0xbed9d76f59109b9ef7277c6a63ddcf027a623a77c22b1d30e9e7388009bad648`.

## Founder procedure

After the production release is verified, refresh the official `/admin` page.
Use a funded existing founder wallet on Polygon, select 224 and review the
wallet's gas fee before signing. Do not alter the payload or disable warnings.
Report the transaction hash and stop for an on-chain result check before 225.
Do not retry an already executed proposal, skip ahead, or reopen the programs.
No transaction was signed or broadcast by this diagnostic/frontend work.
