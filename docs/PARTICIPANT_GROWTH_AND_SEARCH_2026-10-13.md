# Participant Metrics, Growth Charts, and Member Search

Date: 2026-10-13

## Scope

This change standardizes participant metrics, participant-growth charts, activation
progression, and member search across production and staging. It does not modify
smart contracts, payment routing, indexers, or financial calculations.

## Canonical participant value

- The value comes from `GET /api/community/summary`.
- It represents the whole ecosystem and counts ID1 once.
- Freedom-Plus uses the same ecosystem total; its financial metrics remain specific
  to Freedom-Plus.
- The label is `Fin Freedom Participant`.
- Counts use exact-plus below 1,000 and floored compact values above it.

## Growth charts

- Landing and Dashboard use the compact cumulative participant chart.
- Community provides Total Participants and Daily Registrations with 7D/14D/30D.
- One 30-day request to `GET /api/community/growth?days=30` supplies the data.
- Cumulative history is derived from the current canonical total and indexed daily
  registrations. No blockchain RPC calls or additional polling were added.
- Activation pages use a categorical level progression track.

## Animated metrics

Values animate on viewport entry, respect reduced-motion preferences, and expose
the exact final value to assistive technology. Money remains at two decimals.

## Member search

Account, Community, and Orbits accept a wallet address, FFN ID, or full referral
URL. They support Enter/mobile submission, loading states, cancellation, retryable
errors, and stale-error clearing. Existing profile privacy checks remain in place.

## Verification

Run `npm.cmd run build` and `npm.cmd run lint` in each frontend. Verify Landing,
Dashboard, Community, Account, Orbits, and both activation pages at desktop and
mobile widths.

