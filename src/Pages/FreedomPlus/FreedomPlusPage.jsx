import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { Activity, AlertTriangle, ArrowRight, ArrowUpRight, Check, CheckCircle2, Coins, History, LayoutDashboard, Lock, LockKeyhole, Network, RefreshCw, ShieldCheck, Trophy, User, UserPlus, Wallet } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWallet } from '../../hooks/useWallet'
import { CHAIN_ID, NETWORK_CONFIG } from '../../constants/addresses'
import { web3Service } from '../../Services/web3'
import { useToast } from '../../components/feedback'
import { InlineAlert } from '../../components/ui'
import { TransactionStatus } from '../../components/feedback'
import { ProgressionLineChart } from '../../components/charts/InstitutionalCharts'
import { normalizeError } from '../../utils/errorMap'
import { buildTxOptions } from '../../utils/txOptions'
import { createRequestGate, optionalRead, retainedRead, skippedRead } from '../../utils/walletReads.js'
import FreedomPlusOrbit from './FreedomPlusOrbit'
import FreedomPlusActivationCenter from './FreedomPlusActivationCenter'
import FreedomPlusFocusedOrbit from './FreedomPlusFocusedOrbit'
import FreedomPlusOverview from './FreedomPlusOverview'
import FreedomPlusTokens from './FreedomPlusTokens'
import FreedomNftOverview from './FreedomNftOverview'
import { FreedomNftMembership, FreedomNftRewards, FreedomNftSuccessModal } from './FreedomNftPages'
import {
  FREEDOM_PLUS_ADDRESSES,
  FREEDOM_PLUS_ENABLED,
  FREEDOM_PLUS_LEVELS,
  NFT_TIERS,
  formatToken,
  freedomPlusApi,
  getFreedomPlusReadContracts,
  getFreedomPlusWriteContracts,
  tokenUnits,
} from '../../Services/freedomPlus'
import './FreedomPlusPage.css'
import './FreedomNftPages.css'

const ZERO = ethers.ZeroAddress
const GAS_BUFFER_BPS = 12500n
const withGasBuffer = (estimate) => (BigInt(estimate) * GAS_BUFFER_BPS) / 10000n
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const INDEX_RETRY_DELAYS = [800, 1400, 2200, 3200, 4500]
const VIEW_ROUTES = {
  overview: '/freedom-plus',
  dashboard: '/freedom-plus/dashboard',
  levels: '/freedom-plus/activation',
  orbits: '/freedom-plus/orbits',
  tokens: '/freedom-plus/tokens',
  activity: '/freedom-plus/activity',
  account: '/freedom-plus/account',
  nftOverview: '/freedom-nft',
  membership: '/freedom-nft/membership',
  rewards: '/freedom-nft/rewards',
}
const PROGRAM_TABS = [
  ['overview', <LayoutDashboard />, 'Overview'],
  ['levels', <Coins />, 'Activation'],
  ['tokens', <Coins />, 'FPT / FPTr'],
]
const NFT_TABS = [
  ['nftOverview', <ShieldCheck />, 'NFT Program'],
  ['membership', <LockKeyhole />, 'Membership'],
  ['rewards', <Trophy />, 'Rewards'],
]

function short(value) {
  return value && ethers.isAddress(value) ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'Not available'
}

function normalizeMembership(raw) {
  return {
    tier: Number(raw?.tier ?? raw?.[0] ?? 0),
    tokenId: String(raw?.tokenId ?? raw?.[1] ?? 0),
    lockedFGT: raw?.lockedFGT ?? raw?.[2] ?? 0n,
    lockedFPT: raw?.lockedFPT ?? raw?.[3] ?? 0n,
    rewardEligible: Boolean(raw?.rewardEligible ?? raw?.[4]),
  }
}

export default function FreedomPlusPage(props) {
  const { account } = useWallet()
  return <WalletProgramPage key={account?.toLowerCase() || 'disconnected'} {...props} />
}

function WalletProgramPage({ initialTab = 'overview' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { account, isConnected, connect } = useWallet()
  const toast = useToast()
  const [tab, setTab] = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [sponsor, setSponsor] = useState('')
  const [sponsorCode, setSponsorCode] = useState('')
  const [referralId, setReferralId] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [cycle, setCycle] = useState('')
  const [data, setData] = useState(null)
  const [orbit, setOrbit] = useState([])
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [status, setStatus] = useState(null)
  const [reconciliation, setReconciliation] = useState(null)
  const [nftForm, setNftForm] = useState({ tier: 1, fgt: '0', fpt: '5700' })
  const [unlockForm, setUnlockForm] = useState({ fgt: '0', fpt: '0' })
  const [rewardPeriods, setRewardPeriods] = useState([])
  const [txState, setTxState] = useState({ status: 'idle', stage: 'idle', hash: '', note: '', error: null })
  const [activationSummary, setActivationSummary] = useState(null)
  const [networkReady, setNetworkReady] = useState(false)
  const [gateway, setGateway] = useState({ registered: false, levelOneActive: false })
  const [nftSuccess, setNftSuccess] = useState(null)
  const [readIssues, setReadIssues] = useState([])
  const [rewardPeriodsVerified, setRewardPeriodsVerified] = useState(false)
  const loadGate = useRef(createRequestGate())
  const orbitGate = useRef(createRequestGate())
  const activationInFlight = useRef(false)

  const activeLevels = useMemo(() => new Set((data?.levels || []).filter((item) => item.active).map((item) => Number(item.level))), [data])
  const membershipVerified = data?.chain?.membership != null && !readIssues.includes('NFT membership')
  const membershipActionsReady = membershipVerified && !loading && isConnected && networkReady
  const membership = data?.chain?.membership || normalizeMembership(null)
  const displayBalance = (value) => value == null ? 'Temporarily unavailable' : value
  const selectedLevelConfig = FREEDOM_PLUS_LEVELS.find((item) => item.level === selectedLevel)
  const orbitCycles = useMemo(() => [...new Set(orbit.map((item) => Number(item.cycle)))].sort((a, b) => b - a), [orbit])
  const visualOrbit = useMemo(() => {
    if (cycle !== '') return orbit
    const currentCycle = orbitCycles[0]
    return currentCycle == null ? orbit : orbit.filter((item) => Number(item.cycle) === currentCycle)
  }, [cycle, orbit, orbitCycles])
  const paymentTotal = useMemo(
    () => (data?.payments || []).reduce((total, item) => total + BigInt(item.amount || 0), 0n),
    [data]
  )
  const isProgramOverview = tab === 'overview'
  const isNftView = NFT_TABS.some(([value]) => value === tab)
  const needsUsdtBalance = ['levels', 'dashboard', 'tokens', 'account', 'membership'].includes(tab)
  const needsProgramTokenBalances = ['dashboard', 'tokens', 'account'].includes(tab)
  const needsNftTokenBalances = ['membership', 'rewards'].includes(tab)
  const needsRewards = tab === 'rewards'
  const visibleTabs = isNftView ? NFT_TABS : PROGRAM_TABS
  const nextLevel = FREEDOM_PLUS_LEVELS.find((item) => !activeLevels.has(item.level))?.level || null
  const progressionData = useMemo(() => {
    let cumulative = 0
    return FREEDOM_PLUS_LEVELS.map((item) => {
      const activated = activeLevels.has(item.level)
      if (activated) cumulative += 1
      return { level: item.level, activated, cumulative }
    })
  }, [activeLevels])

  const openView = (view) => {
    setTab(view)
    navigate(VIEW_ROUTES[view])
  }

  const load = useCallback(async (options = {}) => {
    const isCurrent = loadGate.current.begin()
    const forceChain = options?.forceChain === true
    if (!FREEDOM_PLUS_ENABLED || !account) return
    setLoading(true)
    if (needsRewards) setRewardPeriodsVerified(false)
    try {
      const contracts = getFreedomPlusReadContracts({ includeNft: isNftView })
      const [participantRead, apiActivationSummary, apiStatus, apiReconciliation, periodsRead, identity, usdt, fgt, fptTotal, fptAvailable, fptLocked, fptrTotal, fptrAvailable, fptrLocked, membershipRaw] = await Promise.all([
        optionalRead(freedomPlusApi.participant(account)),
        tab === 'levels' ? freedomPlusApi.activationSummary(account).catch(() => null) : Promise.resolve(null),
        tab === 'activity' ? freedomPlusApi.status().catch(() => null) : Promise.resolve(null),
        tab === 'activity' ? freedomPlusApi.reconciliation().catch(() => null) : Promise.resolve(null),
        needsRewards ? optionalRead(freedomPlusApi.rewardPeriods()) : Promise.resolve(skippedRead),
        freedomPlusApi.referralForWallet(account).catch(() => null),
        needsUsdtBalance ? optionalRead(contracts.usdt.balanceOf(account)) : Promise.resolve(skippedRead),
        needsNftTokenBalances ? optionalRead(contracts.fgt.availableBalanceOf(account)) : Promise.resolve(skippedRead),
        needsProgramTokenBalances ? optionalRead(contracts.fpt.balanceOf(account)) : Promise.resolve(skippedRead),
        needsProgramTokenBalances || needsNftTokenBalances ? optionalRead(contracts.fpt.availableBalanceOf(account)) : Promise.resolve(skippedRead),
        needsProgramTokenBalances ? optionalRead(contracts.fpt.lockedBalanceOf(account)) : Promise.resolve(skippedRead),
        needsProgramTokenBalances ? optionalRead(contracts.fptr.balanceOf(account)) : Promise.resolve(skippedRead),
        needsProgramTokenBalances ? optionalRead(contracts.fptr.availableBalanceOf(account)) : Promise.resolve(skippedRead),
        needsProgramTokenBalances ? optionalRead(contracts.fptr.lockedBalanceOf(account)) : Promise.resolve(skippedRead),
        isNftView ? optionalRead(contracts.nftMembership.membershipOf(account)) : Promise.resolve(skippedRead),
      ])
      if (!isCurrent()) return
      const apiData = participantRead.ok ? participantRead.value : null
      const periods = periodsRead.ok ? periodsRead.value : []
      let gatewayData = apiData?.gateway || {}
      if (!gatewayData.registered || !gatewayData.levelOneActive || (!ethers.isAddress(gatewayData.sponsor || '') || gatewayData.sponsor === ZERO || gatewayData.sponsor?.toLowerCase() === account.toLowerCase())) {
        try {
          const registration = web3Service.getReadContracts().registration
          const [registered, levelOneActive, sponsor, id1Wallet] = await Promise.all([
            registration.isRegistered(account),
            registration.isLevelActivated(account, 1),
            registration.getReferrer(account),
            web3Service.getReadContracts().levelManager.id1Wallet(),
          ])
          gatewayData = {
            ...gatewayData,
            registered: Boolean(gatewayData.registered || registered),
            levelOneActive: Boolean(gatewayData.levelOneActive || levelOneActive),
            sponsor: ethers.isAddress(gatewayData.sponsor || '') && gatewayData.sponsor !== ZERO && gatewayData.sponsor.toLowerCase() !== account.toLowerCase() ? gatewayData.sponsor : sponsor !== ZERO && sponsor.toLowerCase() !== account.toLowerCase() ? sponsor : id1Wallet,
          }
        } catch {
          // Keep the indexed API snapshot when the browser RPC fallback is unavailable.
        }
      }
      const indexedLevels = new Map((apiData?.levels || []).map((item) => [Number(item.level), item]))
      let registrationVerified = Boolean(apiData?.participant)
      let chainRegistration = Boolean(apiData?.participant?.registered)
      const chainLevels = new Map()
      if (forceChain || !apiData?.participant || (apiData?.levels || []).length === 0) {
        const registeredOnChain = await contracts.registration.isRegistered(account).catch(() => null)
        if (registeredOnChain != null) {
          chainRegistration = Boolean(registeredOnChain)
          registrationVerified = true
        }
        if (chainRegistration) {
          const results = await Promise.all(FREEDOM_PLUS_LEVELS.map((item) => contracts.registration.isLevelActive(account, item.level).catch(() => null)))
          results.forEach((active, index) => { if (active != null) chainLevels.set(FREEDOM_PLUS_LEVELS[index].level, Boolean(active)) })
        }
      }
      if (!registrationVerified) throw new Error('Freedom-Plus account status is temporarily unavailable. Refresh to retry.')
      const levels = FREEDOM_PLUS_LEVELS.map((config) => ({ ...indexedLevels.get(config.level), ...config, active: Boolean(indexedLevels.get(config.level)?.active || chainLevels.get(config.level)) }))
      const requestedReads = [
        [needsUsdtBalance, 'USDT balance', usdt],
        [needsNftTokenBalances, 'FGT balance', fgt],
        [needsProgramTokenBalances, 'FPT total', fptTotal],
        [needsProgramTokenBalances || needsNftTokenBalances, 'FPT available', fptAvailable],
        [needsProgramTokenBalances, 'FPT locked', fptLocked],
        [needsProgramTokenBalances, 'FPTr total', fptrTotal],
        [needsProgramTokenBalances, 'FPTr available', fptrAvailable],
        [needsProgramTokenBalances, 'FPTr locked', fptrLocked],
        [isNftView, 'NFT membership', membershipRaw],
      ]
      if (!isCurrent()) return
      setReadIssues([
        ...requestedReads.filter(([requested, , result]) => requested && !result.ok).map(([, label]) => label),
        ...(!participantRead.ok ? ['Account history'] : []),
        ...(needsRewards && !periodsRead.ok ? ['Reward periods'] : []),
      ])
      setData((current) => ({
        ...(apiData || current || {}),
        levels: participantRead.ok ? levels : levels.map((item) => ({
          ...item,
          active: chainLevels.has(item.level) ? chainLevels.get(item.level)
            : current?.levels?.find((level) => Number(level.level) === item.level)?.active ?? item.active,
        })),
        chain: {
          registered: chainRegistration || (!participantRead.ok && Boolean(current?.chain?.registered)),
          participantNumber: String(apiData?.participant?.participantNumber || 0),
          sponsor: apiData?.participant?.sponsor || ZERO,
          usdt: retainedRead(usdt, current?.chain?.usdt, formatToken),
          usdtRaw: usdt.ok ? usdt.value : null,
          fgt: retainedRead(fgt, current?.chain?.fgt, formatToken),
          fpt: retainedRead(fptAvailable, current?.chain?.fpt, formatToken),
          fptTotal: retainedRead(fptTotal, current?.chain?.fptTotal, formatToken),
          fptLocked: retainedRead(fptLocked, current?.chain?.fptLocked, formatToken),
          fptr: retainedRead(fptrAvailable, current?.chain?.fptr, formatToken),
          fptrTotal: retainedRead(fptrTotal, current?.chain?.fptrTotal, formatToken),
          fptrLocked: retainedRead(fptrLocked, current?.chain?.fptrLocked, formatToken),
          membership: retainedRead(membershipRaw, current?.chain?.membership, normalizeMembership),
        },
      }))
      setStatus(apiStatus)
      setActivationSummary(apiActivationSummary)
      setReconciliation(apiReconciliation)
      setGateway({ registered: Boolean(gatewayData.registered), levelOneActive: Boolean(gatewayData.levelOneActive) })
      setReferralId(identity?.referralId || identity?.shortCode || '')
      setSponsorCode(identity?.referredByCode || '')
      const enrichedPeriods = await Promise.all((periods || []).map(async (period) => {
        try {
          const proof = await freedomPlusApi.rewardProof(period.periodId, account)
          const published = period.status === 'published'
          const [claimed, chainPeriod] = published
            ? await Promise.all([
                contracts.nftRewardDistributor.claimed(period.periodId, account),
                contracts.nftRewardDistributor.periodOf(period.periodId),
              ])
            : [false, null]
          return {
            ...period,
            proof,
            claimed: Boolean(claimed),
            reward: proof.eligible && chainPeriod ? chainPeriod.rewardPerMember[proof.tier - 1] : 0n,
          }
        } catch (error) {
          return { ...period, proof: null, claimed: false, reward: 0n, readError: error?.message || 'Reward details unavailable' }
        }
      }))
      if (!isCurrent()) return
      if (needsRewards && periodsRead.ok) setRewardPeriods(enrichedPeriods)
      setRewardPeriodsVerified(needsRewards && periodsRead.ok)
      if (chainRegistration && apiData?.participant?.sponsor && apiData.participant.sponsor !== ZERO) {
        setSponsor(apiData.participant.sponsor)
      } else if (ethers.isAddress(gatewayData.sponsor || '') && gatewayData.sponsor !== ZERO && gatewayData.sponsor.toLowerCase() !== account.toLowerCase()) {
        setSponsor(gatewayData.sponsor)
      } else if (identity?.referredByWallet && identity.referredByWallet !== ZERO) {
        setSponsor(identity.referredByWallet)
      }
    } catch (error) {
      if (isCurrent()) {
        setReadIssues(['Wallet data', 'NFT membership'])
        toast.error(error?.shortMessage || error?.message || 'Unable to load Freedom-Plus data.')
      }
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [account, isNftView, needsNftTokenBalances, needsProgramTokenBalances, needsUsdtBalance, needsRewards, tab, toast])

  useEffect(() => {
    load()
    return () => loadGate.current.cancel()
  }, [load])
  useEffect(() => { setTab(initialTab) }, [initialTab])
  useEffect(() => {
    const routedLevel = Number(location.state?.level || 0)
    if (initialTab === 'orbits' && routedLevel >= 1 && routedLevel <= 7) {
      setSelectedLevel(routedLevel)
      setCycle('')
      setSelectedPosition(null)
    }
  }, [initialTab, location.state])
  useEffect(() => {
    if (!isConnected) return
    const provider = web3Service.getEip1193Provider() || window.ethereum
    const checkNetwork = async () => {
      try {
        const value = await provider?.request?.({ method: 'eth_chainId' })
        setNetworkReady(String(value || '').toLowerCase() === CHAIN_ID.toLowerCase())
      } catch {
        setNetworkReady(false)
      }
    }
    checkNetwork()
    provider?.on?.('chainChanged', checkNetwork)
    return () => provider?.removeListener?.('chainChanged', checkNetwork)
  }, [account, isConnected])

  const loadOrbit = useCallback(async () => {
    const isCurrent = orbitGate.current.begin()
    if (!account) return
    setLoading(true)
    try {
      const positions = await freedomPlusApi.orbit(account, selectedLevel, cycle)
      if (isCurrent()) setOrbit(positions)
    } catch (error) {
      if (isCurrent()) {
        setOrbit([])
        toast.error(error?.message || 'Unable to load this orbit.')
      }
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [account, cycle, selectedLevel, toast])

  useEffect(() => {
    setOrbit([])
    setSelectedPosition(null)
    if ((tab === 'orbits' || tab === 'levels') && account && data?.chain?.registered) loadOrbit()
    return () => orbitGate.current.cancel()
  }, [account, data?.chain?.registered, loadOrbit, tab])

  const reconcileAfterWrite = async ({ level, registration = false, hash }) => {
    setTxState({ status: 'running', stage: 'indexing', hash, note: 'Confirmed on-chain. Synchronizing your Freedom-Plus account state.', error: null })
    const read = getFreedomPlusReadContracts()
    const chainConfirmed = registration ? await read.registration.isRegistered(account) : await read.registration.isLevelActive(account, level)
    if (!chainConfirmed) throw new Error('The mined transaction did not produce the expected Freedom-Plus state.')
    await load({ forceChain: true })
    for (const wait of INDEX_RETRY_DELAYS) {
      const snapshot = await freedomPlusApi.participant(account).catch(() => null)
      const indexed = registration ? Boolean(snapshot?.participant?.registered) : Boolean((snapshot?.levels || []).find((item) => Number(item.level) === level)?.active)
      if (indexed) { await load(); return true }
      await delay(wait)
    }
    return false
  }

  const txErrorState = (error, fallback, hash = "") => {
    const normalized = normalizeError(error, fallback)
    return { status: "error", stage: "error", hash: hash || error?.transactionHash || error?.receipt?.hash || error?.replacement?.hash || "", note: "", error: normalized }
  }

  const sendBuffered = async (method, args = []) => {
    const signer = web3Service.getSigner()
    const estimate = await method.estimateGas(...args)
    return method(...args, await buildTxOptions({ signer, gasLimit: withGasBuffer(estimate) }))
  }

  const ensureApproval = async (contracts, price) => {
    const amount = tokenUnits(price)
    const allowance = await contracts.usdt.allowance(account, FREEDOM_PLUS_ADDRESSES.levelManager)
    if (allowance >= amount) return
    setTxState({ status: 'running', stage: 'signing', hash: '', note: 'Step 1 of 2: approve exactly ' + price.toLocaleString() + ' USDT. Activation has not started yet.', error: null })
    const approval = await sendBuffered(contracts.usdt.approve, [FREEDOM_PLUS_ADDRESSES.levelManager, amount])
    setTxState({ status: 'running', stage: 'pending', hash: approval.hash, note: 'USDT approval submitted. Waiting for confirmation before requesting the program transaction.', error: null })
    toast.info('USDT approval submitted. This is not the program activation.')
    const receipt = await approval.wait()
    if (!receipt || receipt.status !== 1) throw new Error('USDT approval was not confirmed successfully.')
    setTxState({ status: 'running', stage: 'signing', hash: '', note: 'Step 2 of 2: approval confirmed. Confirm the Freedom-Plus transaction in your wallet.', error: null })
  }

  const register = async () => {
    if (activationInFlight.current || busy) return
    activationInFlight.current = true
    setBusy('register')
    setTxState({ status: 'running', stage: 'preflight', hash: '', note: 'Checking sponsor, F-Freedom gateway, balance, allowance and network.', error: null })
    let hash = ""
    try {
      if (!isConnected || !account) throw new Error('Connect your wallet before continuing.')
      if (!networkReady) throw new Error('Switch to ' + NETWORK_CONFIG.chainName + ' before activating.')
      const gatewayRegistration = web3Service.getReadContracts().registration
      if (!(await gatewayRegistration.isLevelActivated(account, 1))) throw new Error('FFreedomLevelOneInactive')
      const sponsorWallet = sponsor.trim()
      if (!ethers.isAddress(sponsorWallet) || sponsorWallet === ZERO || sponsorWallet.toLowerCase() === account?.toLowerCase()) throw new Error('PermanentSponsorMismatch')
      const read = getFreedomPlusReadContracts()
      const price = tokenUnits(50)
      const balance = await read.usdt.balanceOf(account)
      if (balance < price) throw new Error('Insufficient USDT balance. Registration requires 50 USDT; this wallet has ' + formatToken(balance) + ' USDT.')
      if (await read.registration.isRegistered(account)) { await load({ forceChain: true }); throw new Error('AlreadyRegistered') }
      const contracts = getFreedomPlusWriteContracts()
      await ensureApproval(contracts, 50)
      setTxState({ status: 'running', stage: 'signing', hash: '', note: 'Confirm Freedom-Plus Level 1 activation in your wallet.', error: null })
      const tx = await sendBuffered(contracts.registration.register, [sponsorWallet])
      hash = tx.hash
      setTxState({ status: 'running', stage: 'pending', hash, note: 'Registration and Level 1 activation submitted. Waiting for confirmation.', error: null })
      const receipt = await tx.wait()
      if (!receipt || receipt.status !== 1) throw new Error('Registration transaction reverted.')
      const indexed = await reconcileAfterWrite({ level: 1, registration: true, hash })
      const note = indexed ? 'Registration, Level 1 activation and FPT issuance are confirmed and indexed.' : 'Registration and Level 1 are confirmed on-chain. Indexed details are still synchronizing.'
      setTxState({ status: 'complete', stage: 'complete', hash, note, error: null })
      toast.success(note)
    } catch (error) {
      setTxState(txErrorState(error, 'Freedom-Plus registration did not complete.', hash))
      toast.error(normalizeError(error, 'Freedom-Plus registration did not complete.').message)
    } finally { activationInFlight.current = false; setBusy("") }
  }

  const activate = async (level, price) => {
    if (activationInFlight.current || busy) return
    activationInFlight.current = true
    const key = 'level-' + level
    setBusy(key)
    setTxState({ status: 'running', stage: 'preflight', hash: '', note: 'Checking Level ' + level + ' eligibility, balance and previous-level state.', error: null })
    let hash = ""
    try {
      if (!isConnected || !account) throw new Error('Connect your wallet before continuing.')
      if (!networkReady) throw new Error('Switch to ' + NETWORK_CONFIG.chainName + ' before activating.')
      const read = getFreedomPlusReadContracts()
      if (!(await read.registration.isRegistered(account))) throw new Error('NotRegistered')
      if (level > 1 && !(await read.registration.isLevelActive(account, level - 1))) throw new Error('PreviousLevelInactive')
      if (await read.registration.isLevelActive(account, level)) { await load({ forceChain: true }); throw new Error('LevelAlreadyActive') }
      const balance = await read.usdt.balanceOf(account)
      if (balance < tokenUnits(price)) throw new Error('Insufficient USDT balance. Level ' + level + ' requires ' + price.toLocaleString() + ' USDT; this wallet has ' + formatToken(balance) + ' USDT.')
      const contracts = getFreedomPlusWriteContracts()
      await ensureApproval(contracts, price)
      setTxState({ status: 'running', stage: 'signing', hash: '', note: 'Confirm Level ' + level + ' activation in your wallet.', error: null })
      const tx = await sendBuffered(contracts.registration.activateLevel, [level])
      hash = tx.hash
      setTxState({ status: 'running', stage: 'pending', hash, note: 'Level ' + level + ' activation submitted. Waiting for confirmation.', error: null })
      const receipt = await tx.wait()
      if (!receipt || receipt.status !== 1) throw new Error('Level ' + level + ' activation reverted.')
      const indexed = await reconcileAfterWrite({ level, hash })
      const note = indexed ? 'Level ' + level + ' activation is confirmed and indexed.' : 'Level ' + level + ' is confirmed on-chain. Indexed details are still synchronizing.'
      setTxState({ status: 'complete', stage: 'complete', hash, note, error: null })
      toast.success(note)
    } catch (error) {
      setTxState(txErrorState(error, 'Level ' + level + ' activation did not complete.', hash))
      toast.error(normalizeError(error, 'Level ' + level + ' activation did not complete.').message)
    } finally { activationInFlight.current = false; setBusy("") }
  }
  const transact = async (key, operation, success) => {
    setBusy(key)
    setTxState({ status: 'running', stage: 'signing', hash: '', note: 'Review and confirm this action in your wallet.', error: null })
    let hash = ""
    try {
      const tx = await operation()
      hash = tx.hash
      setTxState({ status: 'running', stage: 'pending', hash, note: 'Transaction submitted. Waiting for confirmation.', error: null })
      const receipt = await tx.wait()
      if (!receipt || receipt.status !== 1) throw new Error('Transaction reverted.')
      setTxState({ status: 'complete', stage: 'complete', hash, note: success, error: null })
      toast.success(success)
      if (key === 'membership' || key === 'unlock' || key === 'restore' || key.startsWith('claim-')) {
        setNftSuccess({ title: key.startsWith('claim-') ? 'Reward claimed' : key === 'membership' ? 'Membership confirmed' : 'Qualification updated', message: success, hash })
      }
      await load({ forceChain: true })
      if (tab === 'orbits' || tab === 'levels') await loadOrbit()
    } catch (error) {
      setTxState(txErrorState(error, 'Transaction did not complete.', hash))
      toast.error(normalizeError(error, 'Transaction did not complete.').message)
    } finally { setBusy("") }
  }
  const submitMembership = () => {
    transact('membership', async () => {
    if (!membershipActionsReady) throw new Error('Refresh and verify membership on the correct network before continuing.')
    const tier = Number(nftForm.tier)
    const fgt = tokenUnits(nftForm.fgt)
    const fpt = tokenUnits(nftForm.fpt)
    const current = membership.tier
    const target = NFT_TIERS.find((item) => item.tier === tier)
      if (fgt < 0n || fpt < 0n) throw new Error('Token amounts cannot be negative.')
      if (!target || fgt + fpt !== tokenUnits(target.threshold)) {
        throw new Error(`The FGT and FPT commitment must total exactly ${target?.threshold?.toLocaleString() || 0} tokens for this tier.`)
      }
      const contracts = getFreedomPlusWriteContracts({ includeNft: true })
      const additionalFgt = fgt > membership.lockedFGT ? fgt - membership.lockedFGT : 0n
      const additionalFpt = fpt > membership.lockedFPT ? fpt - membership.lockedFPT : 0n
      const [availableFgt, availableFpt] = await Promise.all([
        contracts.fgt.availableBalanceOf(account),
        contracts.fpt.availableBalanceOf(account),
      ])
      if (availableFgt < additionalFgt) throw new Error(`Insufficient available FGT. This change requires ${formatToken(additionalFgt)} additional FGT.`)
      if (availableFpt < additionalFpt) throw new Error(`Insufficient available FPT. This change requires ${formatToken(additionalFpt)} additional FPT.`)
      if (current === tier) throw new Error('Choose a different membership tier or use the qualification controls below.')
      if (current === 0) {
        return sendBuffered(contracts.nftMembership.mintMembership, [tier, fgt, fpt])
      }
      if (tier > current) {
        return sendBuffered(contracts.nftMembership.upgradeMembership, [tier, fgt, fpt])
      }
      return sendBuffered(contracts.nftMembership.downgradeMembership, [tier, fgt, fpt])
    }, 'Freedom NFT membership updated and qualifying balances reconciled.')
  }

  const unlockQualification = () => {
    transact('unlock', async () => {
    if (!membershipActionsReady) throw new Error('Refresh and verify membership on the correct network before continuing.')
    const contracts = getFreedomPlusWriteContracts({ includeNft: true })
    const fgt = tokenUnits(unlockForm.fgt)
    const fpt = tokenUnits(unlockForm.fpt)
      if (fgt < 0n || fpt < 0n) throw new Error('Token amounts cannot be negative.')
      if (fgt + fpt === 0n) throw new Error('Enter at least one qualifying token amount to unlock.')
      if (fgt > membership.lockedFGT || fpt > membership.lockedFPT) throw new Error('The unlock amount exceeds the tokens currently locked in this membership.')
      return sendBuffered(contracts.nftMembership.unlockQualification, [fgt, fpt])
    }, 'Qualifying tokens unlocked. Reward eligibility recalculated.')
  }

  const restoreEligibility = () => {
    transact('restore', async () => {
    if (!membershipActionsReady) throw new Error('Refresh and verify membership on the correct network before continuing.')
    const contracts = getFreedomPlusWriteContracts({ includeNft: true })
    const fgt = tokenUnits(unlockForm.fgt)
    const fpt = tokenUnits(unlockForm.fpt)
      if (fgt < 0n || fpt < 0n) throw new Error('Token amounts cannot be negative.')
      const threshold = tokenUnits(NFT_TIERS.find((item) => item.tier === membership.tier)?.threshold || 0)
      const missing = threshold - membership.lockedFGT - membership.lockedFPT
      if (fgt + fpt !== missing) throw new Error(`Restoration requires exactly ${formatToken(missing)} qualifying tokens.`)
      const [availableFgt, availableFpt] = await Promise.all([contracts.fgt.availableBalanceOf(account), contracts.fpt.availableBalanceOf(account)])
      if (availableFgt < fgt || availableFpt < fpt) throw new Error('The selected FGT/FPT restoration split exceeds the available qualifying balance.')
      return sendBuffered(contracts.nftMembership.restoreEligibility, [fgt, fpt])
    }, 'Freedom NFT reward eligibility restored.')
  }

  if (!FREEDOM_PLUS_ENABLED) {
    return <main className={tab === 'levels' ? 'freedom-plus-activation-shell' : 'freedom-plus-page'}><section className="fp-empty"><ShieldCheck /><h1>Freedom-Plus is not enabled</h1><p>This environment has not been connected to a verified Freedom-Plus deployment.</p></section></main>
  }

  return (
    <main className={tab === 'levels' ? 'freedom-plus-activation-shell' : tab === 'orbits' ? 'freedom-plus-page freedom-plus-orbit-shell' : 'freedom-plus-page'}>
      {!isProgramOverview && tab !== 'levels' && tab !== 'nftOverview' && tab !== 'tokens' && tab !== 'orbits' && <header className="fp-header">
        <div><span className="fp-kicker">{isNftView ? 'Membership and long-term value' : 'Advanced participation'}</span><h1>{isNftView ? 'Freedom NFT' : 'Freedom-Plus'}</h1><p>{isNftView ? 'Token-backed membership, immediate qualification status and transparent monthly rewards.' : 'Seven manually activated levels, deterministic orbit placement and long-term Freedom NFT progression.'}</p></div>
        <button className="fp-icon-button" type="button" onClick={load} disabled={loading} title="Refresh chain and indexed data"><RefreshCw className={loading ? 'spin' : ''} /></button>
      </header>}

      {!isProgramOverview && tab !== 'levels' && tab !== 'nftOverview' && tab !== 'orbits' && !isConnected && (
        <section className="fp-connect"><Wallet /><div><h2>Connect your wallet</h2><p>Connect on the configured Polygon network to view or manage Freedom-Plus.</p></div><button type="button" onClick={connect}>Connect</button></section>
      )}

      {isConnected && readIssues.length > 0 && (
        <section className="fp-read-warning" role="status">
          <AlertTriangle />
          <div><strong>Some live wallet values are temporarily unavailable</strong><p>{readIssues.join(', ')}. Any previously loaded values are retained for reference; their current values could not be verified.</p></div>
          <button type="button" onClick={() => load({ forceChain: true })} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} />Retry</button>
        </section>
      )}

      {!isProgramOverview && tab !== 'levels' && tab !== 'nftOverview' && tab !== 'tokens' && tab !== 'orbits' && isConnected && (
        <section className="fp-metrics">
            <article><span>FFN ID</span><strong>{gateway.registered || data?.chain?.registered ? (referralId || 'Resolving...') : 'Not registered'}</strong><small>{short(account)}</small></article>
            {isNftView
              ? <article><span>FGT available</span><strong>{displayBalance(data?.chain?.fgt)}</strong><small>From F-Freedom; not locked</small></article>
              : <article><span>Freedom-Plus levels</span><strong>{activeLevels.size} / 7</strong><small>Freedom-Plus progression only</small></article>}
            {isNftView
              ? <article><span>FPT available</span><strong>{displayBalance(data?.chain?.fpt)}</strong><small>From Freedom-Plus; not locked</small></article>
              : <article><span>USDT available</span><strong>{displayBalance(data?.chain?.usdt)}{data?.chain?.usdt != null ? ' USDT' : ''}</strong><small>Wallet balance</small></article>}
            {isNftView
              ? <article><span>NFT qualification locked</span><strong>{membershipVerified ? formatToken(membership.lockedFGT + membership.lockedFPT) + ' tokens' : 'Temporarily unavailable'}</strong><small>{membershipVerified ? formatToken(membership.lockedFGT) + ' FGT + ' + formatToken(membership.lockedFPT) + ' FPT' : 'Live membership verification pending'}</small></article>
              : <article><span>Program token balances</span><strong>{displayBalance(data?.chain?.fpt)} FPT / {displayBalance(data?.chain?.fptr)} FPTr</strong><small>Activation token / recycle token</small></article>}
        </section>
      )}

      {tab === 'levels' && isConnected && !networkReady && (
        <InlineAlert tone="warning" title={`Switch to ${NETWORK_CONFIG.chainName}`} icon={AlertTriangle}>
          <p>Your wallet is connected to another network. Registration and level activation remain blocked until the configured network is selected.</p>
        </InlineAlert>
      )}

      {tab === 'levels' && isConnected && loading && !data && (
        <section className="fp-activation-loading" aria-live="polite">
          <RefreshCw className="spin" /><div><h2>Loading activation state</h2><p>Confirming registration, active levels, balances and indexed orbit cycles.</p></div>
        </section>
      )}

      {!isProgramOverview && tab !== 'levels' && tab !== 'nftOverview' && tab !== 'orbits' && <nav className="fp-tabs" aria-label={isNftView ? 'Freedom NFT views' : 'Freedom-Plus views'}>
            {visibleTabs.map(([value, icon, label]) => (
              <button type="button" className={tab === value ? 'active' : ''} onClick={() => openView(value)} key={value}>{icon}{label}</button>
            ))}
      </nav>}

      {isConnected && (data?.chain?.registered || tab === 'levels' || isNftView) && <TransactionStatus txState={txState} onReset={() => setTxState({ status: 'idle', stage: 'idle', hash: '', note: '', error: null })} explorerBaseUrl={`${NETWORK_CONFIG.blockExplorerUrls[0]}/tx`} />}

          {tab === 'overview' && <FreedomPlusOverview registered={Boolean(data?.chain?.registered)} activeLevelCount={activeLevels.size} membershipTier={membership.tier} openView={openView} />}

          {tab === 'dashboard' && (
            <section className="fp-panel">
              <div className="fp-section-heading"><div><span className="fp-kicker">Wallet position</span><h2>Freedom-Plus dashboard</h2></div><button type="button" onClick={() => openView('activity')}>View activity<ArrowUpRight /></button></div>
              <div className="fp-dashboard-grid"><article><span>Progression</span><strong>{activeLevels.size} of 7 levels</strong><div className="fp-progress"><i style={{ width: `${(activeLevels.size / 7) * 100}%` }} /></div><small>{activeLevels.size === 7 ? 'All levels active' : `Level ${Math.min(activeLevels.size + 1, 7)} is next`}</small></article><article><span>Orbit records</span><strong>{data?.positions?.length || 0}</strong><small>Structural and payment placements</small></article><article><span>Wallet receipts</span><strong>{formatToken(paymentTotal)} USDT</strong><small>{data?.payments?.length || 0} payout components</small></article><article><span>Membership</span><strong>{NFT_TIERS.find((item) => item.tier === membership.tier)?.name || 'Not minted'}</strong><small>{membership.rewardEligible ? 'Reward eligible' : 'Not reward eligible'}</small></article></div>
              <div className="fp-split"><div><div className="fp-section-title"><Coins /><div><h2>Level progression</h2><p>Current on-chain activation state.</p></div></div><div className="fp-compact-levels">{FREEDOM_PLUS_LEVELS.map((item) => <button type="button" key={item.level} className={activeLevels.has(item.level) ? 'active' : ''} onClick={() => openView('levels')}><span>{item.level}</span><div><strong>{item.orbit}</strong><small>{activeLevels.has(item.level) ? 'Active' : 'Inactive'}</small></div></button>)}</div></div><div><div className="fp-section-title"><History /><div><h2>Recent receipts</h2><p>Latest indexed payout components.</p></div></div><div className="fp-recent-list">{data?.payments?.slice(0, 6).map((item) => <article key={item._id}><div><strong>Level {item.level} / Role {item.role}</strong><small>Block {item.blockNumber}</small></div><span>{formatToken(item.amount)} USDT</span></article>)}{!data?.payments?.length && <p className="fp-note">No payment receipts are indexed for this wallet.</p>}</div></div></div>
            </section>
          )}

          {tab === 'tokens' && <FreedomPlusTokens account={account} data={data} loading={loading} onRefresh={load} readIssues={readIssues} />}

          {tab === 'nftOverview' && <FreedomNftOverview membership={membership} membershipVerified={membershipVerified} formatToken={formatToken} openView={openView} />}

          {tab === 'rewards' && <FreedomNftRewards membership={membership} membershipVerified={membershipVerified} rewardPeriodsVerified={rewardPeriodsVerified} rewardPeriods={rewardPeriods} formatToken={formatToken} />}

          {tab === 'levels' && (
            <FreedomPlusActivationCenter
              account={account} isConnected={isConnected} connect={connect} data={data} loading={loading}
              networkReady={networkReady} networkName={NETWORK_CONFIG.chainName} levels={FREEDOM_PLUS_LEVELS}
              activeLevels={activeLevels} progressionData={progressionData} activationSummary={activationSummary}
              nextLevel={nextLevel} sponsor={sponsor} sponsorCode={sponsorCode} referralId={referralId} busy={busy}
              gateway={gateway}
              onRegister={register} onActivate={(item) => activate(item.level, item.price)}
              onViewOrbit={(level) => {
                setSelectedLevel(level)
                setCycle('')
                setSelectedPosition(null)
                setTab('orbits')
                navigate('/freedom-plus/orbits', { state: { level } })
              }}
              selectedLevel={selectedLevel} setSelectedLevel={setSelectedLevel} cycle={cycle} setCycle={setCycle}
              loadOrbit={loadOrbit} visualOrbit={visualOrbit} selectedConfig={selectedLevelConfig}
              selectedPosition={selectedPosition} setSelectedPosition={setSelectedPosition}
              formatToken={formatToken} short={short}
            />
          )}
          {tab === 'orbits' && (
            <FreedomPlusFocusedOrbit
              account={account}
              levels={FREEDOM_PLUS_LEVELS}
              activeLevels={activeLevels}
              selectedLevel={selectedLevel}
              setSelectedLevel={setSelectedLevel}
              config={selectedLevelConfig}
              cycle={cycle}
              setCycle={setCycle}
              cycles={orbitCycles}
              positions={visualOrbit}
              selectedPosition={selectedPosition}
              setSelectedPosition={setSelectedPosition}
              loading={loading}
              onRefresh={loadOrbit}
              onBack={() => navigate('/freedom-plus/activation')}
            />
          )}
          {tab === 'orbits' && <section className="fp-panel"><div className="fp-toolbar"><label>Level<select value={selectedLevel} onChange={(event) => { setSelectedLevel(Number(event.target.value)); setSelectedPosition(null) }}>{FREEDOM_PLUS_LEVELS.map((item) => <option key={item.level} value={item.level}>Level {item.level} / {item.orbit}</option>)}</select></label><label>Cycle<input type="number" min="1" value={cycle} placeholder="Current" onChange={(event) => { setCycle(event.target.value); setSelectedPosition(null) }} /></label><button type="button" onClick={loadOrbit}><RefreshCw />Refresh</button></div><div className="fp-orbit-summary"><article><span>Orbit engine</span><strong>{selectedLevelConfig?.orbit}</strong><small>Level {selectedLevel}</small></article><article><span>Recorded positions</span><strong>{visualOrbit.length} / {selectedLevelConfig?.positions}</strong><small>{cycle ? `Cycle ${cycle}` : orbitCycles.length ? `Current cycle ${orbitCycles[0]}` : 'Current cycle'}</small></article><article><span>Ring structure</span><strong>{selectedLevelConfig?.rings}</strong><small>Deterministic parent topology</small></article><article><span>Payout roles</span><strong>{selectedLevelConfig?.payouts}</strong><small>Roles remain independently recorded</small></article></div><div className="fp-orbit-layout"><FreedomPlusOrbit orbitType={selectedLevelConfig?.orbit} positions={visualOrbit} owner={account} onSelect={setSelectedPosition} /><aside className="fp-position-inspector">{selectedPosition ? <><span>Position {selectedPosition.position}</span><h3>{selectedPosition.financial ? 'Payment-linked placement' : 'Structural placement'}</h3><dl><div><dt>Participant</dt><dd title={selectedPosition.participant}>{short(selectedPosition.participant)}</dd></div><div><dt>Matrix parent</dt><dd title={selectedPosition.structuralParent}>{short(selectedPosition.structuralParent)}</dd></div><div><dt>Ring</dt><dd>{selectedPosition.ring || selectedPosition.line}</dd></div><div><dt>Cycle</dt><dd>{selectedPosition.cycle}</dd></div><div><dt>Amount</dt><dd>{formatToken(selectedPosition.amount)} USDT</dd></div></dl></> : <><Network /><h3>Select a filled position</h3><p>Inspect its participant, exact structural parent, ring, cycle and recorded amount.</p></>}</aside></div><div className="fp-section-title"><History /><div><h2>Position ledger</h2><p>The diagram and table show the selected cycle only.</p></div></div><div className="fp-table-wrap"><table><thead><tr><th>Cycle</th><th>Position</th><th>Ring</th><th>Participant</th><th>Matrix parent</th><th>Entry</th><th>Amount</th></tr></thead><tbody>{visualOrbit.length ? visualOrbit.map((item) => <tr key={`${item.cycle}-${item.position}-${item.activationId || item._id}`}><td>{item.cycle}</td><td>{item.position}</td><td>{item.ring || item.line}</td><td title={item.participant}>{short(item.participant)}</td><td title={item.structuralParent}>{short(item.structuralParent)}</td><td>{item.financial ? 'Payment-linked placement' : 'Structural placement'}</td><td>{formatToken(item.amount)} USDT</td></tr>) : <tr><td colSpan="7" className="fp-no-data">No indexed positions for this level and cycle.</td></tr>}</tbody></table></div></section>}

          {tab === 'membership' && <FreedomNftMembership membership={membership} membershipVerified={membershipVerified} actionsReady={membershipActionsReady} balances={{ fgt: data?.chain?.fgt, fpt: data?.chain?.fpt }} readIssues={readIssues} formatToken={formatToken} nftForm={nftForm} setNftForm={setNftForm} unlockForm={unlockForm} setUnlockForm={setUnlockForm} busy={busy} submitMembership={submitMembership} unlockQualification={unlockQualification} restoreEligibility={restoreEligibility} />}

          {tab === 'account' && <section className="fp-panel"><div className="fp-section-heading"><div><span className="fp-kicker">Shared FFN identity</span><h2>Freedom-Plus account</h2></div></div><div className="fp-account-grid"><article><span>Wallet</span><strong title={account}>{account || 'Not connected'}</strong><small>Shared across F-Freedom and Freedom-Plus</small></article><article><span>FFN ID</span><strong>{referralId || 'Not available'}</strong><small>No second Freedom-Plus referral ID</small></article><article><span>Permanent sponsor</span><strong>{sponsorCode || short(data?.chain?.sponsor || sponsor)}</strong><small title={data?.chain?.sponsor || sponsor}>{short(data?.chain?.sponsor || sponsor)}</small></article><article><span>Freedom-Plus number</span><strong>{data?.chain?.registered ? `#${data.chain.participantNumber}` : 'Not registered'}</strong><small>Internal record, not a referral identity</small></article></div><div className="fp-account-grid"><article><span>USDT available</span><strong>{data?.chain?.usdt || '0'}</strong><small>Wallet balance</small></article><article><span>FPT available</span><strong>{data?.chain?.fpt || '0'}</strong><small>First-activation utility token</small></article><article><span>FPTr available</span><strong>{data?.chain?.fptr || '0'}</strong><small>Recycle utility token</small></article><article><span>NFT status</span><strong>{NFT_TIERS.find((item) => item.tier === membership.tier)?.name || 'Not minted'}</strong><small>{membership.rewardEligible ? 'Reward eligible' : 'Not reward eligible'}</small></article></div></section>}

          {tab === 'activity' && <section className="fp-panel"><div className="fp-health"><article><span>Backend indexing</span><strong>{status?.enabled ? 'Enabled' : 'Not enabled'}</strong><small>{status?.events || 0} decoded events</small></article><article><span>Reconciliation</span><strong>{reconciliation?.passed ? 'Passed' : 'Pending'}</strong><small>{reconciliation?.confirmedHead ? `Through block ${reconciliation.confirmedHead}` : 'Awaiting deployment data'}</small></article><article><span>Indexed participants</span><strong>{status?.participants || 0}</strong><small>Chain count {reconciliation?.totals?.chainParticipants ?? '-'}</small></article><article><span>Wallet receipts</span><strong>{formatToken(paymentTotal)} USDT</strong><small>{data?.payments?.length || 0} component receipts shown</small></article></div><div className="fp-section-title"><History /><div><h2>Payment receipts</h2><p>Each payout component remains separate, including its level, role, candidate, fallback state and transaction.</p></div></div><div className="fp-table-wrap"><table><thead><tr><th>Block</th><th>Level</th><th>Role</th><th>Rate</th><th>Amount</th><th>Route</th><th>Transaction</th></tr></thead><tbody>{data?.payments?.length ? data.payments.map((item) => <tr key={item._id}><td>{item.blockNumber}</td><td>{item.level}</td><td>{item.role}</td><td>{Number(item.bps || 0) / 100}%</td><td>{formatToken(item.amount)} USDT</td><td>{item.id1Fallback ? 'ID1 fallback' : `From ${short(item.originalCandidate)}`}</td><td title={item.txHash}>{short(item.txHash)}</td></tr>) : <tr><td colSpan="7" className="fp-no-data">No indexed payments for this wallet.</td></tr>}</tbody></table></div></section>}

      <FreedomNftSuccessModal success={nftSuccess} onClose={() => setNftSuccess(null)} />

    </main>
  )
}


