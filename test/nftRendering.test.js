import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformSync } from 'esbuild'
import { formatUnits } from 'ethers'
import * as qualification from '../src/utils/nftQualification.js'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/Pages/FreedomPlus/FreedomNftPages.jsx', import.meta.url), 'utf8')
const compiled = transformSync(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code
const module = { exports: {} }
const tiers = [{ tier: 1, name: 'Foundational', threshold: 5700, poolShare: 50 }]
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === '../../Services/freedomPlus') return { NFT_TIERS: tiers }
  if (name === '../../utils/nftQualification.js') return qualification
  return require(name)
}, module, module.exports)
const { FreedomNftMembership, FreedomNftRewards } = module.exports
const empty = { tier: 0, lockedFGT: 0n, lockedFPT: 0n, rewardEligible: false }
const mixed = { tier: 1, lockedFGT: 5100000000n, lockedFPT: 600000000n, rewardEligible: true }
const noop = () => {}
const defaults = {
  membership: empty, membershipVerified: false, actionsReady: false,
  formatToken: (n) => formatUnits(n, 6),
  nftForm: { tier: 1, fgt: '0', fpt: '5700' }, setNftForm: noop,
  unlockForm: { fgt: '0', fpt: '0' }, setUnlockForm: noop, busy: '',
  submitMembership: noop, unlockQualification: noop, restoreEligibility: noop,
}
const render = (props) => renderToStaticMarkup(createElement(FreedomNftMembership, { ...defaults, ...props }))
const buttons = (html) => html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []

test('an unknown membership renders neither false ownership nor a verified zero balance', () => {
  const html = render({})
  assert.match(html, /Status unavailable/)
  assert.match(html, /Available FGT: Temporarily unavailable/)
  assert.match(html, /Available FPT: Temporarily unavailable/)
  assert.doesNotMatch(html, /NFT owned, rewards inactive|Active and reward eligible/)
  assert.match(buttons(html).find((b) => b.includes('Mint membership')), /disabled=""/)
})

test('a verified empty membership is not described as an owned NFT', () => {
  const html = render({ membershipVerified: true, actionsReady: true })
  assert.match(html, /No NFT minted/)
  assert.doesNotMatch(html, /NFT owned, rewards inactive/)
})

test('mixed FGT and FPT commitment and independent available balances render together', () => {
  const html = render({ membership: mixed, membershipVerified: true, actionsReady: true, balances: { fgt: '100', fpt: '200' } })
  assert.match(html, /5100.0 FGT \+ 600.0 FPT = 5700.0 qualifying tokens/)
  assert.match(html, /Available FGT: 100/)
  assert.match(html, /Available FPT: 200/)
})

test('a failed FPT read keeps successful FGT visible with an explicit unavailable FPT', () => {
  const html = render({ membership: mixed, membershipVerified: true, balances: { fgt: '100', fpt: null }, readIssues: ['FPT available'] })
  assert.match(html, /Available FGT: 100/)
  assert.match(html, /Available FPT: Temporarily unavailable/)
})

test('unknown cached membership cannot enable unlock or restore actions', () => {
  for (const rewardEligible of [true, false]) {
    const html = render({ membership: { ...mixed, rewardEligible }, membershipVerified: false, actionsReady: false })
    const label = rewardEligible ? 'Continue to wallet' : 'Restore eligibility'
    assert.match(buttons(html).find((b) => b.includes(label)), /disabled=""/)
  }
})

test('failed reward history does not claim no published periods exist', () => {
  const html = renderToStaticMarkup(createElement(FreedomNftRewards, {
    membership: empty, membershipVerified: false, rewardPeriodsVerified: false,
    rewardPeriods: [], formatToken: defaults.formatToken, busy: '', claimReward: noop,
  }))
  assert.match(html, /Reward history awaiting verification/)
  assert.doesNotMatch(html, /No reward period is available yet/)
})
