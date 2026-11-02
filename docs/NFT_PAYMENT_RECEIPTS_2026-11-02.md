# NFT payment receipts

## Scope

Production frontend repository: `ffn-frontend`, branch `main`.
Page: `/freedom-nft/rewards`, in the reward-history section.
This change does not modify contracts, payouts, eligibility, database records,
Render services, environment variables, or pending governance proposals.
Suspended staging services remain untouched.

## User experience

- A published, eligible, claimed cycle offers **Generate receipt**.
- Unpaid cycles remain **Payment queued** and cannot produce a paid receipt.
- The modal shows full FFN ID and wallet, historical payout tier, cycle,
  exact USDT amount, actual payment timestamp in UTC, scheduled cycle date,
  network, block number, and a full transaction link.
- The approved tier artwork is reused without alteration.
- Download produces a 1400 x 1360 PNG. Supported browsers offer native file
  sharing; unsupported file sharing falls back to download.
- Wallet switching cannot retain the previous wallet's receipt.
- Escape, focus restoration, scroll containment and narrow-screen wrapping
  are handled by the existing Bootstrap modal library and scoped styles.

## Evidence requirements

The existing indexed `RewardClaimed` API supplies only a transaction locator.
No indexed amount or browser estimate is accepted as proof of payment.
The generator independently checks:

1. Actual RPC chain ID matches the application's configured network.
2. The locator belongs to the configured distributor, wallet, and period.
3. The transaction succeeded and its block remains canonical, with at least
   one following block.
4. At the payout block, the distributor has the configured token, a created
   period, and a claimed payment for the wallet.
5. Exactly one matching distributor `RewardClaimed` event exists.
6. Its positive amount matches that tier's published reward per member.
7. The same receipt contains the matching USDT transfer from the reward
   vault to the member.

The image uses this verified amount, tier and block timestamp. Six-decimal
token precision is preserved; no floating-point conversion is used.
An Amoy build is explicitly marked TESTNET and uses the Amoy explorer.
The production build is not switched to Amoy by this change.

Verification is on demand only. No polling or chain-wide log scans are added.
Event discovery is paginated and bounded to 20 pages of 50 records. Reopening
a receipt verifies again; download/share reuse the verified result and image.
Missing indexing, RPC/archive-read failures or mismatched evidence leave the
receipt unavailable, with retry and a 30-second UI timeout. They never turn a
pending or uncertain payment into a successful receipt.

## Validation

- `node --test test/nftReceipt.test.js test/nftRendering.test.js test/nftQualification.test.js`: 43 passed.
- Targeted ESLint: passed.
- Vite production build: passed; existing large-bundle warning remains.
- `test/verifyNftReceiptBrowser.mjs`: isolated synthetic-data browser fixture
  at 1440x1000, 390x844 and 320x740. Checks responsive layout, original tier
  artwork, PNG dimensions, keyboard/focus behavior, failure/retry and wallet
  switching. Native share API is mocked; real-device share sheets are not
  automated.
- Screenshots and downloaded fixture PNGs are local under
  `_ui-verification/nft-receipt` in the parent workspace, not production assets.
- Browser fixtures are not imported into the production app.

## Production receipt correction

The isolated browser fixture missed a global rule in
`src/Pages/Security/SecurityPage.css` that sets `.modal-content` to `display:none`.
Production verification succeeded and receipt content rendered, but was invisible.
The receipt now explicitly uses `display:flex`; scoped background overrides also
preserve contrast against landing-page and light-theme CSS. Other modals, payout
logic, environment variables and Render services are unchanged.

Regression coverage now loads the actual Security, Admin, Landing, foundation
and variable styles and checks both themes, visibility and PNG export.
The opt-in read-only live browser check uses production configuration and CSS:

```text
node test/verifyNftReceiptLive.mjs <paid-wallet> <cycle> [playwright-module] [--local-css]
```

This invokes the actual receipt component and chain verifier without a signing
wallet. `--local-css` previews the local receipt stylesheet before deployment;
without it, the served CSS must pass desktop/mobile visibility and PNG checks.

## Confirmed distribution

Polygon mainnet, chain **137**, checked at block **96611387**, November 2, 2026:

- Proposals **129 and 128** both executed, each with three confirmations.
- Cycle 1 funding **5,023.84 USDT**; eligible counts **[4, 0, 0]**.
- Four Foundational wallets received **627.98 USDT each**, **2,511.92 USDT total**.
- Shared vault retained **2,511.92 USDT** for the empty Intermediate/Advanced tiers.
- Previous vault balance **0 USDT**, after the approved consolidation.
- ID 1 and the late-mint wallet were not paid in cycle 1.

Successful payout transaction:
`0xad9f57a1fd7c276c3a41d0fe9ab5a822345e584b1264aef667387d5dc5738a3f`

Block **96607964**, timestamp **2026-11-02 11:03:22 UTC**.

| Paid wallet | USDT |
| --- | ---: |
| `0x117C9258a95775Ecf448fd086D00cA22506Ea79d` | 627.98 |
| `0xAa254e8e177dE104D9F87211b0f4a6B7eC71306A` | 627.98 |
| `0xb673c9D14Da920f187d25Cc793f1955a43284622` | 627.98 |
| `0xE8b1ac47231651cCc38326a59645a8D976D0Eabf` | 627.98 |

For all four wallets, the claim state, published per-member amount, indexed
RewardClaimed event and actual USDT transfer from the shared vault matched.
The receipt verifier succeeded for each. The production API reports cycle 1
published and returns the matching events. No proposal or payout transaction was
submitted by this receipt-fix pass; distribution had already completed.
