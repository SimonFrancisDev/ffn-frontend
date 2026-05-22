import { ethers } from 'ethers'

const DEFAULT_MIN_PRIORITY_FEE_GWEI = 260
const DEFAULT_MIN_MAX_FEE_GWEI = 320

function getEnvNumber(name, fallback) {
  const value = Number(import.meta.env?.[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function maxBigInt(...values) {
  return values.reduce((max, value) => (value > max ? value : max), 0n)
}

export async function buildTxOptions({
  signer,
  gasLimit,
  priorityMultiplierBps = 10000,
} = {}) {
  if (!signer?.provider) {
    return gasLimit ? { gasLimit } : {}
  }

  const minPriorityFee = ethers.parseUnits(
    String(getEnvNumber('VITE_MIN_PRIORITY_FEE_GWEI', DEFAULT_MIN_PRIORITY_FEE_GWEI)),
    'gwei'
  )
  const minMaxFee = ethers.parseUnits(
    String(getEnvNumber('VITE_MIN_MAX_FEE_GWEI', DEFAULT_MIN_MAX_FEE_GWEI)),
    'gwei'
  )

  const feeData = await signer.provider.getFeeData().catch(() => null)
  const networkPriorityFee = feeData?.maxPriorityFeePerGas || feeData?.gasPrice || 0n
  const networkMaxFee = feeData?.maxFeePerGas || feeData?.gasPrice || 0n
  const boostedPriorityFee = (networkPriorityFee * BigInt(priorityMultiplierBps)) / 10000n
  const maxPriorityFeePerGas = maxBigInt(boostedPriorityFee, minPriorityFee)
  const maxFeePerGas = maxBigInt(
    networkMaxFee,
    maxPriorityFeePerGas * 2n,
    minMaxFee
  )

  return {
    ...(gasLimit ? { gasLimit } : {}),
    maxPriorityFeePerGas,
    maxFeePerGas,
  }
}
