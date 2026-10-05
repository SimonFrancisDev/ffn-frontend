# Mobile access audit - 2026-10-05

## Verified defects

- The `/tasks` route and Tasks navigation item existed, but `MobileDrawer` filtered the item out. Tasks was therefore absent from mobile navigation.
- The wallet action existed only in the utilities section below the expandable Services tree. On short mobile viewports it was not discoverable without scrolling through the full menu.

## Correction

- Mobile navigation now includes Home, About, Services, Community, Tasks, and Support.
- A primary Wallet / Connect Wallet action is shown immediately below the account summary. The existing utility action remains available as a secondary path.
- Both actions open the same wallet panel and use the existing browser-wallet or WalletConnect connection flow.

## Deployment checks

- `/tasks`, `/freedom-plus`, and `/freedom-nft/membership` must return the production SPA.
- At widths 320, 375, 390, and 430 pixels, open the menu and verify Tasks and Connect Wallet are visible without expanding Services.
- Connect Wallet must open the wallet panel. Browser wallet and WalletConnect options must reflect production configuration.
- No admin navigation is visible unless the connected wallet passes the multisig-owner check.

