# Repair 224: verify signed bytes before broadcast

## Reason

The two [mined failed attempts](GOVERNANCE_224_MINED_REVERT_2026-11-15.md) omitted
the required access list. The prior read-only simulation was not proof that the
wallet would preserve the prepared request. The generic `eth_sendTransaction`
path cannot inspect signed bytes before the wallet broadcasts them, so it is
disabled for this exact mainnet proposal.

## Changed path

1. Keep all exact-payload, network, owner, quorum, runtime, timelock, size, gas,
   affordability and current-state checks from `prepareRepair224`.
2. Require no outstanding nonce/pending transaction for this founder.
3. Ask the signing wallet for `eth_signTransaction`, never `eth_sign` or an
   `eth_sendTransaction` fallback. No private key is requested by the site.
4. Parse the returned signed bytes. Recover the sender and compare the entire
   unsigned transaction hash against the prepared request. This binds chain,
   nonce, target, calldata, value, type, gas ceiling, fees and full access list.
   Validate actual signed size against 128 KiB.
5. Recheck wallet/network, nonce, balance and simulate the same signed request
   against latest state. Reject before broadcast on any mismatch or revert.
6. Only then send those exact bytes through `eth_sendRawTransaction` and verify
   the returned hash. No automatic retry; uncertain submission reports the
   locally derived hash so its receipt can be checked first.

Signed bytes remain in memory, not local storage, telemetry, logs or committed
files. They are submitted only after the founder's transaction signature and all
checks. They cannot be altered without invalidating the signature/hash.

## Compatibility and limitations

Wallet support for sign-only requests is NOT assumed. An unsupported wallet
stops with a clear error before this application broadcasts or spends gas.
Do not instruct founders to export keys, enable blind signing, disable security
checks, or revert to the previous broadcast-first path. Wallet identity/version
must be established if it refuses the sign-only request. No claim of completed
repair is made before an actual successful receipt and repaired-state checks.

The site permits only this signed-output path for 224. Generic execution-option
preparation rejects 224, even if an earlier simulation passed. Proposals 225-256
remain held. Other governance proposals keep their existing behavior.

## Validation

60 focused tests passed, including dropped access lists, modified signer/network,
nonce, calldata, value, destination, fees, packet size, malformed/unsigned output,
unsupported signing, rejection, pending nonce, changed balance, post-signature
revert, and uncertain broadcast. The real ethers sign-only provider boundary is
tested without a live wallet or broadcast. These tests do not certify a specific
external wallet's support for `eth_signTransaction`.

Live read-only entry-point check passed at mainnet block 97364209
(2026-11-15 14:09:43 UTC), using the affected owner with nonce 282. The request
retained 3,900 keys and a 31,800,000 gas ceiling. The diagnostic deliberately
stopped at the signing boundary with a VoidSigner; no signature or broadcast
occurred. Proposal 224 remained unexecuted, uncancelled, with three approvals.

## Next step

Confirm the founder's wallet app and device. A compatible wallet may use the
updated official admin page to sign proposal 224; the app validates the signed
output before broadcasting. An unsupported-wallet response requires a compatible
signing route, not another ordinary execution retry. After any broadcast, report
its hash and stop before 225. The original three approvals and repair plan are
unchanged. No new contract or proposal is needed by this signing-path change.

Reference: [Ethereum execution API: eth_signTransaction](https://ethereum.github.io/execution-apis/api/methods/eth_signTransaction/).
