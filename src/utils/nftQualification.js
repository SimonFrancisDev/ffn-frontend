import { formatUnits, parseUnits } from 'ethers'

export const formatQualificationAmount = (value) => formatUnits(value, 6)

export function qualificationPreview({ lockedFGT, lockedFPT, fgt, fpt, threshold }) {
  const base = {
    requestedTotal: 0n, remainingFgt: lockedFGT, remainingFpt: lockedFPT,
    remainingTotal: lockedFGT + lockedFPT, threshold: parseUnits(String(threshold), 6),
    eligible: false, valid: false,
  }
  try {
    const requestedFgt = parseUnits(String(fgt || 0), 6)
    const requestedFpt = parseUnits(String(fpt || 0), 6)
    if (requestedFgt < 0n || requestedFpt < 0n) return base
    const valid = requestedFgt <= lockedFGT && requestedFpt <= lockedFPT
    const remainingFgt = requestedFgt <= lockedFGT ? lockedFGT - requestedFgt : 0n
    const remainingFpt = requestedFpt <= lockedFPT ? lockedFPT - requestedFpt : 0n
    return {
      ...base, requestedTotal: requestedFgt + requestedFpt, remainingFgt, remainingFpt,
      remainingTotal: remainingFgt + remainingFpt, valid,
      eligible: valid && remainingFgt + remainingFpt >= base.threshold,
    }
  } catch {
    return base
  }
}
