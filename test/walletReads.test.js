import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequestGate, hasTokenBalance, optionalRead, retainedRead, skippedRead } from '../src/utils/walletReads.js'

test('activation checks use raw units, independent of Italian and other display locales', () => {
  for (const locale of ['it-IT', 'en-US', 'fr-FR', 'de-DE']) {
    const display = (59800).toLocaleString(locale)
    assert.equal(hasTokenBalance(59800000000n, 150000000n), true)
    assert.equal(hasTokenBalance(display, 150000000n), false)
  }
  assert.equal(Number((59800).toLocaleString('it-IT').replaceAll(',', '')) < 150, true)
})

test('balance checks reject unknown values and preserve micro-unit precision', () => {
  for (const balance of [null, undefined, '150', '150.00', 150, -1n]) {
    assert.equal(hasTokenBalance(balance, 150000000n), false)
  }
  assert.equal(hasTokenBalance(149999999n, 150000000n), false)
  assert.equal(hasTokenBalance(150000000n, 150000000n), true)
  assert.equal(hasTokenBalance(150000001n, 150000000n), true)
  assert.equal(hasTokenBalance(0n, 0n), false)
})

test('skipped reads preserve previously loaded balances without inventing zero', () => {
  assert.equal(retainedRead(skippedRead, '5100'), '5100')
  assert.equal(retainedRead(skippedRead, undefined), null)
})

test('a failed FPT read does not erase FGT', async () => {
  const [fgt, fpt] = await Promise.all([
    optionalRead(Promise.resolve(5100n)),
    optionalRead(Promise.reject(new Error('rate limited'))),
  ])
  assert.equal(retainedRead(fgt, null, String), '5100')
  assert.equal(retainedRead(fpt, '600', String), '600')
  assert.equal(retainedRead(fpt, undefined, String), null)
})

test('a verified zero replaces an earlier nonzero value', () => {
  assert.equal(retainedRead({ ok: true, value: 0n }, '600', String), '0')
})

test('an unrequested membership is not normalized into a nonexistent NFT', () => {
  let calls = 0
  assert.equal(retainedRead(skippedRead, undefined, () => { calls++; return { tier: 0 } }), null)
  assert.equal(calls, 0)
})

test('new requests reject older results, including a late old-wallet response', () => {
  const gate = createRequestGate()
  const oldWallet = gate.begin()
  const newWallet = gate.begin()
  assert.equal(oldWallet(), false)
  assert.equal(newWallet(), true)
  gate.cancel()
  assert.equal(newWallet(), false)
})

test('effect cleanup invalidates an otherwise latest response', () => {
  const gate = createRequestGate()
  const completion = gate.begin()
  gate.cancel()
  assert.equal(completion(), false)
  assert.equal(gate.begin()(), true)
})
