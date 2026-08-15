# Fin Freedom Network Brand and Orbit Guide

This document is the production brief for designers, presenters, animators, and video editors. It uses the current Fin Freedom Network website and deployed program rules as its source.

## 1. Brand identity

### Official name

Fin Freedom Network

### Official logo files

- Dark-background logo: `public/images/official_logo_2.png`
- Light-background logo: `public/images/official_logo_light.png`
- Compact title-bar logo: `public/images/title_bar_logo.png`

Do not redraw, distort, rotate, recolor, crop, or add effects to the logo. Keep clear space around it equal to at least the height of the letter `F` in the symbol.

### Typography

- Primary typeface: **Inter**
- System fallback: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Technical data only: JetBrains Mono or a standard monospace fallback

Use Inter for headlines, captions, narration cards, labels, and body text. Use monospace only for wallet addresses, transaction hashes, position numbers, and other technical data.

### Website color palette

| Role | Color | Use |
|---|---:|---|
| Deep navy | `#07111F` | Main dark background |
| Navy | `#0B1730` | Secondary background |
| Raised navy | `#0F1F3D` | Panels and diagram bands |
| Teal | `#1DE9B6` | Success paths, active links, highlights |
| Blue | `#4DA3FF` | Primary actions and structural paths |
| Purple | `#8B5CF6` | Supporting routed-payment paths |
| Green | `#22C55E` | Confirmed and active states |
| Gold | `#F59E0B` | Escrow and pending accumulation |
| Red | `#EF4444` | Errors only |
| White | `#FFFFFF` | Primary dark-theme text |
| Light background | `#F3F7F4` | Main light-theme background |
| Light text | `#132A2E` | Primary light-theme text |

### Visual language

- Use deep navy space-like backgrounds already present on the website.
- Use thin blue structural lines and teal active paths.
- Use green only for successful or active states.
- Use gold for escrow, reserved amounts, or a pending next step.
- Use purple for a second routed component where another color is needed.
- Keep diagrams flat, clean, and readable. Do not add decorative objects that obscure the structure.
- Wallets should be circles or compact nodes. Payment amounts should be separate labels, not embedded in long paragraphs.

## 2. Brand ideals

The website defines the brand around:

- Transparency: open communication, clear processes, visible information.
- Security: strong protection and trustworthy technology.
- Fairness: equal rules without favoritism.
- Participation: engagement creates value and opportunity.
- Predictability: rules and outcomes should be visible and understandable.
- Sustainability: the system is designed for long-term participation.
- Community: one network working through shared growth.

### Approved brand language

Use:

- “Together, we build freedom.”
- “One Network. One Community. One Freedom.”
- “Structure, participation, and transparency.”
- “Smart-contract powered and verifiable on-chain.”
- “Payments follow defined orbit rules.”

Avoid:

- Guaranteed income
- Risk-free profit
- Instant wealth
- Passive income without participation
- Any statement suggesting that registration alone guarantees earnings

## 3. Program map

There are ten levels. Prices double at every level.

| Level | Price | Engine |
|---:|---:|---|
| 1 | 10 USDT | P4 |
| 2 | 20 USDT | P12 |
| 3 | 40 USDT | P39 |
| 4 | 80 USDT | P4 |
| 5 | 160 USDT | P12 |
| 6 | 320 USDT | P39 |
| 7 | 640 USDT | P4 |
| 8 | 1,280 USDT | P12 |
| 9 | 2,560 USDT | P39 |
| 10 | 5,120 USDT | P4 |

The same engine structure repeats at its assigned levels. The amounts change with the level price.

## 4. Relationships viewers must understand

### Permanent sponsor

The permanent sponsor is the wallet used when a participant registers. This relationship does not change.

### Matrix parent

The matrix parent is the participant immediately above a wallet in a particular level’s orbit structure. It can differ from the permanent sponsor because placement can move through the matrix.

### Original placement

This is the participant’s real level activation position.

### Routed-payment placement

When part of an activation reaches another orbit owner, the same activating participant is shown in that recipient’s orbit as evidence of that payment. It does not mean the participant registered or purchased the level twice.

### Eligibility

A wallet can receive a component only when that exact level is active. If the structurally selected wallet is inactive, the contract searches upward through that wallet’s permanent sponsor chain until it finds an eligible wallet. If none exists, the component falls back to ID1.

## 5. P4 engine

P4 serves Levels 1, 4, 7, and 10.

### Structure

- One line
- Four sequential positions
- The fourth qualifying arrival completes the cycle
- A completed cycle is saved and a new cycle begins

### Standard allocation

- 90% participant-side allocation
- 10% system charge

When first-cycle automatic upgrade is active, some of the 90% may be locked toward the next level instead of being paid immediately. The fourth arrival’s participant allocation is used for recycle.

### Example at Level 1

Level price: 10 USDT

- Participant-side allocation: 9 USDT
- System charge: 1 USDT

P4 has no separate second or third spillover role.

## 6. P12 engine

P12 serves Levels 2, 5, and 8.

### Structure

- Line 1: positions 1, 2, 3
- Line 2 under position 1: positions 4, 7, 10
- Line 2 under position 2: positions 5, 8, 11
- Line 2 under position 3: positions 6, 9, 12

### Allocation

- One component: 40%
- One component: 50%
- System charge: 10%

Who receives 40% and 50% depends on the arrival line:

- Line 1 arrival: orbit owner receives 40%; the eligible structural upline receives 50%.
- Line 2 arrival: orbit owner receives or allocates 50%; the line-1 branch parent receives 40%.

During the first cycle, qualifying owner components may go to escrow for automatic upgrade. The final two qualifying line-2 arrivals reserve the 50% components for recycle. Recycle is released only when both required components are present.

### Amounts

| Level | 40% | 50% | 10% |
|---:|---:|---:|---:|
| 2 | 8 USDT | 10 USDT | 2 USDT |
| 5 | 64 USDT | 80 USDT | 16 USDT |
| 8 | 512 USDT | 640 USDT | 128 USDT |

## 7. P39 engine

P39 serves Levels 3, 6, and 9.

### Structure

- Line 1: positions 1–3
- Line 2: positions 4–12
- Line 3: positions 13–39

Line-2 parent groups:

- 4, 7, 10 are under position 1
- 5, 8, 11 are under position 2
- 6, 9, 12 are under position 3

Line-3 parent groups:

- 13, 22, 31 are under 4
- 14, 23, 32 are under 5
- 15, 24, 33 are under 6
- 16, 25, 34 are under 7
- 17, 26, 35 are under 8
- 18, 27, 36 are under 9
- 19, 28, 37 are under 10
- 20, 29, 38 are under 11
- 21, 30, 39 are under 12

### Allocation

- First component: 20%
- Second component: 20%
- Third component: 50%
- System charge: 10%

The owner can receive a 20% or 50% component depending on the activating participant’s line. Never combine the two separate 20% roles.

- Line 1: owner role is 20%; the next structural role receives 20%; the next structural role receives 50%.
- Line 2: owner or escrow role is 20%; the line-1 branch parent receives 20%; the next upper structural role receives 50%.
- Line 3: owner or recycle role is 50%; the line-2 parent receives 20%; the line-1 grandparent receives 20%.

The final two qualifying line-3 arrivals reserve the 50% components for recycle.

### Amounts

| Level | First 20% | Second 20% | 50% | 10% |
|---:|---:|---:|---:|---:|
| 3 | 8 USDT | 8 USDT | 20 USDT | 4 USDT |
| 6 | 64 USDT | 64 USDT | 160 USDT | 32 USDT |
| 9 | 512 USDT | 512 USDT | 1,280 USDT | 256 USDT |

## 8. Automatic upgrade and escrow

- Automatic upgrade applies only to the first cycle of an orbit.
- It applies only when the current level is active and the next level is still inactive.
- Defined qualifying components are locked in escrow toward the next level.
- The next level cannot activate before the exact requirement is reached.
- When the requirement is reached, the locked amount is released once and the next level activates.
- If the participant manually activates the next level first, existing escrow is released and cannot be consumed again.
- Level 10 has no next-level automatic upgrade.

## 9. Recycle

Recycle closes one completed cycle and begins a new one.

- P4 completes after four positions.
- P12 uses the final two qualifying line-2 arrivals to build its recycle amount.
- P39 uses the final two qualifying line-3 arrivals to build its recycle amount.
- The completed cycle remains available as history.
- Re-entry starts from the recycle owner’s permanent sponsor route.
- The re-entry uses the same P12 or P39 allocation rule as a new purchase at that level.
- The recycle owner cannot receive a component from their own repurchase.
- If a component would pay the recycle owner, that component falls back to ID1 without creating an artificial ID1 orbit position.
- If no eligible upline exists, settlement falls back to ID1.

## 10. ID1 fallback

ID1 is the terminal fallback, not the first choice.

- Normal structural recipients are evaluated first.
- An inactive candidate is skipped through the approved sponsor-chain eligibility search.
- The first wallet with the exact level active receives the component.
- ID1 receives the component only when the search has no eligible participant or when the approved recycle self-payment exception applies.
- A terminal ID1 fallback is distributed through the founder route.
- Terminal fallback does not create an artificial participant placement.

## 11. How to explain the system to a 12-year-old

Think of every orbit as a classroom seating chart.

When a new person activates a level, the smart contract gives that person the next correct seat. The seat determines which people are above them and how the payment travels.

P4 has four seats in one row. P12 has three seats in the first row and nine seats in the second row. P39 has three rows with 3, 9, and 27 seats.

Some payment parts stay with the owner of the chart. Other parts move to the correct person above the new seat. If that person has not opened the same level, the contract keeps checking upward until it finds someone who has.

Some early payments can be saved in escrow to open the next level automatically. The last two qualifying payments in P12 and P39 are saved together to buy the same level again and start a new cycle. That is called recycle.

Every visible earning must have a reason: a level, an activation, a payment role, and where required, a matching position.

## 12. Accuracy rules for video makers

- Always show the orbit owner above the numbered positions.
- Always show position numbers and line numbers.
- Never say that 40% always goes upward or 50% always belongs to the owner.
- Never merge P39’s two 20% components.
- Explain original placements and routed-payment placements as two views of one activation.
- Show recycle as a repurchase beginning through the permanent sponsor route.
- State that eligibility requires the exact level to be active.
- Do not describe escrow as cash already available in the participant’s wallet.
- Do not promise earnings. Payments depend on qualifying activity and the contract rules.

