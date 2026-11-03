import test from 'node:test'
import assert from 'node:assert/strict'
import { Interface } from 'ethers'
import { verifyNftReceipt, formatReceiptAmount, formatReceiptWallet } from '../src/utils/nftReceipt.js'
import { receiptFilename } from '../src/utils/nftReceiptImage.js'

const wallet = '0x1111111111111111111111111111111111111111'
const address = '0x2222222222222222222222222222222222222222'
const vault = '0x3333333333333333333333333333333333333333'
const token = '0x4444444444444444444444444444444444444444'
const other = '0x5555555555555555555555555555555555555555'
const txHash = `0x${'a'.repeat(64)}`
const blockHash = `0x${'b'.repeat(64)}`
const rewards = new Interface(['event RewardClaimed(uint32 indexed periodId,address indexed member,uint8 indexed tier,uint256 amount)'])
const transfers = new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)'])
const claim = (member = wallet, tier = 1, amount = 627980001n) => ({ address, ...rewards.encodeEventLog('RewardClaimed', [1, member, tier, amount]) })
const transfer = (from = vault, to = wallet, amount = 627980001n) => ({ address: token, ...transfers.encodeEventLog('Transfer', [from, to, amount]) })

function fixture() {
  const event = { chainId: 137, contractAddress: address, eventName: 'RewardClaimed', txHash, args: { periodId: '1', member: wallet } }
  const receipt = { hash: txHash, status: 1, blockNumber: 100, blockHash, logs: [claim(), transfer(), claim(other), transfer(vault, other)] }
  const cycle = { created: true, distributionAt: 1793577600n, rewardPerMember: [627980001n, 999000000n, 1n] }
  const params = {
    wallet, chainId: '0x89', tokenAddress: token, ffnId: 'FFN-ABC123',
    period: { periodId: 1, status: 'published', claimed: true, reward: 123n, proof: { tier: 3 } },
    loadEvents: async () => ({ items: [event], page: 1, limit: 50, total: 1 }),
    provider: {
      send: async () => '0x89', getTransactionReceipt: async () => receipt,
      getBlock: async () => ({ hash: blockHash, timestamp: 1793595600 }), getBlockNumber: async () => 102,
    },
    distributor: {
      getAddress: async () => address, vault: async () => vault, rewardToken: async () => token,
      periodOf: async () => cycle, claimed: async () => true,
    },
  }
  return { params, event, receipt, cycle }
}

test('receipt uses actual transfer amount, historical tier and paid timestamp, not UI estimates', async () => {
  const { params } = fixture()
  const result = await verifyNftReceipt(params)
  assert.equal(result.amount, '627.980001')
  assert.equal(result.amountRaw, '627980001')
  assert.equal(result.tierName, 'Foundational')
  assert.equal(result.wallet, wallet)
  assert.equal(result.ffnId, 'FFN-ABC123')
  assert.equal(result.paidAt, '2026-11-02T05:00:00.000Z')
  assert.equal(result.distributionAt, '2026-11-02T00:00:00.000Z')
  assert.equal(result.explorerUrl, `https://polygonscan.com/tx/${txHash}`)
})

test('wallet display uses six leading characters, six stars and seven trailing characters without dots', () => {
  assert.equal(formatReceiptWallet(wallet), '0x1111******1111111')
  assert.equal(formatReceiptWallet('0x1234567890abcdef1234567890abcdef12345AbC'), '0x1234******2345AbC')
})

test('masking does not change the verified wallet or transaction link', async () => {
  const { params } = fixture()
  const result = await verifyNftReceipt(params)
  assert.equal(formatReceiptWallet(result.wallet), '0x1111******1111111')
  assert.equal(result.wallet, wallet)
  assert.equal(result.explorerUrl, `https://polygonscan.com/tx/${txHash}`)
})

test('receipt filenames never fall back to the full wallet address', () => {
  assert.equal(receiptFilename({ periodId: '1', ffnId: 'FFN-ABC123', wallet }), 'freedom-nft-cycle-1-FFN-ABC123.png')
  assert.equal(receiptFilename({ periodId: '1', ffnId: '', wallet }), 'freedom-nft-cycle-1-receipt.png')
})

test('all contract reads are pinned to the payout block', async () => {
  const { params, cycle } = fixture()
  params.distributor.vault = async options => { assert.equal(options.blockTag, 100); return vault }
  params.distributor.rewardToken = async options => { assert.equal(options.blockTag, 100); return token }
  params.distributor.periodOf = async (id, options) => { assert.equal(id, 1); assert.equal(options.blockTag, 100); return cycle }
  params.distributor.claimed = async (id, member, options) => { assert.equal(member, wallet); assert.equal(options.blockTag, 100); return true }
  await verifyNftReceipt(params)
})

const invalid = [
  ['wrong network', f => { f.params.provider.send = async () => '0x13882' }, /network/],
  ['unpaid cycle', f => { f.params.period.claimed = false }, /Payment pending/],
  ['draft cycle', f => { f.params.period.status = 'draft' }, /Payment pending/],
  ['missing indexed event', f => { f.params.loadEvents = async () => ({ items: [], limit: 50, total: 0 }) }, /still syncing/],
  ['wrong indexed deployment', f => { f.event.contractAddress = other }, /still syncing/],
  ['wrong indexed chain', f => { f.event.chainId = 80002 }, /still syncing/],
  ['wrong indexed wallet', f => { f.event.args.member = other }, /still syncing/],
  ['reverted transaction', f => { f.receipt.status = 0 }, /not confirmed/],
  ['unmined transaction', f => { f.params.provider.getTransactionReceipt = async () => null }, /not confirmed/],
  ['wrong returned receipt', f => { f.receipt.hash = blockHash }, /not confirmed/],
  ['reorg', f => { f.receipt.blockHash = txHash }, /confirmations/],
  ['insufficient confirmations', f => { f.params.provider.getBlockNumber = async () => 100 }, /confirmations/],
  ['wrong reward token', f => { f.params.distributor.rewardToken = async () => other }, /configured NFT/],
  ['unpublished period', f => { f.cycle.created = false }, /configured NFT/],
  ['unclaimed at payment block', f => { f.params.distributor.claimed = async () => false }, /configured NFT/],
  ['missing wallet claim', f => { f.receipt.logs = [claim(other), transfer()] }, /unique NFT payment/],
  ['duplicate claim', f => { f.receipt.logs.push(claim()) }, /unique NFT payment/],
  ['claim from another contract', f => { f.receipt.logs[0].address = other }, /unique NFT payment/],
  ['amount mismatch', f => { f.cycle.rewardPerMember[0] = 3n }, /amount/],
  ['invalid tier', f => { f.receipt.logs[0] = claim(wallet, 4) }, /amount/],
  ['zero payout', f => { f.receipt.logs[0] = claim(wallet, 1, 0n) }, /amount/],
  ['no actual transfer', f => { f.receipt.logs = [claim()] }, /USDT transfer/],
  ['wrong transfer recipient', f => { f.receipt.logs = [claim(), transfer(vault, other)] }, /USDT transfer/],
  ['wrong transfer sender', f => { f.receipt.logs = [claim(), transfer(other)] }, /USDT transfer/],
  ['wrong transfer amount', f => { f.receipt.logs = [claim(), transfer(vault, wallet, 1n)] }, /USDT transfer/],
  ['RPC unavailable', f => { f.params.provider.getBlock = async () => { throw new Error('offline') } }, /offline/],
]
for (const [name, mutate, message] of invalid) test(`no payment receipt for ${name}`, async () => {
  const f = fixture()
  mutate(f)
  await assert.rejects(verifyNftReceipt(f.params), message)
})

test('older cycles use paginated API events without a chain-wide log scan', async () => {
  const { params, event } = fixture()
  const pages = []
  params.loadEvents = async page => {
    pages.push(page)
    return { items: page === 1 ? [{ ...event, args: { ...event.args, periodId: '2' } }] : [event], limit: 1, total: 2 }
  }
  await verifyNftReceipt(params)
  assert.deepEqual(pages, [1, 2])
})

test('testnet receipt is explicitly marked and cannot use a mainnet explorer', async () => {
  const { params, event } = fixture()
  params.chainId = event.chainId = 80002
  params.provider.send = async () => '0x13882'
  const result = await verifyNftReceipt(params)
  assert.match(result.network, /TESTNET/)
  assert.match(result.explorerUrl, /^https:\/\/amoy\./)
})

test('receipt amounts retain all six decimals without floating-point rounding', () => {
  assert.equal(formatReceiptAmount('627980000'), '627.98')
  assert.equal(formatReceiptAmount('1'), '0.000001')
  assert.equal(formatReceiptAmount('1000000'), '1.00')
  assert.equal(formatReceiptAmount('9007199254740993123456'), '9,007,199,254,740,993.123456')
})
