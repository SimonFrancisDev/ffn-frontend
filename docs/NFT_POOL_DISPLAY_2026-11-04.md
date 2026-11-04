# Shared NFT Pool Figures

## Scope

Production frontend only: separate lifetime NFT inflow from current pool assets.
No contract, payout, membership, receipt, environment, database, or worker changes.
Suspended staging services remain suspended. Existing unrelated backend changes are not included.

## Definitions And Source

- **Total NFT accumulated (all time)**: `data.public.nftRewardPool.totalInflow` from the production `/api/community/summary`. Indexed NFT allocations from F-Freedom and Freedom Plus, not the current USDT balance. Payouts do not reduce this total. Moving funds between the shared and legacy vaults is not another allocation.
- **Current NFT pool balance**: `currentBalance`, only when `balanceVerified === true`. The backend deduplicates vault addresses and sums their actual USDT balances. This is not a promise that all remaining assets can be paid immediately; reserved rewards can still be part of the balance.
- **Total NFT distributed**: the existing separate backend `totalDistributed` metric, retained on Dashboard and Admin. The frontend does not calculate it from inflow or balance. The backend currently reconciles indexed claims with verified net outflow; this display change is not a new audit of every historical outflow.
- Personal NFT payments, receipts, tier qualification and locked FGT/FPT remain separate and unchanged.

## Display Inventory

| Page | Change |
| --- | --- |
| `/dashboard` | Shared lifetime, current and distributed figures |
| `/dashboard?program=freedom-plus` (also `/freedom-plus/dashboard`) | Same ecosystem pool; no longer displays a Freedom-Plus-only calculated NFT balance |
| `/community` | Lifetime and current shown together; no misleading old live-balance label on an accumulated amount |
| `/admin` | Same shared figures and labels; admin permissions/actions unchanged |
| `/freedom-nft` | Pool summary below the existing hero |
| `/freedom-nft/membership` | Shared pool summary separate from personal tokens and membership |
| `/freedom-nft/rewards` | Shared pool summary separate from personal paid rewards and receipts |

Static tier percentages, per-transaction NFT allocations, wallet earnings and receipt amounts are not pool totals and are deliberately untouched.

## Request And Failure Behavior

One shared 15-second browser cache and in-flight request deduplication. Existing Dashboard, Community and Admin summary requests use the same reader. No new polling, direct browser RPC calls, background scans or wallet signing. Each summary has an explicit refresh button. A failed request clears the displayed snapshot. Missing/unverified balances show `Unavailable`, never zero or inflow minus distributions. Verified zero displays as zero.

## Read-only Production Evidence

Checked on 2026-11-04 at 00:52:45 UTC using Polygon **mainnet chain 137**, block **96698739**:

| Source | Value |
| --- | --- |
| Production API lifetime accumulation | 5,133.44 USDT |
| Production API distributed | 2,511.92 USDT |
| Mainnet USDT at `0xbb2cF7ef867F46A93ae1F9DEd564927874b79B52` | 2,621.52 USDT |
| Mainnet USDT at legacy `0xf8F60Da42681b73DFeCa7731E78b29C8707C184b` | 0 USDT |
| Production API current balance | `null`, `balanceVerified: false` (confirmed twice) |

The chain snapshot reconciles arithmetically, but the public API's current balance read is unavailable. **Do not claim the live balance API is repaired by this frontend work.** No value is hard-coded, and the UI intentionally shows Unavailable until the API verifies it. The deployed production balance-reader failure needs separate operational diagnosis; no RPC/environment replacement or unrelated backend commit is authorized by this change.

## Validation

- `node --test test/nftPoolMetrics.test.js`: normal amounts, separate payout/deposit effects, duplicate aliases, zero, unavailable, invalid input, shared requests, expiry, error recovery and no polling.
- `node test/verifyNftPoolBrowser.mjs <playwright-module>`: seven display contexts, desktop/mobile, both themes, overflow, unavailable/error/zero/recovery and request counts using synthetic data, never live transactions.
- The pool, receipt, rendering and qualification suites passed together: **70 tests, 0 failures**. Targeted ESLint passed for all new runtime modules.
- Production build passed (3,991 modules). Existing large-chunk warning remains; unrelated bundle restructuring is out of scope.
- Initial browser geometry/data checks passed all three viewports. Screenshot review additionally caught inherited dark-mode text color; the component now explicitly uses the existing theme token, with a regression assertion for both themes. The final CSS is verified by the browser bundle after this correction.
- No Render or Vercel settings were changed. A read-only treasury-log lookup timed out; it did not establish the cause of the production API balance-read failure.
