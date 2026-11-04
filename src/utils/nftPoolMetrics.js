function amount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  if (!/^\d+(?:\.\d+)?$/.test(String(value))) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? String(value) : null
}

export function readNftPoolMetrics(payload) {
  const data = payload?.data?.public || {}
  const pool = data.nftRewardPool || {}
  const field = (name, alias) => Object.hasOwn(pool, name) ? pool[name] : data[alias]
  return {
    accumulated: amount(field('totalInflow', 'nftPoolAllocated')),
    current: field('balanceVerified', 'nftPoolBalanceVerified') === true
      ? amount(field('currentBalance', 'nftPoolLiveBalance')) : null,
    distributed: amount(field('totalDistributed', 'nftPoolDistributed')),
  }
}
