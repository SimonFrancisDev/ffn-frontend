const cycleDate = (value) => value
  ? new Date(value).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    })
  : 'Awaiting schedule'

export function nftCycleStatusCopy(membership, membershipVerified, status) {
  if (!membershipVerified) return { tone: 'pending', title: 'Eligibility verification pending', detail: 'Refresh to verify your live NFT membership.' }
  if (status?.excluded) return { tone: 'inactive', title: 'Not entitled to NFT rewards', detail: 'This wallet is excluded from NFT reward distributions until governance changes the rule.' }
  if (!membership.tier) return { tone: 'inactive', title: 'No Freedom NFT minted', detail: 'Mint a qualifying tier to enter a future reward cycle.' }
  if (!membership.rewardEligible) return { tone: 'inactive', title: 'NFT owned, rewards inactive', detail: 'Restore the exact qualifying token balance to enter a future cycle.' }
  if (!status) return { tone: 'pending', title: 'Cycle status unavailable', detail: 'Your NFT is active. Refresh to verify the upcoming reward cycle.' }
  if (status.eligibilityFrozen) {
    if (status.snapshotAvailable && status.eligible) {
      return { tone: 'eligible', title: `Eligible for Cycle ${status.cycleId}`, detail: `Qualification was fixed at ${cycleDate(status.cutoffAt)}. Distribution is scheduled for ${cycleDate(status.distributionAt)}.` }
    }
    if (status.snapshotAvailable) {
      return { tone: 'next', title: `Eligible from Cycle ${status.appliesToCycleId}`, detail: `Cycle ${status.cycleId} qualification is already fixed. This active NFT applies to the next 30-day cycle.` }
    }
    return { tone: 'pending', title: 'Cutoff snapshot is being verified', detail: `Cycle ${status.cycleId} qualification is fixed. New membership changes apply to Cycle ${status.appliesToCycleId}.` }
  }
  return { tone: 'eligible', title: `On track for Cycle ${status.cycleId}`, detail: `Maintain this qualifying balance through ${cycleDate(status.cutoffAt)}. Distribution is scheduled for ${cycleDate(status.distributionAt)}.` }
}
