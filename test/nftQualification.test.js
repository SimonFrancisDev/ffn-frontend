import test from 'node:test'
import assert from 'node:assert/strict'
import { parseUnits } from 'ethers'
import { qualificationPreview, formatQualificationAmount } from '../src/utils/nftQualification.js'

const units = (n) => parseUnits(String(n), 6)
const preview = (fgt, fpt, overrides = {}) => qualificationPreview({
  lockedFGT: units(5100), lockedFPT: units(600), threshold: 5700, fgt, fpt, ...overrides,
})

test('Sabina mixed-token unlock leaves 100 FGT and 600 FPT, ineligible', () => {
  const result = preview('5000', '0')
  assert.equal(result.valid, true)
  assert.equal(result.eligible, false)
  assert.equal(result.remainingFgt, units(100))
  assert.equal(result.remainingFpt, units(600))
  assert.equal(result.remainingTotal, units(700))
})

test('micro-unit precision is not rounded into a valid excessive unlock', () => {
  assert.equal(preview('5100.000001', '0').valid, false)
  const result = preview('0.000001', '0')
  assert.equal(result.remainingFgt, 5099999999n)
  assert.equal(formatQualificationAmount(result.remainingFgt), '5099.999999')
  assert.equal(result.eligible, false)
})

test('invalid and negative amounts cannot become a valid preview', () => {
  for (const amount of ['-1', 'abc', '1e3', '0.0000001', 'Infinity']) {
    assert.equal(preview(amount, '0').valid, false, amount)
  }
})

test('zero, FGT-only and FPT-only commitments preserve exact eligibility', () => {
  assert.equal(preview('', '').eligible, true)
  assert.equal(preview('0','0',{ lockedFGT: units(5700), lockedFPT: 0n }).eligible, true)
  assert.equal(preview('0','5700',{ lockedFGT: 0n, lockedFPT: units(5700) }).remainingTotal, 0n)
})

test('large amounts retain integer accuracy', () => {
  const result = preview('0.000001', '0', { lockedFGT: units('9007199254740993') })
  assert.equal(result.remainingFgt, units('9007199254740993') - 1n)
})
