export const CONTRACT_ADDRESSES = {
  USDT: import.meta.env.VITE_USDT_ADDRESS,
  ESCROW: import.meta.env.VITE_ESCROW_ADDRESS,
  REGISTRATION: import.meta.env.VITE_REGISTRATION_ADDRESS,
  LEVEL_MANAGER:
    import.meta.env.VITE_LEVEL_MANAGER_ADDRESS ||
    import.meta.env.VITE_LEVELMANAGER_ADDRESS,

  // Reusable orbit contracts
  P4_ORBIT: import.meta.env.VITE_P4_ORBIT_ADDRESS, // Levels 1, 4, 7, 10
  P12_ORBIT: import.meta.env.VITE_P12_ORBIT_ADDRESS, // Levels 2, 5, 8
  P39_ORBIT: import.meta.env.VITE_P39_ORBIT_ADDRESS, // Levels 3, 6, 9

  // Token reward layer
  FGT_TOKEN: import.meta.env.VITE_FGT_TOKEN_ADDRESS,
  FGTR_TOKEN: import.meta.env.VITE_FGTR_TOKEN_ADDRESS,
  FREEDOM_TOKEN_CONTROLLER: import.meta.env.VITE_FREEDOM_TOKEN_CONTROLLER_ADDRESS,

  // Governance
  MULTISIG: import.meta.env.VITE_MULTISIG_ADDRESS,
  GUARDIAN: import.meta.env.VITE_GUARDIAN_ADDRESS
}

const requireEnv = (name, fallbackName = '') => {
  const value = import.meta.env[name] || (fallbackName ? import.meta.env[fallbackName] : '')
  if (!value) throw new Error(`${name} is required`)
  return value
}

const normalizeHexChainId = (value) => {
  const raw = String(value || '').trim()
  if (!raw) throw new Error('VITE_CHAIN_ID is required')
  if (/^0x[0-9a-f]+$/i.test(raw)) return raw.toLowerCase()
  const numeric = Number(raw)
  if (!Number.isInteger(numeric) || numeric <= 0) throw new Error('VITE_CHAIN_ID must be a positive chain id')
  return `0x${numeric.toString(16)}`
}

const chainId = normalizeHexChainId(requireEnv('VITE_CHAIN_ID', 'VITE_NETWORK_CHAIN_ID'))
const isMainnet = chainId === '0x89'

export const NETWORK_CONFIG = {
  chainId,
  chainName: requireEnv('VITE_CHAIN_NAME'),
  nativeCurrency: {
    name: requireEnv('VITE_NATIVE_CURRENCY_NAME'),
    symbol: requireEnv('VITE_NATIVE_CURRENCY_SYMBOL'),
    decimals: Number(requireEnv('VITE_NATIVE_CURRENCY_DECIMALS'))
  },
  rpcUrls: [requireEnv('VITE_RPC_URL')],
  blockExplorerUrls: [requireEnv('VITE_BLOCK_EXPLORER_URL')]
}

export const AMOY_CHAIN_ID = NETWORK_CONFIG.chainId
export const CHAIN_ID = NETWORK_CONFIG.chainId
export const DECIMAL_CHAIN_ID = Number.parseInt(NETWORK_CONFIG.chainId, 16)

export const ORBIT_LEVEL_MAP = {
  1: 'P4',
  2: 'P12',
  3: 'P39',
  4: 'P4',
  5: 'P12',
  6: 'P39',
  7: 'P4',
  8: 'P12',
  9: 'P39',
  10: 'P4'
}

export const CONTRACT_LABELS = {
  ESCROW: 'AutoUpgrade Escrow',
  REGISTRATION: 'Registration',
  LEVEL_MANAGER: 'Level Manager',
  P4_ORBIT: 'P4 Orbit',
  P12_ORBIT: 'P12 Orbit',
  P39_ORBIT: 'P39 Orbit',
  FGT_TOKEN: 'FGT Token',
  FGTR_TOKEN: 'FGTr Token',
  FREEDOM_TOKEN_CONTROLLER: 'Freedom Token Controller',
  MULTISIG: 'Simple MultiSig',
  GUARDIAN: 'Guardian'
}
