import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import babel from '@babel/core'
import { ethers } from 'ethers'

const source = readFileSync(new URL('../src/Pages/FreedomPlus/FreedomPlusPage.jsx', import.meta.url), 'utf8')
const ast = babel.parseSync(source, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } })
const functions = new Map()
babel.traverse(ast, {
  VariableDeclarator(path) {
    if (['ensureApproval', 'register', 'activate'].includes(path.node.id.name)) {
      functions.set(path.node.id.name, source.slice(path.node.init.start, path.node.init.end))
    }
  },
})
function bind(name, context) {
  return new Function(...Object.keys(context), 'return (' + functions.get(name) + ')')(...Object.values(context))
}
function harness(options = {}) {
  const calls = [], errors = []
  const registered = options.registered ?? false
  const read = {
    registration: {
      isRegistered: async () => registered,
      isLevelActive: async (_wallet, level) => options.previousActive !== false && level === 1,
    },
    usdt: { balanceOf: async () => options.balance ?? ethers.parseUnits('1000', 6) },
  }
  const contracts = {
    usdt: { allowance: async () => options.allowance ?? 0n, approve: 'approve' },
    registration: { register: 'register', activateLevel: 'activate' },
  }
  const context = {
    activationInFlight: { current: false }, busy: '', isConnected: true,
    account: '0xf0152a2490a854712fae8fd32ffcd9729082a09d',
    sponsor: '0x3a596f67585f27cfd7f449fec0a92b7bf34b1df5',
    networkReady: options.networkReady ?? true, NETWORK_CONFIG: { chainName: 'Polygon Amoy' },
    ZERO: ethers.ZeroAddress, ethers,
    FREEDOM_PLUS_ADDRESSES: { levelManager: '0x9dF6E3b6F37e67e6A0215683303a5cfFe9b1f177' },
    web3Service: { getReadContracts: () => ({ registration: { isLevelActivated: async () => options.gatewayActive !== false } }) },
    getFreedomPlusReadContracts: () => read, getFreedomPlusWriteContracts: () => contracts,
    tokenUnits: (value) => ethers.parseUnits(String(value), 6), formatToken: (value) => ethers.formatUnits(value, 6),
    setBusy: () => {}, setTxState: () => {}, load: async () => {},
    toast: { info: () => {}, success: () => {}, error: (error) => errors.push(error) },
    normalizeError: (error) => ({ message: error.message }), txErrorState: (error) => ({ error }),
    reconcileAfterWrite: async () => true,
    sendBuffered: async (method, args) => {
      calls.push({ method, args })
      if (method === 'approve' && options.rejectApproval) throw new Error('User rejected approval')
      return { hash: '0x1', wait: async () => {
        calls.push({ method: method + '-confirmed' })
        return { status: method === 'approve' && options.failedApproval ? 0 : 1 }
      } }
    },
  }
  context.ensureApproval = bind('ensureApproval', context)
  return { calls, errors, context, register: bind('register', context), activate: bind('activate', context) }
}

test('Level 1 goes from Activate through exact approval to registration without website confirmation', async () => {
  const h = harness()
  await h.register()
  assert.deepEqual(h.calls.map((x) => x.method), ['approve', 'approve-confirmed', 'register', 'register-confirmed'])
  assert.deepEqual(h.calls[0].args, [h.context.FREEDOM_PLUS_ADDRESSES.levelManager, ethers.parseUnits('50', 6)])
  assert.deepEqual(h.calls[2].args, [h.context.sponsor])
  assert.deepEqual(h.errors, [])
  assert.equal(h.context.activationInFlight.current, false)
})

test('existing sufficient allowance needs only the program transaction', async () => {
  const h = harness({ registered: true, allowance: ethers.parseUnits('150', 6) })
  await h.activate(2, 150)
  assert.deepEqual(h.calls.map((x) => x.method), ['activate', 'activate-confirmed'])
  assert.deepEqual(h.calls[0].args, [2])
})

test('rapid repeated clicks cannot send duplicate approvals or activations', async () => {
  const h = harness()
  await Promise.all([h.register(), h.register()])
  assert.equal(h.calls.filter((x) => x.method === 'register').length, 1)
  assert.equal(h.calls.filter((x) => x.method === 'approve').length, 1)
})

test('rejected or reverted approval never advances to activation', async () => {
  for (const options of [{ rejectApproval: true }, { failedApproval: true }]) {
    const h = harness(options)
    await h.register()
    assert.ok(h.errors.length)
    assert.ok(!h.calls.some((x) => x.method === 'register'))
    assert.equal(h.context.activationInFlight.current, false)
  }
})

test('network, F-Freedom gateway and exact balance checks precede all wallet writes', async () => {
  for (const options of [{ networkReady: false }, { gatewayActive: false }, { balance: 49999999n }]) {
    const h = harness(options)
    await h.register()
    assert.equal(h.calls.length, 0)
    assert.ok(h.errors.length)
    assert.equal(h.context.activationInFlight.current, false)
  }
})

test('already registered and missing previous-level state cannot trigger paid activation', async () => {
  const registered = harness({ registered: true })
  await registered.register()
  assert.equal(registered.calls.length, 0)
  const missingPrevious = harness({ registered: true, previousActive: false })
  await missingPrevious.activate(2, 150)
  assert.equal(missingPrevious.calls.length, 0)
  assert.ok(missingPrevious.errors.length)
})

test('the parent binds Activate directly and no longer opens an automatic review overlay', () => {
  assert.match(source, /onRegister=\{register\}/)
  assert.match(source, /onActivate=\{\(item\) => activate\(item.level, item.price\)\}/)
  assert.doesNotMatch(source, /pendingAction|prepareActionReview|onboardingPromptedAccount|How confirmation works/)
})
