import assert from 'node:assert/strict'
import test from 'node:test'
import { readNftPoolMetrics } from '../src/utils/nftPoolMetrics.js'
import { createCommunitySummaryStore } from '../src/Services/communitySummaryStore.js'

const summary = (pool = {}) => ({ ok: true, data: { public: { nftRewardPool: {
  totalInflow: '5133.44', currentBalance: '2621.52', totalDistributed: '2511.92', balanceVerified: true, ...pool,
} } } })

test('lifetime inflow, current assets and distributed rewards remain separate', () => {
  assert.deepEqual(readNftPoolMetrics(summary()), { accumulated: '5133.44', current: '2621.52', distributed: '2511.92' })
})

test('a payout reduces current assets without reducing lifetime inflow', () => {
  const before = readNftPoolMetrics(summary({ currentBalance: '5133.44', totalDistributed: '0' }))
  const after = readNftPoolMetrics(summary())
  assert.equal(after.accumulated, before.accumulated)
  assert.notEqual(after.current, before.current)
})

test('a deposit updates accumulated and current independently of past payouts', () => {
  assert.deepEqual(readNftPoolMetrics(summary({ totalInflow: '5233.44', currentBalance: '2721.52' })), {
    accumulated: '5233.44', current: '2721.52', distributed: '2511.92',
  })
})

test('reads a single ecosystem aggregate, not a sum of duplicate vault aliases', () => {
  const payload = summary()
  payload.data.public.nftPoolAllocated = '5133.44'
  payload.data.public.nftPoolLiveBalance = '2621.52'
  payload.data.public.nftPoolAddresses = ['shared-vault', 'shared-vault', 'legacy-vault']
  assert.equal(readNftPoolMetrics(payload).accumulated, '5133.44')
  assert.equal(readNftPoolMetrics(payload).current, '2621.52')
})

test('never fabricates a current balance from inflow minus distributions', () => {
  assert.equal(readNftPoolMetrics(summary({ currentBalance: null, balanceVerified: false })).current, null)
  assert.equal(readNftPoolMetrics(summary({ balanceVerified: false })).current, null)
  assert.equal(readNftPoolMetrics(summary({ balanceVerified: undefined })).current, null)
})

test('verified zero remains zero; explicit unavailable is not replaced by an alias', () => {
  const payload = summary({ totalInflow: '0.00', currentBalance: null })
  payload.data.public.nftPoolAllocated = '123'
  payload.data.public.nftPoolLiveBalance = '456'
  assert.deepEqual(readNftPoolMetrics(payload), { accumulated: '0.00', current: null, distributed: '2511.92' })
  assert.equal(readNftPoolMetrics(summary({ currentBalance: 0 })).current, '0')
})

test('supports public legacy field names only with a verified current balance', () => {
  assert.deepEqual(readNftPoolMetrics({ data: { public: {
    nftPoolAllocated: '100', nftPoolLiveBalance: '70', nftPoolDistributed: '30', nftPoolBalanceVerified: true,
  } } }), { accumulated: '100', current: '70', distributed: '30' })
})

test('no wallet earnings, locked token balance or program-only total can become a pool amount', () => {
  assert.deepEqual(readNftPoolMetrics({ data: { totals: { nftInflowRaw: '999000000' }, chain: { fgt: '900' } } }), {
    accumulated: null, current: null, distributed: null,
  })
})

for (const invalid of [undefined, null, '', ' ', 'NaN', 'Infinity', -1, true, {}, '1,234', '0x20']) {
  test(`rejects invalid money value ${String(invalid)}`, () => {
    const metrics = readNftPoolMetrics(summary({ totalInflow: invalid, currentBalance: invalid, totalDistributed: invalid }))
    assert.deepEqual(metrics, { accumulated: null, current: null, distributed: null })
  })
}

test('does not clamp a verified balance or infer rewards from balance changes', () => {
  assert.deepEqual(readNftPoolMetrics(summary({ currentBalance: '6000' })), {
    accumulated: '5133.44', current: '6000', distributed: '2511.92',
  })
})

test('concurrent views share one request and cached payload until expiry', async () => {
  let calls = 0
  let now = 100
  const payload = summary()
  const store = createCommunitySummaryStore(async () => { calls++; return payload }, { now: () => now, ttlMs: 15000 })
  const states = []
  const unsubscribe = store.subscribe(() => states.push(store.getSnapshot().status))
  const first = store.load()
  assert.equal(store.load(), first)
  assert.equal(store.load({ force: true }), first)
  assert.equal(await first, payload)
  assert.deepEqual(states, ['loading', 'ready'])
  assert.equal(await store.load(), payload)
  assert.equal(calls, 1)
  now += 15000
  await store.load()
  assert.equal(calls, 2)
  unsubscribe()
  const length = states.length
  await store.load({ force: true })
  assert.equal(calls, 3)
  assert.equal(states.length, length)
})

test('a failed refresh removes stale amounts and allows an explicit retry', async () => {
  let fail = false
  const store = createCommunitySummaryStore(async () => {
    if (fail) throw new Error('offline')
    return summary()
  })
  await store.load()
  fail = true
  await assert.rejects(store.load({ force: true }), /offline/)
  assert.deepEqual(store.getSnapshot(), { status: 'error', payload: null, updatedAt: null })
  fail = false
  await store.load()
  assert.equal(store.getSnapshot().status, 'ready')
})

test('rejects invalid successful HTTP payloads without caching them as balances', async () => {
  for (const payload of [{}, { ok: false, data: { public: {} } }]) {
    const store = createCommunitySummaryStore(async () => payload)
    await assert.rejects(store.load(), /Invalid community summary/)
    assert.equal(store.getSnapshot().status, 'error')
  }
})

test('expiry does not initiate polling or RPC reads without a caller', async () => {
  let calls = 0
  let now = 0
  const store = createCommunitySummaryStore(async () => { calls++; return summary() }, { now: () => now })
  await store.load()
  now = 1000000
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(calls, 1)
})
