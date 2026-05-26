import Onboard from '@web3-onboard/core'
import injectedModule from '@web3-onboard/injected-wallets'
import { DECIMAL_CHAIN_ID, NETWORK_CONFIG } from '../constants/addresses'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

const injected = injectedModule({
  displayUnavailable: ['MetaMask', 'Trust Wallet', 'Coinbase Wallet'],
})

const walletModules = [injected]

export const hasWalletConnectSupport = Boolean(walletConnectProjectId)

export async function connectWalletConnectProvider() {
  if (!walletConnectProjectId) {
    throw new Error('WalletConnect is not configured. Set VITE_WALLETCONNECT_PROJECT_ID.')
  }

  const { EthereumProvider } = await import(
    /* @vite-ignore */ 'https://esm.sh/@walletconnect/ethereum-provider@2.21.10'
  )

  const provider = await EthereumProvider.init({
    projectId: walletConnectProjectId,
    chains: [DECIMAL_CHAIN_ID],
    optionalChains: [DECIMAL_CHAIN_ID],
    showQrModal: true,
    rpcMap: {
      [DECIMAL_CHAIN_ID]: NETWORK_CONFIG.rpcUrls[0],
    },
    metadata: {
      name: 'Fin Freedom',
      description: 'Fin Freedom Network wallet connection',
      url:
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://finfreedom.network',
      icons:
        typeof window !== 'undefined'
          ? [`${window.location.origin}/images/official_logo.png`]
          : ['https://finfreedom.network/images/official_logo.png'],
    },
  })

  await provider.connect()

  return {
    label: 'WalletConnect',
    provider,
    accounts: (provider.accounts || []).map((address) => ({ address })),
    chains: [{ id: NETWORK_CONFIG.chainId, namespace: 'evm' }],
  }
}

export const walletOnboard = Onboard({
  wallets: walletModules,
  chains: [
    {
      id: NETWORK_CONFIG.chainId,
      token: NETWORK_CONFIG.nativeCurrency.symbol,
      label: NETWORK_CONFIG.chainName,
      rpcUrl: NETWORK_CONFIG.rpcUrls[0],
    },
  ],
  appMetadata: {
    name: 'Fin Freedom',
    description: 'Fin Freedom Network wallet connection',
    icon: '/images/official_logo.png',
  },
  connect: {
    autoConnectLastWallet: true,
    showSidebar: false,
    iDontHaveAWalletLink: 'https://walletconnect.com/explorer',
  },
  accountCenter: {
    desktop: { enabled: false },
    mobile: { enabled: false },
  },
  notify: {
    desktop: { enabled: false },
    mobile: { enabled: false },
  },
})
