import './ActivationCenterPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useSpace } from '../../context/SpaceContext'
import { web3Service } from '../../Services/web3'
import { ethers } from 'ethers'
// import { fetchAddressReceiptsApi } from '../../Services/orbitsApi'
// import {
//   fetchAddressReceiptsApi,
//   fetchUserSummaryApi,
// } from '../../Services/orbitsApi'

import {
  fetchAddressReceiptsApi,
  fetchUserSummaryApi,
  fetchOrbitLevelSnapshotApi,
} from '../../Services/orbitsApi'

import {
  FaCoins,
  FaExclamationTriangle,
  FaLayerGroup,
  FaLock,
  FaSyncAlt,
  FaUsers,
  FaInfoCircle,
  FaCheckCircle,
  FaRegCircle,
  FaTimesCircle,
  FaChevronDown,
  FaChevronUp,
  FaCopy,
  FaShare,
} from 'react-icons/fa'

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

const AMOY_CHAIN_ID = '0x13882'

const levelPrices = {
  1: '10',
  2: '20',
  3: '40',
  4: '80',
  5: '160',
  6: '320',
  7: '640',
  8: '1280',
  9: '2560',
  10: '5120',
}

const levelToOrbitType = {
  1: 'P4',
  2: 'P12',
  3: 'P39',
  4: 'P4',
  5: 'P12',
  6: 'P39',
  7: 'P4',
  8: 'P12',
  9: 'P39',
  10: 'P4',
}

const orbitTypeConfig = {
  P4: { positions: 4, lines: 1, levels: [1, 4, 7, 10], image: 'p4-image.png' },
  P12: { positions: 12, lines: 2, levels: [2, 5, 8], image: 'p12-image.png' },
  P39: { positions: 39, lines: 3, levels: [3, 6, 9], image: 'p39-image.png' },
}

const upgradeRequirements = {
  1: 20,
  2: 40,
  3: 80,
  4: 160,
  5: 320,
  6: 640,
  7: 1280,
  8: 2560,
  9: 5120,
  10: 10240,
}

const normalizeReferralInput = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    const refFromQuery =
      parsed.searchParams.get('ref') ||
      parsed.searchParams.get('referrer') ||
      parsed.searchParams.get('referral')

    if (refFromQuery) return refFromQuery.trim()

    const parts = parsed.pathname.split('/').filter(Boolean)
    const refIndex = parts.findIndex((part) => part.toLowerCase() === 'ref')

    if (refIndex !== -1 && parts[refIndex + 1]) {
      return parts[refIndex + 1].trim()
    }
  } catch {
    // not a full URL, continue
  }

  return raw
}

const extractReferralFromUrl = (location, refCode = '') => {
  const params = new URLSearchParams(location.search)

  const queryRef =
    params.get('ref') ||
    params.get('referrer') ||
    params.get('referral')

  if (queryRef) return normalizeReferralInput(queryRef)

  if (refCode) return normalizeReferralInput(refCode)

  const pathParts = location.pathname.split('/').filter(Boolean)
  const refIndex = pathParts.findIndex((part) => part.toLowerCase() === 'ref')

  if (refIndex !== -1 && pathParts[refIndex + 1]) {
    return normalizeReferralInput(pathParts[refIndex + 1])
  }

  return ''
}

const getReferralDaysLeftText = (daysLeft) => {
  if (!daysLeft) return 'less than 1 day'
  if (daysLeft === 1) return '1 day'
  return `${daysLeft} days`
}

const getOrbitStructure = (orbitType) => {
  return {
    P4: {
      lines: [1],
      counts: { 1: 4 },
      positions: { 1: [1, 2, 3, 4] },
      startAngles: { 1: -90 },
      customAngles: { 1: { 1: -90, 2: 0, 3: 90, 4: 180 } },
    },
    P12: {
      lines: [1, 2],
      counts: { 1: 3, 2: 9 },
      positions: { 1: [1, 2, 3], 2: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
      startAngles: { 1: -90, 2: -90 },
      customAngles: {
        1: { 1: -90, 2: 30, 3: 150 },
        2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 },
      },
    },
    P39: {
      lines: [1, 2, 3],
      counts: { 1: 3, 2: 9, 3: 27 },
      positions: {
        1: [1, 2, 3],
        2: [4, 5, 6, 7, 8, 9, 10, 11, 12],
        3: Array.from({ length: 27 }, (_, i) => i + 13),
      },
      startAngles: { 1: -90, 2: -90, 3: -90 },
      customAngles: {
        1: { 1: -90, 2: 30, 3: 150 },
        2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 },
        3: {
          13: -145, 22: -133, 31: -121,
          14: -25, 23: -13, 32: -1,
          15: 95, 24: 107, 33: 119,
          16: -109, 25: -97, 34: -85,
          17: 11, 26: 23, 35: 35,
          18: 131, 27: 143, 36: 155,
          19: -73, 28: -61, 37: -49,
          20: 47, 29: 59, 38: 71,
          21: 167, 30: 179, 39: 191,
        },
      },
    },
  }[orbitType]
}

const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
  const radian = (angle * Math.PI) / 180
  return {
    x: centerX + radiusPx * Math.cos(radian),
    y: centerY + radiusPx * Math.sin(radian),
  }
}

const shortOrbitAddress = (address) => {
  if (!address || address === ethers.ZeroAddress) return '—'
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

const getActivationOrbitNodeType = (position, viewer) => {
  if (!position?.occupant || position.occupant === ethers.ZeroAddress) return 'empty'
  if (viewer && position.occupant.toLowerCase() === viewer.toLowerCase()) return 'mine'

  const ref =
    position.originalReferrer ||
    position.referrer ||
    position.occupantReferrer ||
    ethers.ZeroAddress

  if (viewer && ref?.toLowerCase?.() === viewer.toLowerCase()) return 'downline'
  return 'other'
}

const ActivationCenterPage = () => {
  const { isConnected, account, connect } = useWallet()
  const { subjectAddress, isOwnSpace, canTransact, switchToSelf } = useSpace()
  const {
    contracts,
    isLoading: contractsLoading,
    error: contractsError,
    loadContracts,
  } = useContracts()

  const navigate = useNavigate()
  const location = useLocation()
  const { refCode } = useParams()

  const viewer = subjectAddress || account

  // ==================== SIMPLIFIED REFERRAL STATES ====================
  const [myShortCode, setMyShortCode] = useState('')
  const [myReferralLink, setMyReferralLink] = useState('')
  const [incomingReferrer, setIncomingReferrer] = useState('')
  const [referrerInputDisplay, setReferrerInputDisplay] = useState('')
  const [resolvedReferrerStatus, setResolvedReferrerStatus] = useState('')
  const [referrerResolveLoading, setReferrerResolveLoading] = useState(false)
  const [referredByCode, setReferredByCode] = useState('')
  const [referredByWallet, setReferredByWallet] = useState('')
  const [referralAccessLoading, setReferralAccessLoading] = useState(false)
  const [referralAccessMessage, setReferralAccessMessage] = useState('')

  // ==================== REST OF YOUR EXISTING CODE ====================
  const [isRegistered, setIsRegistered] = useState(false)
  const [referrer, setReferrer] = useState('')
  const [activeLevels, setActiveLevels] = useState({})
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [allowance, setAllowance] = useState('0')
  const [totalEarnings, setTotalEarnings] = useState('0')
  const [levelEarnings, setLevelEarnings] = useState({})
  const [escrowLocked, setEscrowLocked] = useState({})
  const [financialByLevel, setFinancialByLevel] = useState({})
  const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null })
  const [networkWarning, setNetworkWarning] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false)
  const [eligibilityChecksForModal, setEligibilityChecksForModal] = useState([])
  const [visibleEligibilityCount, setVisibleEligibilityCount] = useState(0)
  const [isEligibilityAnimating, setIsEligibilityAnimating] = useState(false)
  const [pendingActivationLevel, setPendingActivationLevel] = useState(null)
  const [isNextActionModalOpen, setIsNextActionModalOpen] = useState(false)
  const [openLevelDetails, setOpenLevelDetails] = useState({})
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false)
  
  const [showSecurityNotice, setShowSecurityNotice] = useState(false)

  const [isDeployer, setIsDeployer] = useState(false)
  const [deployerUsdtBalance, setDeployerUsdtBalance] = useState('0')
  const [transferAmount, setTransferAmount] = useState('100')
  const [transferAddress, setTransferAddress] = useState('')
  const [showTransferToSelf, setShowTransferToSelf] = useState(true)
  const [isId1Wallet, setIsId1Wallet] = useState(false)
  const [id1Address, setId1Address] = useState('')
  const [registrationReferrer, setRegistrationReferrer] = useState('')

  const [orbitLevelData, setOrbitLevelData] = useState({})
  const [downlineData, setDownlineData] = useState({})
  const [spilloverData, setSpilloverData] = useState({})
  const [linePaymentCounts, setLinePaymentCounts] = useState({})
  const [userLocks, setUserLocks] = useState({})
  const [viewerRoleByLevel, setViewerRoleByLevel] = useState({})
  const [receiptsSupported, setReceiptsSupported] = useState(false)
  const [cycleData, setCycleData] = useState({})
  const [orbitDataLoading, setOrbitDataLoading] = useState(false)

  const [tokenSummary, setTokenSummary] = useState({
    fgtByLevel: {},
    fgtrByLevel: {},
    lastEventByLevel: {},
  })

  const [registrationCheckComplete, setRegistrationCheckComplete] = useState(false)

  const isViewerConnectedWallet = useMemo(() => {
    if (!viewer || !account) return false
    return viewer.toLowerCase() === account.toLowerCase()
  }, [viewer, account])

  const canWriteHere = isOwnSpace && canTransact && isViewerConnectedWallet

  // ==================== SIMPLE REFERRAL HELPERS ====================
  const fetchMyReferralCode = useCallback(async () => {
    const targetAddress = viewer || account

    if (!targetAddress || !isRegistered) {
      setMyShortCode('')
      setMyReferralLink('')
      setReferredByCode('')
      setReferredByWallet('')
      setReferralAccessMessage('')
      return
    }

    setReferralAccessLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/referral/code/${targetAddress}`)
      const data = await res.json()

      if (!res.ok || data.success === false) {
        setMyShortCode('')
        setMyReferralLink('')
        setReferredByCode('')
        setReferredByWallet('')
        setReferralAccessMessage(
          data.message ||
            'Referral details are not available yet. Please refresh shortly after registration is indexed.'
        )
        return
      }

      setMyShortCode(data.shortCode || data.referralId || '')
      setMyReferralLink(data.fullLink || '')
      setReferredByCode(data.referredByCode || 'FIN-FREEDOM')
      setReferredByWallet(data.referredByWallet || '')
      setReferralAccessMessage('')
    } catch (err) {
      setMyShortCode('')
      setMyReferralLink('')
      setReferredByCode('')
      setReferredByWallet('')
      setReferralAccessMessage(
        'Referral details are not available right now. Please refresh shortly.'
      )
    } finally {
      setReferralAccessLoading(false)
    }
  }, [viewer, account, isRegistered])

  const copyReferralLink = async () => {
    if (!myReferralLink) return
    try {
      await navigator.clipboard.writeText(myReferralLink)
      alert('✅ Referral link copied successfully!')
    } catch (err) {
      alert('Failed to copy')
    }
  }

  // ==================== WALLET-CHANGE EFFECT ====================
  useEffect(() => {
    setRegistrationReferrer('')
    setResolvedReferrerStatus('')

    const urlRef = extractReferralFromUrl(location, refCode)

    if (urlRef && !isRegistered) {
      setIncomingReferrer(urlRef)
      setReferrerInputDisplay(urlRef)
      setResolvedReferrerStatus(
        'Referral detected. You can keep it, change it, or leave it empty to use the system ID.'
      )
      return
    }

    if (!isRegistered) {
      setIncomingReferrer('')
      setReferrerInputDisplay('')
      setResolvedReferrerStatus(
        'No referral added. You can enter a referral ID, paste a referral link, or leave it empty to use the system ID.'
      )
    }
  }, [location.pathname, location.search, refCode, isRegistered])


   const fetchUserFinancialSummary = useCallback(async () => {
    if (!viewer) {
      setFinancialByLevel({})
      return
    }

    try {
      const summary = await fetchUserSummaryApi(viewer)
      const byLevel = Array.isArray(summary?.earnings?.byLevel)
        ? summary.earnings.byLevel
        : []

      const mapped = {}

      byLevel.forEach((item) => {
        const level = Number(item.level || 0)
        if (!level) return

        mapped[level] = {
          generated: Number(item.generated || 0),
          walletCredited: Number(item.liquid || 0),
          escrowLockedLifetime: Number(item.escrowLockedLifetime || item.receiptEscrowLocked || 0),
          autoUpgradeUsed: Number(item.autoUpgradeUsed || item.escrowUsed || 0),
          currentLocked: Number(item.currentLocked || 0),
          remainingToNextUpgrade: Number(item.remainingToNextUpgrade || 0),
          receiptCount: Number(item.receiptCount || 0),
        }
      })

      setFinancialByLevel(mapped)
    } catch (err) {
      console.error('Failed to fetch user financial summary:', err)
      setFinancialByLevel({})
    }
  }, [viewer])



    useEffect(() => {
    if (isRegistered && viewer) {
      fetchUserFinancialSummary()
    } else {
      setFinancialByLevel({})
    }
  }, [isRegistered, viewer, fetchUserFinancialSummary])

  // ==================== RESOLVE FINAL REGISTRATION REFERRER ====================
  const resolveFinalRegistrationReferrer = useCallback(async () => {
    const finalInput = normalizeReferralInput(referrerInputDisplay || incomingReferrer)

    if (!finalInput) {
      return {
        referrerCode: 'FIN-FREEDOM',
        referrerWallet: ethers.ZeroAddress,
      }
    }

    if (finalInput.toUpperCase() === 'FIN-FREEDOM') {
      return {
        referrerCode: 'FIN-FREEDOM',
        referrerWallet: ethers.ZeroAddress,
      }
    }

    if (ethers.isAddress(finalInput)) {
      return {
        referrerCode: finalInput,
        referrerWallet: finalInput,
      }
    }

    setReferrerResolveLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/referral/resolve/${encodeURIComponent(finalInput)}`)
      const data = await res.json()

      if (!res.ok || data.success === false || !data.walletAddress) {
        throw new Error(
          data.message ||
            'We could not find that referral ID. Please check it or leave the field empty to use the system ID.'
        )
      }

      return {
        referrerCode: data.shortCode || data.referralId || finalInput,
        referrerWallet: data.walletAddress,
      }
    } finally {
      setReferrerResolveLoading(false)
    }
  }, [incomingReferrer, referrerInputDisplay])

  // ==================== HANDLE REGISTER FROM MODAL ====================
  const handleRegisterFromModal = async () => {
    try {
      const finalReferral = await resolveFinalRegistrationReferrer()

      setRegistrationReferrer(finalReferral.referrerWallet)

      await handleCombinedRegisterAndActivateLevelOne(finalReferral.referrerWallet)
    } catch (err) {
      setTxStatus({
        loading: false,
        hash: null,
        error:
          err.message ||
          'We could not confirm the referrer. Please check it or leave the field empty to use the system ID.',
      })
    }
  }

  // ==================== VIEW ORBIT ====================


    const handleOpenFocusedOrbitPage = useCallback((level) => {
    if (!viewer) return

    navigate('/orbits', {
      state: {
        level,
        address: viewer,
        displayId: myShortCode || '',
        focusedOnly: true,
        source: 'activation-center',
      },
    })
  }, [navigate, viewer, myShortCode])


  const handleViewLevelOrbit = useCallback((level) => {
    handleOpenFocusedOrbitPage(level)
  }, [handleOpenFocusedOrbitPage])



  // ==================== REST OF THE EXISTING CODE (unchanged beyond this point) ====================
  const formatViewerAddress = useCallback((value) => {
    if (!value) return '—'
    return `${value.slice(0, 8)}...${value.slice(-6)}`
  }, [])

  const formatUsdt = useCallback((value) => {
    try {
      return Number(ethers.formatUnits(value ?? 0, 6))
    } catch {
      return 0
    }
  }, [])

  const getWriteContracts = async () => {
    const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
    return writeContracts
  }

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('MetaMask not installed')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return await provider.getSigner()
  }

  const getLevelBackground = (level) => {
    const orbitType = levelToOrbitType[level]

    if (orbitType === 'P4') {
      return `
        radial-gradient(circle at 50% 18%, rgba(29, 233, 182, 0.95) 0 4px, transparent 5px),
        radial-gradient(circle at 82% 50%, rgba(77, 163, 255, 0.92) 0 4px, transparent 5px),
        radial-gradient(circle at 50% 82%, rgba(139, 92, 246, 0.92) 0 4px, transparent 5px),
        radial-gradient(circle at 18% 50%, rgba(29, 233, 182, 0.92) 0 4px, transparent 5px),
        radial-gradient(circle at center, transparent 0 57px, rgba(255,255,255,0.12) 58px 59px, transparent 60px),
        radial-gradient(circle at center, rgba(255,255,255,0.07) 0 18px, transparent 19px),
        linear-gradient(180deg, rgba(7, 17, 31, 0.18), rgba(7, 17, 31, 0.74))
      `
    }

    if (orbitType === 'P12') {
      return `
        radial-gradient(circle at 50% 30%, rgba(29, 233, 182, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 68% 60%, rgba(77, 163, 255, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 32% 60%, rgba(139, 92, 246, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 50% 14%, rgba(29, 233, 182, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 73% 20%, rgba(77, 163, 255, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 86% 40%, rgba(139, 92, 246, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 82% 66%, rgba(29, 233, 182, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 64% 84%, rgba(77, 163, 255, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 36% 84%, rgba(139, 92, 246, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 18% 66%, rgba(29, 233, 182, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 14% 40%, rgba(77, 163, 255, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at 27% 20%, rgba(139, 92, 246, 0.9) 0 3px, transparent 4px),
        radial-gradient(circle at center, transparent 0 38px, rgba(255,255,255,0.11) 39px 40px, transparent 41px),
        radial-gradient(circle at center, transparent 0 66px, rgba(255,255,255,0.10) 67px 68px, transparent 69px),
        radial-gradient(circle at center, rgba(255,255,255,0.06) 0 17px, transparent 18px),
        linear-gradient(180deg, rgba(7, 17, 31, 0.18), rgba(7, 17, 31, 0.74))
      `
    }

    if (orbitType === 'P39') {
      return `
        radial-gradient(circle at 50.00% 34.00%, rgba(29, 233, 182, 0.9) 0 2.5px, transparent 3.5px),
        radial-gradient(circle at 63.86% 58.00%, rgba(29, 233, 182, 0.9) 0 2.5px, transparent 3.5px),
        radial-gradient(circle at 36.14% 58.00%, rgba(29, 233, 182, 0.9) 0 2.5px, transparent 3.5px),
        radial-gradient(circle at 50.00% 22.00%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 68.00% 28.55%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 77.57% 45.14%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 74.25% 64.00%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 59.58% 76.31%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 40.42% 76.31%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 25.75% 64.00%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 22.43% 45.14%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 32.00% 28.55%, rgba(77, 163, 255, 0.88) 0 2.4px, transparent 3.4px),
        radial-gradient(circle at 50.00% 11.00%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 58.99% 12.05%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 67.50% 15.15%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 75.07% 20.12%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 81.28% 26.71%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 85.81% 34.55%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 88.41% 43.23%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 88.93% 52.27%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 87.36% 61.19%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 83.77% 69.50%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 78.37% 76.76%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 71.43% 82.58%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 63.34% 86.65%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 54.53% 88.74%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 45.47% 88.74%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 36.66% 86.65%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 28.57% 82.58%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 21.63% 76.76%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 16.23% 69.50%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 12.64% 61.19%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 11.07% 52.27%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 11.59% 43.23%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 14.19% 34.55%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 18.72% 26.71%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 24.93% 20.12%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 32.50% 15.15%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at 41.01% 12.05%, rgba(139, 92, 246, 0.84) 0 2.1px, transparent 3px),
        radial-gradient(circle at center, transparent 0 28px, rgba(255,255,255,0.11) 29px 30px, transparent 31px),
        radial-gradient(circle at center, transparent 0 48px, rgba(255,255,255,0.10) 49px 50px, transparent 51px),
        radial-gradient(circle at center, transparent 0 68px, rgba(255,255,255,0.09) 69px 70px, transparent 71px),
        radial-gradient(circle at center, rgba(255,255,255,0.05) 0 15px, transparent 16px),
        linear-gradient(180deg, rgba(7, 17, 31, 0.18), rgba(7, 17, 31, 0.74))
      `
    }

    return 'none'
  }

  const ensureWritableSpace = () => {
    if (!canWriteHere) {
      setTxStatus({
        loading: false,
        hash: null,
        error: "You are viewing another member's space. Return to your own space to perform wallet actions.",
      })
      return false
    }
    return true
  }

  const fetchFullOrbitData = useCallback(
    async (level) => {
      if (!viewer || !isRegistered) return null

      try {
        const snapshot = await fetchOrbitLevelSnapshotApi(viewer, level)
        if (!snapshot) return null

        const positions = snapshot.positions || []

        const downlinePositions = positions.filter((p) => {
          if (!p.occupant || p.occupant?.toLowerCase() === viewer?.toLowerCase()) return false
          return (
            p.originalReferrer?.toLowerCase() === viewer?.toLowerCase() ||
            p.truthLabel === 'FOUNDER_PATH'
          )
        }).length

        const otherOccupants = positions.filter(
          (p) =>
            p.occupant &&
            p.occupant?.toLowerCase() !== viewer?.toLowerCase() &&
            p.originalReferrer?.toLowerCase() !== viewer?.toLowerCase()
        ).length

        const lineCounts = {
          line1: Number(snapshot.linePaymentCounts?.line1 || 0),
          line2: Number(snapshot.linePaymentCounts?.line2 || 0),
          line3: Number(snapshot.linePaymentCounts?.line3 || 0),
        }

        const totalEarned = snapshot.orbitSummary?.totalEarned || '0'
        const totalCycles = Number(snapshot.orbitSummary?.totalCycles || 0)
        const currentCycle = totalCycles + 1

        let viewerRole = 'NONE'
        if (snapshot.viewerReceiptBreakdown) {
          if (snapshot.viewerReceiptBreakdown.founderPathGross > 0) viewerRole = 'FOUNDER_PATH'
          else if (snapshot.viewerReceiptBreakdown.directOwnerGross > 0) viewerRole = 'DIRECT_OWNER'
          else if (snapshot.viewerReceiptBreakdown.routedSpilloverGross > 0) viewerRole = 'ROUTED_SPILLOVER'
          else if (snapshot.viewerReceiptBreakdown.recycleGross > 0) viewerRole = 'RECYCLE'
        }

        return {
          downlinePositions,
          otherOccupants,
          lineCounts,
          totalEarned: parseFloat(totalEarned).toFixed(2),
          totalCycles,
          currentCycle,
          lockedForNextLevel: snapshot.lockedForNextLevel || '0',
          viewerRole,
          positionsFilled: positions.filter((p) => p.occupant).length,
          totalPositions: orbitTypeConfig[levelToOrbitType[level]]?.positions || 4,
        }
      } catch (err) {
        console.error(`Failed to fetch orbit data for level ${level}:`, err)
        return null
      }
    },
    [viewer, isRegistered]
  )


  const fetchUserEarnings = useCallback(async () => {
    if (!viewer) return

    try {
      const result = await fetchAddressReceiptsApi(viewer)
      const receipts = Array.isArray(result?.receipts) ? result.receipts : []
      setReceiptsSupported(true)

      let total = 0
      const earningsByLevel = {}
      const escrowByLevel = {}

      receipts.forEach((receipt) => {
        const level = Number(receipt.level || 0)
        const liquid = Number(receipt.liquidPaid || 0)
        const escrow = Number(receipt.escrowLocked || 0)

        total += liquid
        earningsByLevel[level] = (earningsByLevel[level] || 0) + liquid
        escrowByLevel[level] = (escrowByLevel[level] || 0) + escrow
      })

      setTotalEarnings(total.toFixed(2))
      setLevelEarnings(earningsByLevel)
      setEscrowLocked(escrowByLevel)
    } catch (err) {
      console.error('Error fetching earnings:', err)
      setReceiptsSupported(false)
      setTotalEarnings('0')
      setLevelEarnings({})
      setEscrowLocked({})
    }
  }, [viewer])

  const fetchUserData = useCallback(async () => {
    if (!contracts || !viewer) return

    setRegistrationCheckComplete(false)

    try {
      const id1WalletAddress = await contracts.registration.id1Wallet()
      const isId1 = id1WalletAddress?.toLowerCase() === viewer.toLowerCase()

      setIsId1Wallet(isId1)
      setId1Address(id1WalletAddress || '')

      let registered = false
      const levels = {}

      if (isId1) {
        registered = true
        setReferrer('')
        for (let i = 1; i <= 10; i += 1) levels[i] = true
      } else {
        registered = await contracts.registration.isRegistered(viewer)
        if (registered) {
          const ref = await contracts.registration.getReferrer(viewer)
          setReferrer(ref === ethers.ZeroAddress ? '' : ref)
        } else {
          setReferrer('')
        }

        for (let i = 1; i <= 10; i += 1) {
          try {
            levels[i] = await contracts.registration.isLevelActivated(viewer, i)
          } catch {
            levels[i] = false
          }
        }
      }

      setIsRegistered(registered)
      setActiveLevels(levels)

      const balance = await contracts.usdt.balanceOf(viewer)
      setUsdtBalance(formatUsdt(balance).toString())

      const spender = contracts.levelManager.target
      const currentAllowance = await contracts.usdt.allowance(viewer, spender)
      setAllowance(formatUsdt(currentAllowance).toString())

      if (registered) {
        await fetchUserEarnings()
      } else {
        setTotalEarnings('0')
        setLevelEarnings({})
        setEscrowLocked({})
      }
    } catch (err) {
      console.error('Data extraction failed:', err)
    } finally {
      setRegistrationCheckComplete(true)
    }
  }, [contracts, viewer, formatUsdt, fetchUserEarnings])

  useEffect(() => {
    const checkDeployerStatus = async () => {
      if (!isOwnSpace) {
        setIsDeployer(false)
        return
      }
      if (!contracts || !account) return

      try {
        const owner = await contracts.registration.owner()
        const ownerMatch = owner.toLowerCase() === account.toLowerCase()
        setIsDeployer(ownerMatch)

        if (ownerMatch && contracts.usdt) {
          const balance = await contracts.usdt.balanceOf(account)
          setDeployerUsdtBalance(formatUsdt(balance).toString())
        }

        setTransferAddress(account)
      } catch (err) {
        console.error('Error checking deployer status:', err)
      }
    }

    checkDeployerStatus()
  }, [contracts, account, formatUsdt, isOwnSpace])

  const fetchAllOrbitLevelData = useCallback(async () => {
    if (!viewer || !isRegistered) return

    setOrbitDataLoading(true)
    try {
      const levelDataPromises = {}
      const downlinePromises = {}
      const spilloverPromises = {}
      const lineCountPromises = {}
      const lockPromises = {}
      const rolePromises = {}
      const cyclePromises = {}

      for (let level = 1; level <= 10; level += 1) {
        if (activeLevels[level]) {
          const data = await fetchFullOrbitData(level)
          if (data) {
            levelDataPromises[level] = data
            downlinePromises[level] = data.downlinePositions
            spilloverPromises[level] = data.otherOccupants
            lineCountPromises[level] = data.lineCounts
            lockPromises[level] = data.lockedForNextLevel
            rolePromises[level] = data.viewerRole
            cyclePromises[level] = { total: data.totalCycles, current: data.currentCycle }
          }
        }
      }

      setOrbitLevelData(levelDataPromises)
      setDownlineData(downlinePromises)
      setSpilloverData(spilloverPromises)
      setLinePaymentCounts(lineCountPromises)
      setUserLocks(lockPromises)
      setViewerRoleByLevel(rolePromises)
      setCycleData(cyclePromises)
    } catch (err) {
      console.error('Failed to fetch orbit level data:', err)
    } finally {
      setOrbitDataLoading(false)
    }
  }, [viewer, isRegistered, activeLevels, fetchFullOrbitData])

  const fetchTokenSummary = useCallback(async () => {
    if (!contracts?.tokenController || !viewer) return

    try {
      const totalRecordsRaw = await contracts.tokenController.getUserTokenRecordCount(viewer)
      const totalRecords = Number(totalRecordsRaw || 0)

      if (!totalRecords) {
        setTokenSummary({
          fgtByLevel: {},
          fgtrByLevel: {},
          lastEventByLevel: {},
        })
        return
      }

      const records = await contracts.tokenController.getUserTokenRecords(viewer, 0, totalRecords)

      const fgtByLevel = {}
      const fgtrByLevel = {}
      const lastEventByLevel = {}

      records.forEach((record, index) => {
        const recordType = Number(record.recordType ?? record[0] ?? 0)
        const level = Number(record.level ?? record[1] ?? 0)
        const timestamp = Number(record.timestamp ?? record[2] ?? 0)
        const amountRaw = record.amount ?? record[3] ?? 0
        const amount = Number(ethers.formatUnits(amountRaw || 0, 6))
        const reasonRaw = record.reason ?? record[4] ?? ethers.ZeroHash

        let reason = ''
        try {
          reason = ethers.decodeBytes32String(reasonRaw)
        } catch {
          reason = ''
        }

        if (recordType === 1) {
          fgtByLevel[level] = (fgtByLevel[level] || 0) + amount
          lastEventByLevel[level] = {
            id: `fgt-${level}-${index}`,
            token: 'FGT',
            amount,
            timestamp,
            reason: reason || 'activation reward',
          }
        }

        if (recordType === 2) {
          fgtrByLevel[level] = (fgtrByLevel[level] || 0) + amount
          lastEventByLevel[level] = {
            id: `fgtr-${level}-${index}`,
            token: 'FGTr',
            amount,
            timestamp,
            reason: reason || 'recycle reward',
          }
        }
      })

      setTokenSummary({
        fgtByLevel,
        fgtrByLevel,
        lastEventByLevel,
      })
    } catch (err) {
      console.error('Failed to fetch token summary:', err)
    }
  }, [contracts, viewer])

  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) return
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      setNetworkWarning(chainId !== AMOY_CHAIN_ID)
    }

    checkNetwork()

    const handleChainChanged = () => window.location.reload()
    window.ethereum?.on('chainChanged', handleChainChanged)

    return () => window.ethereum?.removeListener('chainChanged', handleChainChanged)
  }, [])

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
    if (!contracts || !viewer) return

    fetchUserData()
    const interval = setInterval(() => {
      fetchUserData()
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)

    return () => clearInterval(interval)
  }, [contracts, viewer, fetchUserData])

  useEffect(() => {
    if (isRegistered && Object.keys(activeLevels).length > 0) {
      fetchAllOrbitLevelData()
    }
  }, [isRegistered, activeLevels, fetchAllOrbitLevelData])

  useEffect(() => {
    if (contracts && viewer) {
      fetchTokenSummary()
    }
  }, [contracts, viewer, fetchTokenSummary])

  useEffect(() => {
    fetchMyReferralCode()
  }, [fetchMyReferralCode])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const shouldLock =
      isEligibilityModalOpen ||
      isNextActionModalOpen ||
      isRegistrationModalOpen ||
      showSecurityNotice

    const previousBodyOverflow = document.body.style.overflow
    const previousBodyTouchAction = document.body.style.touchAction
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousHtmlScrollBehavior = document.documentElement.style.scrollBehavior

    if (shouldLock) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.scrollBehavior = 'auto'
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.body.style.touchAction = previousBodyTouchAction
      document.documentElement.style.overflow = previousHtmlOverflow
      document.documentElement.style.scrollBehavior = previousHtmlScrollBehavior
    }
  }, [isEligibilityModalOpen, isNextActionModalOpen, isRegistrationModalOpen, showSecurityNotice])

  useEffect(() => {
    const shouldShowOnboarding =
      isConnected &&
      !contractsLoading &&
      registrationCheckComplete &&
      !isRegistered &&
      !isId1Wallet &&
      canWriteHere

    if (isRegistered || isId1Wallet || !canWriteHere) {
      setShowSecurityNotice(false)
      setIsRegistrationModalOpen(false)
      return
    }

    if (shouldShowOnboarding) {
      setShowSecurityNotice(true)
    }
  }, [
    isConnected,
    contractsLoading,
    registrationCheckComplete,
    isRegistered,
    isId1Wallet,
    canWriteHere,
  ])




  const getHighestActiveLevel = useCallback(() => {
    const active = Object.entries(activeLevels)
      .filter(([, active]) => active)
      .map(([level]) => Number(level))
    return active.length ? Math.max(...active) : 0
  }, [activeLevels])

  const getNextAvailableLevel = useCallback(() => {
    for (let i = 1; i <= 10; i += 1) {
      if (!activeLevels[i]) return i
    }
    return null
  }, [activeLevels])

  const canActivateLevel = useCallback(
    (level) => {
      if (level === 1) {
        return !activeLevels[1]
      }
      return !activeLevels[level] && activeLevels[level - 1]
    },
    [activeLevels]
  )

  const toggleLevelDetails = useCallback((level) => {
    setOpenLevelDetails((prev) => ({
      ...prev,
      [level]: !prev[level],
    }))
  }, [])

  const ensureSufficientAllowance = useCallback(
    async (requiredAmountUsdt) => {
      const signer = await getSigner()
      const spender = contracts.levelManager.target
      const currentAllowance = await contracts.usdt.allowance(account, spender)
      const requiredAmountWei = ethers.parseUnits(String(requiredAmountUsdt), 6)

      if (currentAllowance >= requiredAmountWei) {
        return null
      }

      const approveTx = await contracts.usdt.connect(signer).approve(spender, requiredAmountWei)
      setTxStatus({ loading: true, hash: approveTx.hash, error: null })
      await approveTx.wait()

      const newAllowance = await contracts.usdt.allowance(account, spender)
      setAllowance(formatUsdt(newAllowance).toString())

      return approveTx
    },
    [contracts, account, formatUsdt]
  )

  const refreshAllAfterWrite = useCallback(async () => {
    await fetchUserData()
    await fetchAllOrbitLevelData()
    await fetchTokenSummary()
    await fetchMyReferralCode()
    await fetchUserFinancialSummary()
    setLastUpdated(new Date().toLocaleTimeString())
  }, [fetchUserData, fetchAllOrbitLevelData, fetchTokenSummary, fetchMyReferralCode, fetchUserFinancialSummary])

  const handleCombinedRegisterAndActivateLevelOne = useCallback(async (finalRegistrationReferrer = registrationReferrer) => {
    if (!ensureWritableSpace()) return

    if (networkWarning) {
      setTxStatus({
        loading: false,
        hash: null,
        error: 'Please switch to Polygon Amoy Testnet first.',
      })
      return
    }

    setTxStatus({ loading: true, hash: null, error: null })

    try {
      const totalRequiredUsdt = 10
      const totalRequiredWei = ethers.parseUnits(String(totalRequiredUsdt), 6)
      const balance = await contracts.usdt.balanceOf(account)

      if (balance < totalRequiredWei) {
        throw new Error(
          `Insufficient USDT balance. You need ${totalRequiredUsdt} USDT for registration and Level 1 activation. Current balance: ${ethers.formatUnits(balance, 6)} USDT`
        )
      }

      await ensureSufficientAllowance(totalRequiredUsdt)

      const writeContracts = await getWriteContracts()

      const registerTx = await writeContracts.registration.register(
        finalRegistrationReferrer || ethers.ZeroAddress
      )
      setTxStatus({ loading: true, hash: registerTx.hash, error: null })
      await registerTx.wait()

      try {
        const signer = await getSigner()
        const registrationWithSigner = contracts.registration.connect(signer)
        const level1AlreadyActive = await contracts.registration.isLevelActivated(account, 1)

        if (!level1AlreadyActive) {
          const activateTx = await registrationWithSigner.activateLevel(1)
          setTxStatus({ loading: true, hash: activateTx.hash, error: null })
          await activateTx.wait()
          setTxStatus({ loading: false, hash: activateTx.hash, error: null })
        } else {
          setTxStatus({ loading: false, hash: registerTx.hash, error: null })
        }
      } catch (activationError) {
        const latestActive = await contracts.registration
          .isLevelActivated(account, 1)
          .catch(() => false)

        if (latestActive) {
          setTxStatus({ loading: false, hash: registerTx.hash, error: null })
        } else {
          throw activationError
        }
      }

      await refreshAllAfterWrite()
      setIsRegistrationModalOpen(false)
      setRegistrationReferrer('')
    } catch (err) {
      console.error('Registration + Level 1 activation error:', err)

      let errorMessage = err.message || 'Transaction failed'

      if (err.message?.includes('Already registered')) {
        errorMessage = 'This wallet is already registered.'
      } else if (err.message?.includes('Self-referral')) {
        errorMessage = 'You cannot refer yourself.'
      } else if (err.message?.includes('Referrer not registered')) {
        errorMessage = 'The referrer address is not registered.'
      } else if (err.message?.includes('USDT transfer failed')) {
        errorMessage = 'USDT transfer failed. Check your balance and allowance.'
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'You do not have enough POL for gas.'
      }

      setTxStatus({ loading: false, hash: null, error: errorMessage })
    }
  }, [
    ensureWritableSpace,
    networkWarning,
    contracts,
    account,
    ensureSufficientAllowance,
    getWriteContracts,
    registrationReferrer,
    refreshAllAfterWrite,
  ])

  const handleTransferToSelf = async () => {
    if (!ensureWritableSpace()) return
    setTxStatus({ loading: true, hash: null, error: null })

    try {
      if (!isDeployer) throw new Error('Only deployer can transfer USDT')

      const amount = ethers.parseUnits(transferAmount, 6)
      const balance = await contracts.usdt.balanceOf(account)

      if (balance < amount) {
        throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
      }

      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.usdt.transfer(account, amount)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      const newBalance = await contracts.usdt.balanceOf(account)
      const newBalanceFormatted = formatUsdt(newBalance).toString()
      setUsdtBalance(newBalanceFormatted)
      setDeployerUsdtBalance(newBalanceFormatted)

      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      console.error('Transfer error:', err)
      setTxStatus({ loading: false, hash: null, error: err.message })
    }
  }

  const handleTransferToAddress = async () => {
    if (!ensureWritableSpace()) return
    setTxStatus({ loading: true, hash: null, error: null })

    try {
      if (!isDeployer) throw new Error('Only deployer can transfer USDT')
      if (!ethers.isAddress(transferAddress)) throw new Error('Invalid recipient address')

      const amount = ethers.parseUnits(transferAmount, 6)
      const balance = await contracts.usdt.balanceOf(account)

      if (balance < amount) {
        throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
      }

      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.usdt.transfer(transferAddress, amount)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      const newDeployerBalance = await contracts.usdt.balanceOf(account)
      setDeployerUsdtBalance(formatUsdt(newDeployerBalance).toString())

      if (transferAddress.toLowerCase() === account.toLowerCase()) {
        const newBalance = await contracts.usdt.balanceOf(account)
        setUsdtBalance(formatUsdt(newBalance).toString())
      }

      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      console.error('Transfer error:', err)
      setTxStatus({ loading: false, hash: null, error: err.message })
    }
  }

  const buildEligibilityChecks = useCallback(
    (level) => {
      const price = parseFloat(levelPrices[level] || '0')
      const totalRequired = price

      return [
        {
          key: 'wallet',
          label: 'Wallet connected',
          passed: Boolean(isConnected),
          hint: isConnected ? 'Wallet session is active.' : 'Connect your wallet first.',
        },
        {
          key: 'network',
          label: 'Correct network (Polygon Amoy)',
          passed: !networkWarning,
          hint: !networkWarning ? 'Correct network detected.' : 'Switch to Polygon Amoy before continuing.',
        },
        {
          key: 'registration',
          label: level === 1 && !isRegistered ? 'Ready to register' : 'Registration complete',
          passed: level === 1 ? true : Boolean(isRegistered),
          hint:
            level === 1 && !isRegistered
              ? 'This action will register the wallet and activate Level 1.'
              : isRegistered
                ? 'Registration is already confirmed.'
                : 'Complete registration first.',
        },
        {
          key: 'levelReady',
          label: `Level ${level} ready`,
          passed: Boolean(canActivateLevel(level)),
          hint:
            level === 1 && !isRegistered
              ? 'Level 1 is available as part of onboarding.'
              : canActivateLevel(level)
                ? `Level ${level} is available for activation.`
                : `Activate Level ${level - 1} first.`,
        },
        {
          key: 'balance',
          label: `${totalRequired} USDT available`,
          passed: parseFloat(usdtBalance) >= totalRequired,
          hint:
            parseFloat(usdtBalance) >= totalRequired
              ? 'Wallet balance is sufficient.'
              : level === 1 && !isRegistered
                ? `You need ${totalRequired} USDT for registration and Level 1 activation.`
                : `You need ${levelPrices[level]} USDT for this level.`,
        },
      ]
    },
    [isConnected, networkWarning, isRegistered, canActivateLevel, usdtBalance]
  )

  const executeLevelActivation = async (level) => {
    if (!ensureWritableSpace()) return
    if (networkWarning) {
      setTxStatus({
        loading: false,
        hash: null,
        error: 'Please switch to Polygon Amoy Testnet first.',
      })
      return
    }

    if (level === 1 && !isRegistered) {
      await handleRegisterFromModal()
      return
    }

    if (!canActivateLevel(level)) {
      setTxStatus({
        loading: false,
        hash: null,
        error: `Cannot activate Level ${level}. Please activate previous levels first.`,
      })
      return
    }

    setTxStatus({ loading: true, hash: null, error: null })

    try {
      const price = parseFloat(levelPrices[level])
      const balanceNum = parseFloat(usdtBalance)

      if (balanceNum < price) {
        throw new Error(`Insufficient USDT balance. You have ${usdtBalance} USDT but need ${price} USDT.`)
      }

      await ensureSufficientAllowance(price)

      const signer = await getSigner()
      const registrationWithSigner = contracts.registration.connect(signer)
      const tx = await registrationWithSigner.activateLevel(level)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      await refreshAllAfterWrite()
      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      console.error('Activation error:', err)

      let errorMessage = err.message || 'Transaction failed'
      if (err.message?.includes('Previous level not activated')) {
        errorMessage = `You need to activate Level ${level - 1} first.`
      } else if (err.message?.includes('Level already activated')) {
        errorMessage = `Level ${level} is already activated.`
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'You do not have enough POL for gas.'
      } else if (err.message?.includes('transfer amount exceeds balance')) {
        errorMessage = 'You do not have enough USDT.'
      }

      setTxStatus({ loading: false, hash: null, error: errorMessage })
    }
  }

  const handleApproveAndActivate = async (level) => {
    const checksForLevel = buildEligibilityChecks(level)

    setPendingActivationLevel(level)
    setEligibilityChecksForModal(checksForLevel)
    setVisibleEligibilityCount(0)
    setIsEligibilityModalOpen(true)
    setIsEligibilityAnimating(true)

    for (let index = 0; index < checksForLevel.length; index += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 280))
      setVisibleEligibilityCount(index + 1)
    }

    const allPassed = checksForLevel.every((item) => item.passed)

    if (!allPassed) {
      setIsEligibilityAnimating(false)
      return
    }

    await new Promise((resolve) => window.setTimeout(resolve, 520))
    setIsEligibilityModalOpen(false)
    setIsEligibilityAnimating(false)

    await executeLevelActivation(level)
  }

  const handleProceedToRegistration = () => {
    setShowSecurityNotice(false)
    setIsRegistrationModalOpen(true)
  }

  // ReferralCard component
  const ReferralCard = () => {
    if (!isRegistered) {
      return (
        <section className="activation-referral-card activation-referral-card--locked">
          <div className="activation-referral-card__header">
            <span className="activation-referral-card__icon">
              <FaLock />
            </span>

            <div>
              <span className="activation-referral-card__eyebrow">
                Referral Access Locked
              </span>
              <h3>Register to unlock your referral ID</h3>
            </div>
          </div>

          <p className="activation-referral-card__text">
            Your personal referral ID and referral link become available only after successful registration.
          </p>
        </section>
      )
    }

    return (
      <section className="activation-referral-card">
        <div className="activation-referral-card__header">
          <span className="activation-referral-card__icon">
            <FaShare />
          </span>

          <div>
            <span className="activation-referral-card__eyebrow">
              Referral Access
            </span>
            <h3>Your referral ID and link</h3>
          </div>
        </div>

        {referralAccessLoading ? (
          <p className="activation-referral-card__text">
            Loading your referral details...
          </p>
        ) : myShortCode && myReferralLink ? (
          <>
            <p className="activation-referral-card__text">
              Share your clean route. New users land directly in the Activation Center with your referral ID.
            </p>

            <div className="activation-referral-card__meta-grid">
              <div className="activation-referral-card__mini">
                <span>Your Referral ID</span>
                <strong>{myShortCode}</strong>
              </div>

              <div className="activation-referral-card__mini">
                <span>Referred By</span>
                <strong>{referredByCode || 'FIN-FREEDOM'}</strong>
              </div>
            </div>

            <div className="activation-referral-card__link">
              <code>{myReferralLink}</code>
            </div>

            <button
              type="button"
              onClick={copyReferralLink}
              className="activation-referral-card__button"
            >
              <FaCopy />
              Copy Referral Link
            </button>
          </>
        ) : (
          <div className="activation-referral-card__pending">
            <p className="activation-referral-card__text">
              {referralAccessMessage ||
                'Your registration is confirmed. Refresh shortly to load your referral ID and invitation link.'}
            </p>

            <button
              type="button"
              className="activation-referral-card__button activation-referral-card__button--ghost"
              onClick={fetchMyReferralCode}
            >
              <FaSyncAlt />
              Refresh Referral Details
            </button>
          </div>
        )}
      </section>
    )
  }

  // ReferralInvitationCard component (for unregistered users)
  const ReferralInvitationCard = () => {
    if (isRegistered) return null

    const hasReferrer = Boolean(incomingReferrer || referrerInputDisplay)

    return (
      <section className={`activation-referral-card activation-referral-card--invitation ${hasReferrer ? 'has-referrer' : ''}`}>
        <div className="activation-referral-card__header">
          <span className="activation-referral-card__icon">
            {hasReferrer ? <FaCheckCircle /> : <FaInfoCircle />}
          </span>

          <div>
            <span className="activation-referral-card__eyebrow">
              Referral Invitation
            </span>
            <h3>
              {hasReferrer ? 'Invitation ready' : 'No invitation detected'}
            </h3>
          </div>
        </div>

        <p className="activation-referral-card__text">
          {resolvedReferrerStatus ||
            'No referral added. You can enter a referral ID, paste a referral link, or leave it empty to use the system ID.'}
        </p>

        {hasReferrer && (
          <div className="activation-referral-card__code">
            <span>{incomingReferrer || referrerInputDisplay}</span>
          </div>
        )}
      </section>
    )
  }

  const highestLevel = useMemo(() => {
    const active = Object.entries(activeLevels)
      .filter(([, active]) => active)
      .map(([level]) => Number(level))
    return active.length ? Math.max(...active) : 0
  }, [activeLevels])

  const nextLevel = useMemo(() => {
    for (let i = 1; i <= 10; i += 1) {
      if (!activeLevels[i]) return i
    }
    return null
  }, [activeLevels])

  const activatedCount = useMemo(
    () => Object.values(activeLevels).filter(Boolean).length,
    [activeLevels]
  )

  const lineChartData = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => ({
        level,
        activated: activeLevels[level] ? 1 : 0,
        cumulative: Object.values(activeLevels)
          .slice(0, level)
          .filter(Boolean).length,
      })),
    [activeLevels]
  )

  const maxCumulative = Math.max(...lineChartData.map((d) => d.cumulative), 1)
  const chartPoints = lineChartData
    .map((d, i) => {
      const x = (i / 9) * 100
      const y = 100 - (d.cumulative / maxCumulative) * 80 - 10
      return `${x},${y}`
    })
    .join(' ')

  const getRoleBadge = (role) => {
    switch (role) {
      case 'FOUNDER_PATH':
        return <span className="role-badge founder">Founder Path</span>
      case 'DIRECT_OWNER':
        return <span className="role-badge direct">Direct Owner</span>
      case 'ROUTED_SPILLOVER':
        return <span className="role-badge routed">Routed Spillover</span>
      case 'RECYCLE':
        return <span className="role-badge recycle">Recycle</span>
      default:
        return null
    }
  }

  const GoArrow = () => <span className="go-arrow">↑</span>

  if (!isConnected) {
    return (
      <section className="activation-page">
        <div className="activation-hero">
          <div className="activation-hero__content">
            <div className="activation-hero__eyebrow glass-panel">
              <span className="activation-hero__eyebrow-dot" />
              <span className="activation-hero__eyebrow-text">Wallet-first protocol access</span>
            </div>

            <div className="activation-hero__text-block">
              <h1 className="activation-hero__title">Activation Center</h1>
              <p className="activation-hero__description soft-text">
                Connect your wallet to review registration status, level progression, orbit visibility,
                and activation readiness.
              </p>
            </div>

            <button onClick={connect} className="activation-next__button activation-next__button--fit">
              Connect Wallet
            </button>
          </div>

          <div className="activation-hero__visual glass-panel">
            <div className="activation-hero__visual-header">
              <span className="activation-hero__visual-title">Status</span>
              <span className="activation-hero__visual-status">Disconnected</span>
            </div>

            <div className="activation-hero__visual-box">
              <div className="activation-center-stack">
                <div className="activation-center-icon">
                  <FaLock />
                </div>
                <div>Wallet not connected</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (contractsLoading) {
    return (
      <section className="activation-page">
        <div className="activation-hero__text-block activation-hero__text-block--loading">
          <div className="spinner"></div>
          <p>Loading contracts...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="activation-page">
      {!isOwnSpace && (
        <div
          className="activation-notices__item activation-notices__item--banner is-info"
        >
          <span className="activation-notices__dot" />
          <div>
            <h3 className="activation-notices__title">Viewing another member's space</h3>
            <p className="activation-notices__text">
              You are viewing {formatViewerAddress(viewer)} in read-only mode. Wallet actions are disabled until you return to your own space.
            </p>
            <button
              type="button"
              className="activation-next__button activation-next__button--compact"
              onClick={switchToSelf}
            >
              Return to My Space
            </button>
          </div>
        </div>
      )}

      {networkWarning && (
        <div
          className="activation-notices__item activation-notices__item--banner is-error"
        >
          <span className="activation-notices__dot activation-notices__dot--error" />
          <div>
            <h3 className="activation-notices__title activation-notices__title--inline">
              <FaExclamationTriangle /> Network Error
            </h3>
            <p className="activation-notices__text">
              Please switch to Polygon Amoy Testnet to continue. Actions are blocked until the network is correct.
            </p>
          </div>
        </div>
      )}

      {contractsError && (
        <div className="activation-notices__item activation-notices__item--banner is-error">
          <span className="activation-notices__dot activation-notices__dot--error" />
          <div>
            <h3 className="activation-notices__title">Contract Error</h3>
            <p className="activation-notices__text">{contractsError}</p>
          </div>
        </div>
      )}

      {txStatus.error && (
        <div className="activation-notices__item activation-notices__item--banner is-error">
          <span className="activation-notices__dot activation-notices__dot--error" />
          <div>
            <h3 className="activation-notices__title">Transaction Error</h3>
            <p className="activation-notices__text">{txStatus.error}</p>
          </div>
        </div>
      )}

      {txStatus.hash && (
        <div className="activation-notices__item activation-notices__item--banner is-info">
          <span className="activation-notices__dot" />
          <div>
            <h3 className="activation-notices__title">Transaction Submitted</h3>
            <p className="activation-notices__text">
              <a
                href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="activation-inline-link"
              >
                View on Polygonscan →
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="activation-hero">
        <div className="activation-hero__content">
          <div className="activation-hero__eyebrow glass-panel">
            <span className="activation-hero__eyebrow-dot" />
            <span className="activation-hero__eyebrow-text">
              Registration, readiness, and level progression
            </span>
          </div>

          <div className="activation-hero__text-block">
            <h1 className="activation-hero__title">Manage Your Level</h1>
            <p className="activation-hero__description soft-text">
              Track your level earnings, inspect orbit readiness, review token signals, and activate the next eligible level from one guided flow.
            </p>
            <div className="small muted-text">Last updated: {lastUpdated}</div>
          </div>

          <div className="activation-hero__chips">
            <span className="activation-hero__chip glass-panel">✓ Wallet Connected</span>
            <span className="activation-hero__chip glass-panel">
              {isOwnSpace ? 'Own Space' : 'Read-Only Visitor Mode'}
            </span>
            <span className={`activation-hero__chip glass-panel ${isRegistered ? '' : 'inactive'}`}>
              {isRegistered ? '✓ Registered' : '⚠ Not Registered'}
            </span>
            <span className="activation-hero__chip glass-panel">Highest Level: {highestLevel || 0}</span>
            {parseFloat(totalEarnings) > 0 && (
              <span className="activation-hero__chip glass-panel earnings-chip">
                Earned: {totalEarnings} USDT
              </span>
            )}
            {isDeployer && canWriteHere && (
              <span className="activation-hero__chip glass-panel deployer-chip">Deployer Mode</span>
            )}
            {isId1Wallet && (
              <span className="activation-hero__chip glass-panel id1-chip">⭐ ID1 Wallet</span>
            )}
          </div>
        </div>

        <div className="activation-hero__visual glass-panel">
          <div className="activation-hero__visual-header">
            <span className="activation-hero__visual-title">Level Progression</span>
            <span className="activation-hero__visual-status">{activatedCount}/10 Activated</span>
          </div>

          <div className="line-chart-container">
            <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                className="chart-line"
                points={chartPoints}
                fill="none"
                stroke="var(--glow-teal)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {lineChartData.map((d, i) => {
                const x = (i / 9) * 100
                const y = 100 - (d.cumulative / maxCumulative) * 80 - 10
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={d.activated ? 'var(--glow-teal)' : 'rgba(255,255,255,0.2)'}
                    stroke={d.activated ? 'white' : 'none'}
                    strokeWidth="1"
                  />
                )
              })}
            </svg>

            <div className="chart-labels">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <span key={level} className={`chart-label ${activeLevels[level] ? 'active' : ''}`}>
                  {level}
                </span>
              ))}
            </div>
          </div>

          <p className="activation-hero__visual-note muted-text">
            Cumulative progression. {activatedCount} of 10 levels activated.
          </p>

          {isRegistered ? <ReferralCard /> : <ReferralInvitationCard />}
        </div>
      </div>

      <section className="activation-levels glass-panel activation-levels--fullwidth">
        <div className="activation-section-heading">
          <span className="activation-section-heading__eyebrow muted-text">Levels 1-10</span>
        </div>

        <div className="activation-levels__grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
            const isActive = activeLevels[level]
            const isNext = level === nextLevel
            const canActivate = canActivateLevel(level)
            const price = Number(levelPrices[level] || 0)
            const orbitTypeForLevel = levelToOrbitType[level]
            const orbitData = orbitLevelData[level]
            // const earned = Number(
            //   orbitData?.totalEarned ??
            //   levelEarnings[level] ??
            //   0
            // )

            const levelFinance = financialByLevel[level] || {}
            const earned = Number(levelFinance.generated ?? levelEarnings[level] ?? 0)
            const walletCredited = Number(levelFinance.walletCredited ?? levelEarnings[level] ?? 0)
            const downlineCount = downlineData[level] || 0
            const spilloverCount = spilloverData[level] || 0
            const cycleInfo = cycleData[level]
            const viewerRole = viewerRoleByLevel[level]
            const lockedForUpgrade = parseFloat(userLocks[level] || '0')
            const upgradeRequired = upgradeRequirements[level]
            const upgradeProgress = (lockedForUpgrade / upgradeRequired) * 100
            const fgtEarned = tokenSummary.fgtByLevel[level] || 0
            const fgtrEarned = tokenSummary.fgtrByLevel[level] || 0
            const latestTokenEvent = tokenSummary.lastEventByLevel[level] || null
            const combinedRequired = level === 1 && !isRegistered ? 10 : price
            const hasEnoughBalance = parseFloat(usdtBalance) >= combinedRequired
            const isOpen = !!openLevelDetails[level]

            return (
              <div
                key={level}
                className={`activation-levels__card premium-card compact-level-card ${isActive ? 'activated' : ''} ${isNext ? 'next' : ''}`}
                style={{ background: getLevelBackground(level) }}
              >
                <div className="compact-level-card__header">
                  <div className="compact-level-card__header-left">
                    <span className={`status-dot ${isActive ? 'green' : isNext ? 'orange' : 'gray'}`}></span>
                    <span className="compact-level-card__level">Level {level}</span>
                  </div>
                  <span className="level-orbit">{orbitTypeForLevel}</span>
                </div>

                <div className={`compact-level-card__status ${isActive ? 'is-active' : isNext ? 'is-ready' : 'is-locked'}`}>
                  {isActive ? 'Activated' : isNext ? 'Ready to Activate' : 'Locked'}
                </div>

                <div className={`compact-level-card__price ${hasEnoughBalance ? 'is-sufficient' : 'is-insufficient'}`}>
                  {level === 1 && !isRegistered ? '10 USDT Onboarding' : `${price} USDT`}
                </div>

                <div className="compact-level-card__actions">
                  {isActive ? (
                    <button type="button" className="view-orbit-btn compact-action-btn compact-action-btn--single" onClick={() => handleViewLevelOrbit(level)}>
                      View Orbit <GoArrow />
                    </button>
                  ) : (
                    <>
                      <button type="button" className="view-orbit-btn compact-action-btn" onClick={() => handleViewLevelOrbit(level)}>
                        View Orbit <GoArrow />
                      </button>

                      {isNext && canActivate && canWriteHere ? (
                        <button
                          className="activate-btn compact-action-btn"
                          onClick={() => handleApproveAndActivate(level)}
                          disabled={!canWriteHere || txStatus.loading || !hasEnoughBalance || networkWarning}
                        >
                          {txStatus.loading
                            ? 'Processing...'
                            : level === 1 && !isRegistered
                              ? 'Register & Activate'
                              : 'Activate Orbit'}
                        </button>
                      ) : (
                        <button className="locked-btn compact-action-btn" disabled>
                          {canWriteHere ? 'Locked' : 'Read-Only'}
                        </button>
                      )}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="compact-level-card__toggle"
                  onClick={() => toggleLevelDetails(level)}
                  aria-expanded={isOpen}
                >
                  <span>{isOpen ? 'Hide Details' : 'Show Details'}</span>
                  {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                </button>

                {isOpen && (
                  <div className="compact-level-card__dropdown">
                    {isActive ? (
                      <>
                        <div className="level-metrics">
                          {/* <div className="metric-item">
                            <span className="metric-label">Total Earned</span>
                            <span className="metric-value">
                              {Number(earned) > 0 ? `${Number(earned).toFixed(2)} USDT` : '0.00 USDT'}
                            </span>
                          </div> */}
                          <div className="metric-item">
                            <span className="metric-label">Total Generated</span>
                            <span className="metric-value">{`${Number(earned || 0).toFixed(2)} USDT`}</span>
                          </div>

                          <div className="metric-item">
                            <span className="metric-label">Wallet Credited</span>
                            <span className="metric-value">{`${Number(walletCredited || 0).toFixed(2)} USDT`}</span>
                          </div>

                          {cycleInfo && (
                            <>
                              <div className="metric-item">
                                <span className="metric-label">Total Cycles</span>
                                <span className="metric-value">{cycleInfo.total}</span>
                              </div>
                              <div className="metric-item">
                                <span className="metric-label">Current Cycle</span>
                                <span className="metric-value">{cycleInfo.current}</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="token-metrics">
                          <div className="token-item">
                            <span className="token-item__label">FGT</span>
                            <strong className="token-item__value">{fgtEarned.toFixed(2)}</strong>
                          </div>
                          <div className="token-item">
                            <span className="token-item__label">FGTr</span>
                            <strong className="token-item__value">{fgtrEarned.toFixed(2)}</strong>
                          </div>
                        </div>

                        {latestTokenEvent && (
                          <div className="token-event-card">
                            <div className="token-event-card__top">
                              <span className="token-event-card__badge">{latestTokenEvent.token}</span>
                              <span className="token-event-card__time">
                                {latestTokenEvent.timestamp
                                  ? new Date(latestTokenEvent.timestamp * 1000).toLocaleString()
                                  : 'Recent event'}
                              </span>
                            </div>
                            <div className="token-event-card__body">
                              <strong>{latestTokenEvent.amount.toFixed(2)}</strong>
                              <span>{latestTokenEvent.reason}</span>
                            </div>
                          </div>
                        )}

                        {orbitData && (
                          <div className="orbit-stats-compact">
                            <div className="compact-stat">
                              <span><FaLayerGroup /> Positions</span>
                              <strong>{orbitData.positionsFilled}/{orbitData.totalPositions}</strong>
                            </div>
                            <div className="compact-stat">
                              <span><FaUsers /> Downline</span>
                              <strong>{downlineCount}</strong>
                            </div>
                            <div className="compact-stat">
                              <span><FaSyncAlt /> Spillover</span>
                              <strong>{spilloverCount}</strong>
                            </div>
                            {/* {orbitData && (
                              <div className="compact-stat earned">
                                <span><FaCoins /> Total</span>
                                <strong>{Number(orbitData.totalEarned || 0).toFixed(2)} USDT</strong>
                              </div>
                            )} */}
                            <div className="compact-stat earned">
                              <span><FaCoins /> Generated</span>
                              <strong>{Number(earned || 0).toFixed(2)} USDT</strong>
                            </div>
                          </div>
                        )}

                        {level === highestLevel && level < 10 && (
                          <div className="escrow-progress">
                            <div className="escrow-header">
                              <span><FaLock /> Escrow Locked for Level {level + 1}</span>
                              <span>{lockedForUpgrade.toFixed(2)} / {upgradeRequired} USDT</span>
                            </div>
                            <div className="escrow-track">
                              <div className="escrow-fill" style={{ width: `${Math.min(upgradeProgress, 100)}%` }} />
                            </div>
                            {upgradeProgress >= 100 && <div className="escrow-ready">✓ Auto-upgrade ready!</div>}
                          </div>
                        )}

                        {viewerRole && viewerRole !== 'NONE' && (
                          <div className="role-container">{getRoleBadge(viewerRole)}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="level-details">
                          <div className="detail-row">
                            <span>Balance:</span>
                            <strong className={hasEnoughBalance ? 'sufficient' : 'insufficient'}>
                              {usdtBalance} USDT
                            </strong>
                          </div>
                          <div className="detail-row">
                            <span>Requirement:</span>
                            <strong>
                              {level === 1 && !isRegistered ? '10 USDT total' : `${price} USDT`}
                            </strong>
                          </div>
                        </div>

                        <p className="level-description">
                          {level === 1 && !isRegistered
                            ? 'This step registers your wallet and activates Level 1 in one flow.'
                            : isNext
                              ? `Activate for ${price} USDT to unlock ${orbitTypeForLevel} Orbit.`
                              : `Requires Level ${level - 1} activation first.`}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="activation-main-grid">
        <div className="activation-main-grid__left">
          {!isRegistered && !isId1Wallet && !canWriteHere && (
            <section className="activation-registration-form glass-panel">
              <div className="activation-section-heading">
                <span className="activation-section-heading__eyebrow muted-text">Read-Only Viewing</span>
                <h2 className="activation-section-heading__title">Registration actions are disabled here</h2>
              </div>

              <div className="registration-warning">
                <div className="warning-header">This space is being viewed in read-only mode</div>
                <div className="warning-details">
                  <div>Viewed wallet: <strong>{formatViewerAddress(viewer)}</strong></div>
                  <div>Action state: <strong>Disabled</strong></div>
                </div>
              </div>

              <p className="soft-text">
                To enter a referrer, register, or activate levels, return to your own space.
              </p>
            </section>
          )}

          {isDeployer && canWriteHere && (
            <section className="deployer-faucet glass-panel">
              <div className="activation-section-heading">
                <span className="activation-section-heading__eyebrow muted-text">Deployer Tools</span>
                <h2 className="activation-section-heading__title">USDT faucet for testing</h2>
              </div>

              <div className="faucet-controls">
                <div className="faucet-switch">
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={!showTransferToSelf}
                      onChange={() => setShowTransferToSelf(!showTransferToSelf)}
                    />
                    <span>Transfer to specific address</span>
                  </label>
                </div>

                {showTransferToSelf ? (
                  <>
                    <div className="faucet-amount-group">
                      <input
                        type="number"
                        className="faucet-amount"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="Amount"
                      />
                      <button className="faucet-btn" onClick={handleTransferToSelf} disabled={txStatus.loading}>
                        {txStatus.loading ? 'Sending...' : 'Send to Self'}
                      </button>
                    </div>
                    <p className="faucet-hint">Transfer USDT to your own wallet for testing.</p>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      className="faucet-address"
                      value={transferAddress}
                      onChange={(e) => setTransferAddress(e.target.value)}
                      placeholder="Recipient Address (0x...)"
                    />
                    <div className="faucet-amount-group">
                      <input
                        type="number"
                        className="faucet-amount"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="Amount"
                      />
                      <button className="faucet-btn" onClick={handleTransferToAddress} disabled={txStatus.loading}>
                        {txStatus.loading ? 'Sending...' : 'Transfer'}
                      </button>
                    </div>
                    <p className="faucet-hint">Send USDT to any address for testing.</p>
                  </>
                )}

                <div className="deployer-balance">
                  Deployer USDT Balance: <strong>{deployerUsdtBalance} USDT</strong>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="activation-main-grid__right">
          <section className="activation-side-panel glass-panel">
            <div className="activation-side-panel__grid">
              <div className="activation-side-panel__column">
                <div className="activation-section-heading">
                  <span className="activation-section-heading__eyebrow muted-text">Notices</span>
                  <h2 className="activation-section-heading__title">Important warnings and platform guidance</h2>
                </div>

                <div className="activation-notices__list">
                  <div className="activation-notices__item is-warning">
                    <span className="activation-notices__dot" />
                    <div>
                      <h3 className="activation-notices__title">
                        {nextLevel
                          ? !isRegistered && nextLevel === 1
                            ? 'Onboarding requires 10 USDT'
                            : `Level ${nextLevel}: ${levelPrices[nextLevel]} USDT required`
                          : 'Maximum level achieved'}
                      </h3>
                      <p className="activation-notices__text soft-text">
                        {nextLevel
                          ? !isRegistered && nextLevel === 1
                            ? `Balance: ${usdtBalance} USDT. ${
                                parseFloat(usdtBalance) >= 10
                                  ? 'Sufficient funds available for registration and Level 1.'
                                  : `Need ${(10 - parseFloat(usdtBalance)).toFixed(2)} more USDT.`
                              }`
                            : `Balance: ${usdtBalance} USDT. ${
                                parseFloat(usdtBalance) >= parseFloat(levelPrices[nextLevel])
                                  ? 'Sufficient funds available.'
                                  : `Need ${(parseFloat(levelPrices[nextLevel]) - parseFloat(usdtBalance)).toFixed(2)} more USDT.`
                              }`
                          : 'All 10 levels are active. Open the Orbits page for deeper visibility into structure, receipts, and earnings flow.'}
                      </p>
                    </div>
                  </div>

                  <div className="activation-notices__item is-info">
                    <span className="activation-notices__dot" />
                    <div>
                      <h3 className="activation-notices__title">
                        {isId1Wallet ? 'ID1 Wallet Status' : referrer ? 'Sponsor confirmed' : 'No Referrer'}
                      </h3>
                      <p className="activation-notices__text soft-text">
                        {isId1Wallet
                          ? 'You are the ID1 wallet. All levels remain active by protocol design.'
                          : referrer
                            ? `Sponsored by ${referrer.slice(0, 8)}...${referrer.slice(-6)}`
                            : 'No referrer provided. You are connected directly to the protocol.'}
                      </p>
                    </div>
                  </div>

                  {(parseFloat(totalEarnings) > 0 || highestLevel > 0) && (
                    <div className="activation-notices__item is-info">
                      <span className="activation-notices__dot" />
                      <div>
                        <h3 className="activation-notices__title">
                          Total earnings: {parseFloat(totalEarnings || '0').toFixed(2)} USDT
                        </h3>
                        <p className="activation-notices__text soft-text">
                          Receipt-derived earnings are synced for this wallet. Current active level: {highestLevel || '—'}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="activation-side-panel__column">
                <div className="activation-section-heading">
                  <span className="activation-section-heading__eyebrow muted-text">FFN Space Portal</span>
                  <h2 className="activation-section-heading__title">Explore your orbit network</h2>
                </div>

                <div className="activation-visual__box orbit-preview" onClick={() => navigate('/orbits', {
                  state: {
                    level: highestLevel,
                    address: viewer,
                    displayId: myShortCode || '',
                    focusedOnly: true,
                    source: 'activation-center',
                  },
                })}>
                  {orbitDataLoading ? (
                    <div className="orbit-loading">Loading orbit data...</div>
                  ) : highestLevel > 0 && orbitLevelData[highestLevel] ? (
                    <div className="mini-orbit">
                      <div className="mini-orbit-core">
                        <span>L{highestLevel}</span>
                        <span className="mini-orbit-type">{levelToOrbitType[highestLevel]}</span>
                      </div>
                      <div className="mini-orbit-stats">
                        <div className="mini-stat"><FaLayerGroup /> {orbitLevelData[highestLevel].positionsFilled}/{orbitLevelData[highestLevel].totalPositions}</div>
                        <div className="mini-stat"><FaUsers /> {downlineData[highestLevel] || 0}</div>
                        <div className="mini-stat"><FaSyncAlt /> {spilloverData[highestLevel] || 0}</div>
                      </div>
                      <div className="mini-orbit-earn">
                        {parseFloat(totalEarnings || '0').toFixed(2)} USDT total earned
                      </div>
                      <div className="mini-orbit-subearn">
                        Level {highestLevel}: {parseFloat(levelEarnings[highestLevel] || 0).toFixed(2)} USDT • Cycles {cycleData[highestLevel]?.total || 0}
                      </div>
                    </div>
                  ) : (
                    <div className="activation-center-stack">
                      <div className="activation-space-icon">🌌</div>
                      <div className="activation-space-title">FFN Space</div>
                      <div className="activation-space-note">Click to explore your orbit ecosystem</div>
                    </div>
                  )}
                </div>

                <p className="activation-visual__note muted-text">
                  Open FFN Space to inspect orbit structure, downline positions, spillover visibility, and earnings flow.
                </p>
              </div>
            </div>
          </section>

          <button
            type="button"
            className="activation-next-float"
            aria-label="Open next action"
            onClick={() => setIsNextActionModalOpen(true)}
          >
            <FaInfoCircle />
          </button>

          {isNextActionModalOpen && (
            <div className="activation-overlay" role="dialog" aria-modal="true">
              <div className="activation-modal">
                <div className="activation-modal__top">
                  <h3 className="activation-modal__title">Next Action</h3>
                  <button
                    type="button"
                    className="activation-modal__close"
                    onClick={() => setIsNextActionModalOpen(false)}
                    aria-label="Close next action modal"
                  >
                    <FaTimesCircle />
                  </button>
                </div>

                <p className="activation-modal__text">
                  {!canWriteHere
                    ? "You are currently viewing another member's space. Progress and orbit state are visible, but wallet actions are disabled."
                    : nextLevel
                      ? !isRegistered && nextLevel === 1
                        ? 'Complete onboarding to register this wallet and activate Level 1 in a single action.'
                        : `Level ${nextLevel} requires ${levelPrices[nextLevel]} USDT and unlocks ${levelToOrbitType[nextLevel]} Orbit with new visibility and earning potential.`
                      : 'You have activated all 10 levels. Explore the Orbits page to inspect your full network and earnings.'}
                </p>

                <div className="activation-modal__actions">
                  {nextLevel && canWriteHere ? (
                    <button
                      type="button"
                      className="activation-modal__button activation-modal__button--primary"
                      onClick={() => {
                        setIsNextActionModalOpen(false)
                        handleApproveAndActivate(nextLevel)
                      }}
                      disabled={
                        txStatus.loading ||
                        !canActivateLevel(nextLevel) ||
                        parseFloat(usdtBalance) <
                          parseFloat(nextLevel === 1 && !isRegistered ? '10' : levelPrices[nextLevel]) ||
                        networkWarning
                      }
                    >
                      {txStatus.loading
                        ? 'Processing...'
                        : nextLevel === 1 && !isRegistered
                          ? 'Register & Activate Level 1'
                          : `Activate Level ${nextLevel} (${levelPrices[nextLevel]} USDT)`}
                    </button>
                  ) : null}

                  {highestLevel > 0 ? (
                    <button
                      type="button"
                      className="activation-modal__button activation-modal__button--ghost"
                      onClick={() => {
                        setIsNextActionModalOpen(false)
                        navigate('/orbits', {
                          state: {
                            level: highestLevel,
                            address: viewer,
                            displayId: myShortCode || '',
                            focusedOnly: true,
                            source: 'activation-center',
                          },
                        })
                      }}
                    >
                      Go to FFN Space
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {isEligibilityModalOpen && (
            <div className="activation-overlay" role="dialog" aria-modal="true">
              <div className="activation-modal">
                <div className="activation-modal__top">
                  <h3 className="activation-modal__title">
                    Eligibility Check
                    {pendingActivationLevel ? ` · Level ${pendingActivationLevel}` : ''}
                  </h3>
                </div>

                <p className="activation-modal__text">
                  Required conditions before activation begins.
                </p>

                <div className="activation-check-modal__list">
                  {eligibilityChecksForModal.map((item, index) => {
                    const isVisible = index < visibleEligibilityCount
                    return (
                      <div
                        key={item.key}
                        className={`activation-check-modal__item ${
                          isVisible ? 'is-visible' : ''
                        } ${isVisible && item.passed ? 'is-passed' : ''}`}
                      >
                        <span className="activation-check-modal__icon">
                          {isVisible ? (item.passed ? <FaCheckCircle /> : <FaTimesCircle />) : <FaRegCircle />}
                        </span>

                        <div>
                          <div className="activation-check-modal__label">{item.label}</div>
                          <div className="activation-check-modal__hint">{item.hint}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {!isEligibilityAnimating &&
                eligibilityChecksForModal.some((item) => !item.passed) ? (
                  <div className="activation-modal__actions">
                    <button
                      type="button"
                      className="activation-modal__button activation-modal__button--ghost"
                      onClick={() => setIsEligibilityModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* SECURITY NOTICE POPUP - Appears BEFORE Registration Modal */}
          {showSecurityNotice && (
            <div className="activation-overlay" role="dialog" aria-modal="true">
              <div className="activation-modal activation-modal--security">
                <div className="activation-modal__top">
                  <div className="security-notice-badge">
                    <FaExclamationTriangle size={18} />
                    <span>Security & Legal Notice</span>
                  </div>
                  <button
                    type="button"
                    className="activation-modal__close"
                    onClick={() => setShowSecurityNotice(false)}
                    aria-label="Close security notice"
                  >
                    <FaTimesCircle />
                  </button>
                </div>

                <h3 className="activation-modal__title security-notice-title">Important Notice — Please Read Carefully</h3>

                <div className="security-notice-sections">
                  <div className="security-notice-section">
                    <div className="security-notice-section__icon">🔐</div>
                    <div className="security-notice-section__content">
                      <h4>Wallet Security</h4>
                      <p>You are solely responsible for securing your wallet. Never share your private key or secret recovery phrase with anyone — including sponsors, support staff, or administrators. Fin Freedom Network will never request your private key.</p>
                    </div>
                  </div>

                  <div className="security-notice-section">
                    <div className="security-notice-section__icon">🔒</div>
                    <div className="security-notice-section__content">
                      <h4>Irreversible Registration</h4>
                      <p>Wallet addresses cannot be changed after registration. If your wallet has been compromised, you must create a new wallet before registering.</p>
                    </div>
                  </div>

                  <div className="security-notice-section">
                    <div className="security-notice-section__icon">⛓️</div>
                    <div className="security-notice-section__content">
                      <h4>Decentralized Participation</h4>
                      <p>Transactions are irreversible once confirmed on the blockchain. Always verify transaction details before signing.</p>
                    </div>
                  </div>
                </div>

                <div className="security-notice-acknowledgment">
                  <p>By clicking "I Understand & Proceed", you confirm that you understand the above and accept full responsibility for your wallet security.</p>
                </div>

                <div className="activation-modal__actions activation-modal__actions--double">
                  <button
                    type="button"
                    className="activation-modal__button activation-modal__button--ghost"
                    onClick={() => setShowSecurityNotice(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="activation-modal__button activation-modal__button--primary"
                    onClick={handleProceedToRegistration}
                  >
                    I Understand & Proceed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Registration Modal with simplified referral */}
          {isRegistrationModalOpen && (
            <div className="activation-overlay" role="dialog" aria-modal="true">
              <div className="activation-modal">
                <div className="activation-modal__top">
                  <h3 className="activation-modal__title">Complete Registration</h3>
                  <button
                    type="button"
                    className="activation-modal__close"
                    onClick={() => setIsRegistrationModalOpen(false)}
                    aria-label="Close registration modal"
                  >
                    <FaTimesCircle />
                  </button>
                </div>

                <p className="activation-modal__text">
                  You are not registered yet. Complete registration to activate Level 1 and start your journey.
                </p>

                <div className="registration-warning registration-warning--spaced">
                  <div className="warning-header">Onboarding Details</div>
                  <div className="warning-details">
                    <div>Registration + Level 1: <strong>10 USDT total</strong></div>
                    <div>Your USDT Balance: <strong>{usdtBalance} USDT</strong></div>
                    <div>Current Allowance: <strong>{allowance} USDT</strong></div>
                  </div>
                </div>

                <div className="referrer-input-group">
                  <label className="referrer-label">
                    {incomingReferrer || referrerInputDisplay
                      ? `Referrer detected: ${referrerInputDisplay || incomingReferrer}`
                      : 'Do you have a referrer? Paste your referral ID, link, or wallet address below.'}
                  </label>
                  <input
                    type="text"
                    className={`referrer-input ${referrerInputDisplay ? 'has-referrer' : ''}`}
                    placeholder="Paste referral ID, referral link, or wallet address"
                    value={referrerInputDisplay}
                    onChange={(e) => {
                      const value = normalizeReferralInput(e.target.value)

                      setReferrerInputDisplay(value)
                      setIncomingReferrer(value)

                      if (!value) {
                        setRegistrationReferrer('')
                        setResolvedReferrerStatus(
                          'No referral added. The system ID will be used.'
                        )
                        return
                      }

                      if (ethers.isAddress(value)) {
                        setRegistrationReferrer(value)
                        setResolvedReferrerStatus(
                          'Wallet address added. You can still change it before registration.'
                        )
                        return
                      }

                      setRegistrationReferrer('')
                      setResolvedReferrerStatus(
                        'Referral ID added. We will check it when you register.'
                      )
                    }}
                  />
                  <p className="referrer-hint">
                    {resolvedReferrerStatus ||
                      'You can enter a referral ID, paste a referral link, or leave it empty to use the system ID.'}
                  </p>
                </div>

                {parseFloat(usdtBalance) < 10 && (
                  <div className="insufficient-funds-warning">
                    ⚠ Insufficient USDT balance. Need 10 USDT for onboarding.
                  </div>
                )}

                <div className="activation-modal__actions">
                  <button
                    type="button"
                    className="activation-modal__button activation-modal__button--ghost"
                    onClick={() => setIsRegistrationModalOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="activation-modal__button activation-modal__button--primary"
                    onClick={handleRegisterFromModal}
                    disabled={txStatus.loading || referrerResolveLoading || parseFloat(usdtBalance) < 10 || networkWarning}
                  >
                    {txStatus.loading || referrerResolveLoading
                      ? 'Preparing registration...'
                      : 'Register & Activate Level 1'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

export default ActivationCenterPage