import { createContext, createElement, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'
import { web3Service } from '../Services/web3'
import { AMOY_CHAIN_ID, NETWORK_CONFIG } from '../constants/addresses'
import {
  connectWalletConnectProvider,
  hasWalletConnectSupport,
  walletOnboard,
} from '../Services/walletOnboard'

const WalletContext = createContext(null)

const useWalletState = () => {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [walletLabel, setWalletLabel] = useState('')
  const [activeProvider, setActiveProvider] = useState(null)

  const refreshBalance = useCallback(async (address) => {
    try {
      if (!address) return

      const provider = web3Service.getReadProvider()
      const rawBalance = await provider.getBalance(address)
      setBalance(ethers.formatEther(rawBalance))
    } catch (err) {
      console.error('Error refreshing balance:', err)
    }
  }, [])

  const resetWalletState = useCallback(() => {
    web3Service.resetWallet()
    setAccount(null)
    setBalance(null)
    setIsConnected(false)
    setWalletLabel('')
    setActiveProvider(null)
  }, [])

  const resolveWalletAddress = (wallet) => {
    const address = wallet?.accounts?.[0]?.address
    return address ? ethers.getAddress(address) : null
  }

  const activateWallet = useCallback(
    async (wallet) => {
      const address = resolveWalletAddress(wallet)
      if (!wallet?.provider || !address) {
        resetWalletState()
        return
      }

      await web3Service.initWallet({
        provider: wallet.provider,
        requestAccounts: false,
      })

      setActiveProvider(wallet.provider)
      setWalletLabel(wallet.label || 'Wallet')
      setAccount(address)
      setIsConnected(true)
      await refreshBalance(address)
    },
    [refreshBalance, resetWalletState]
  )

  const switchToConfiguredNetwork = useCallback(async () => {
    const provider = activeProvider || web3Service.getEip1193Provider() || window.ethereum
    if (!provider?.request) return false

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AMOY_CHAIN_ID }]
      })
      return true
    } catch (err) {
      if (err.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG]
          })
          return true
        } catch (addErr) {
          console.error('Error adding configured network:', addErr)
          return false
        }
      }

      console.error('Error switching network:', err)

      try {
        await walletOnboard.setChain({ chainId: AMOY_CHAIN_ID })
        return true
      } catch (setChainErr) {
        console.error('Error setting Onboard chain:', setChainErr)
        return false
      }
    }
  }, [activeProvider])

  const connect = useCallback(async () => {
    if (!hasWalletConnectSupport && !window.ethereum) {
      setError('No browser wallet detected. Configure WalletConnect to support mobile browser connections.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const connectedWallets = window.ethereum
        ? await walletOnboard.connectWallet()
        : [await connectWalletConnectProvider()]
      const wallet = connectedWallets?.[0]

      if (!wallet?.provider) {
        throw new Error('No wallet selected')
      }

      const chainId = await wallet.provider.request({ method: 'eth_chainId' })

      if (chainId?.toLowerCase() !== AMOY_CHAIN_ID.toLowerCase()) {
        setActiveProvider(wallet.provider)
        const switched = await switchToConfiguredNetwork()
        if (!switched) {
          throw new Error(`Please switch to ${NETWORK_CONFIG.chainName} manually`)
        }
        await new Promise(resolve => setTimeout(resolve, 700))
      }

      const provider = new ethers.BrowserProvider(wallet.provider)
      const accounts = await provider.send('eth_requestAccounts', [])

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account found')
      }

      await activateWallet(wallet)
    } catch (err) {
      console.error('Connection error:', err)
      setError(err?.reason || err?.message || 'Wallet connection failed')
    } finally {
      setIsLoading(false)
    }
  }, [activateWallet, switchToConfiguredNetwork])

  const disconnect = useCallback(async () => {
    const connectedWallets = walletOnboard.state.get().wallets || []
    await Promise.all(
      connectedWallets.map((wallet) =>
        walletOnboard.disconnectWallet({ label: wallet.label }).catch((err) => {
          console.error('Wallet disconnect failed:', err)
        })
      )
    )

    const provider = activeProvider || web3Service.getEip1193Provider()
    if (provider?.disconnect) {
      await provider.disconnect().catch((err) => {
        console.error('WalletConnect disconnect failed:', err)
      })
    }

    resetWalletState()
    setError(null)
  }, [activeProvider, resetWalletState])

  useEffect(() => {
    const subscription = walletOnboard.state.select('wallets').subscribe((wallets) => {
      const wallet = wallets?.[0]

      if (!wallet) {
        resetWalletState()
        return
      }

      activateWallet(wallet).catch((err) => {
        console.error('Error activating wallet:', err)
        setError(err?.reason || err?.message || 'Wallet connection failed')
      })
    })

    return () => subscription.unsubscribe()
  }, [activateWallet, resetWalletState])

  return useMemo(() => ({
    account,
    balance,
    isConnected,
    isLoading,
    error,
    walletLabel,
    hasMobileWalletSupport: hasWalletConnectSupport,
    connect,
    disconnect,
    switchToConfiguredNetwork
  }), [
    account,
    balance,
    isConnected,
    isLoading,
    error,
    walletLabel,
    connect,
    disconnect,
    switchToConfiguredNetwork
  ])
}

export function WalletProvider({ children }) {
  const wallet = useWalletState()

  return createElement(WalletContext.Provider, { value: wallet }, children)
}

export const useWallet = () => {
  const wallet = useContext(WalletContext)
  if (!wallet) {
    throw new Error('useWallet must be used inside WalletProvider')
  }
  return wallet
}
