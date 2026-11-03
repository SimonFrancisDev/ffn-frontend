import { Interface, getAddress, formatUnits } from 'ethers'

const rewards = new Interface(['event RewardClaimed(uint32 indexed periodId,address indexed member,uint8 indexed tier,uint256 amount)'])
const tokens = new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)'])
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase()
const hashPattern = /^0x[0-9a-f]{64}$/i
const tierNames = ['Foundational', 'Intermediate', 'Advanced']

export const formatReceiptWallet = (wallet) => `${wallet.slice(0, 5)}***${wallet.slice(-3)}...`

export function formatReceiptAmount(raw) {
  const [whole, fraction = ''] = formatUnits(raw, 6).split('.')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`
}

export const receiptDate = (value) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  second: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
})

function decodedLogs(logs, address, iface) {
  return logs.filter(log => same(log.address, address)).flatMap(log => {
    try { const parsed = iface.parseLog(log); return parsed ? [parsed] : [] } catch { return [] }
  })
}

// The index supplies a transaction locator only. The receipt, contract state and token
// transfer must agree before any shareable payment claim is created.
export async function verifyNftReceipt({ provider, distributor, tokenAddress, chainId, wallet, period, ffnId, loadEvents }) {
  const member = getAddress(wallet)
  const expectedChain = Number(chainId)
  if (![137, 80002].includes(expectedChain)) throw new Error('Unsupported receipt network.')
  if (period.status !== 'published' || period.claimed !== true) throw new Error('Payment pending. A receipt is available after payment confirms.')
  if (Number(await provider.send('eth_chainId', [])) !== expectedChain) throw new Error('Receipt network does not match this site. Please retry later.')
  const address = await distributor.getAddress()
  let event
  for (let page = 1; page <= 20; page += 1) {
    const result = await loadEvents(page)
    event = (result.items || []).find(item => Number(item.chainId) === expectedChain &&
      same(item.contractAddress, address) && item.eventName === 'RewardClaimed' &&
      String(item.args?.periodId) === String(period.periodId) && same(item.args?.member, member))
    if (event || !result.items?.length || page * result.limit >= result.total) break
  }
  if (!event || !hashPattern.test(event.txHash)) throw new Error('Payment record is still syncing. Please retry shortly; no receipt has been generated.')
  const transaction = await provider.getTransactionReceipt(event.txHash)
  if (!transaction || Number(transaction.status) !== 1 || !same(transaction.hash, event.txHash)) throw new Error('Payment transaction is not confirmed. Please retry shortly.')
  const blockTag = transaction.blockNumber
  const [block, head, vault, token, cycle, claimed] = await Promise.all([
    provider.getBlock(blockTag), provider.getBlockNumber(),
    distributor.vault({ blockTag }), distributor.rewardToken({ blockTag }),
    distributor.periodOf(period.periodId, { blockTag }), distributor.claimed(period.periodId, member, { blockTag }),
  ])
  if (!block || !same(block.hash, transaction.blockHash) || head < blockTag + 1) throw new Error('Waiting for payment confirmations. Please retry shortly.')
  if (!same(token, tokenAddress) || !cycle.created || !claimed) throw new Error('Payment verification does not match the configured NFT program.')
  const claims = decodedLogs(transaction.logs, address, rewards).filter(log =>
    String(log.args.periodId) === String(period.periodId) && same(log.args.member, member))
  if (claims.length !== 1) throw new Error('A unique NFT payment could not be verified for this wallet and cycle.')
  const claim = claims[0].args
  const tier = Number(claim.tier)
  if (tier < 1 || tier > 3 || claim.amount <= 0n || claim.amount !== BigInt(cycle.rewardPerMember[tier - 1])) throw new Error('NFT payment amount does not match the published cycle.')
  const transfers = decodedLogs(transaction.logs, token, tokens).filter(log =>
    same(log.args.from, vault) && same(log.args.to, member) && log.args.value === claim.amount)
  if (!transfers.length) throw new Error('The matching USDT transfer to this wallet could not be verified.')
  return Object.freeze({
    chainId: expectedChain, network: expectedChain === 137 ? 'Polygon mainnet' : 'Polygon Amoy TESTNET',
    wallet: member, ffnId: /^FFN-[A-Z0-9]+$/i.test(ffnId || '') ? ffnId.toUpperCase() : '',
    periodId: String(period.periodId), tier, tierName: tierNames[tier - 1],
    amountRaw: claim.amount.toString(), amount: formatReceiptAmount(claim.amount),
    paidAt: new Date(Number(block.timestamp) * 1000).toISOString(),
    distributionAt: new Date(Number(cycle.distributionAt) * 1000).toISOString(),
    txHash: transaction.hash, blockNumber: blockTag, distributor: getAddress(address), token: getAddress(token),
    explorerUrl: `https://${expectedChain === 137 ? '' : 'amoy.'}polygonscan.com/tx/${transaction.hash}`,
  })
}
