import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Container, Row, Col, Form, Button, Alert, Spinner, Table, Accordion, Modal, Nav, Badge } from 'react-bootstrap'
import { useWallet } from '../hooks/useWallet'
import { useContracts } from '../hooks/useContracts'
import { web3Service } from '../Services/web3'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'
import {
  Key, Crown, BarChart3, Clock, AlertTriangle, Plus, Edit, Trash2,
  Eye, EyeOff, RefreshCw, Globe, Users, Calendar, Link2, FileText,
  Megaphone, ExternalLink, ChevronRight, X, Check, Tag, Hash, Wallet
} from 'lucide-react'

// ============================================================
// CONSTANTS & INTERFACES
// ============================================================
const API_BASE_URL = 'http://localhost:5000'
const ADMIN_API_KEY = 'TheEagleEyeOfThe4thBatallionWeaveHowManyFounders1234567ky4574'
const ADMIN_API_HEADER = 'x-admin-key'

const levelManagerAdminIface = new ethers.Interface([
  'function pause()',
  'function unpause()',
  'function setFounderWallets(address[] wallets,uint256[] ratios)',
  'function setFounderRepresentatives(address[] reps)',
  'function updateChargeRecipients(address _nftPool,address _operations)',
  'function setGuardian(address _guardian)',
  'function setTokenController(address _tokenController)',
  'function setOrbitContracts(address _p4Orbit,address _p12Orbit,address _p39Orbit)',
  'function approveEscrow(uint256 amount)',
  'function setFounderRepInOrbits(address user,bool status)',
  'function upgradeToAndCall(address newImplementation,bytes data)',
  'function upgradeTo(address newImplementation)'
])

const guardianIface = new ethers.Interface([
  'function setApprovedProxy(address proxy,bool allowed)',
  'function setApprovedImplementation(address proxy,address implementation,bool allowed)',
  'function batchSetApprovedImplementations(address proxy,address[] implementations,bool allowed)',
  'function setGlobalUpgradeFreeze(bool frozen)',
  'function pause()',
  'function unpause()'
])

const multisigSelfIface = new ethers.Interface([
  'function addOwner(address owner)',
  'function removeOwner(address owner)',
  'function replaceOwner(address oldOwner,address newOwner)',
  'function changeRequirement(uint256 _requiredConfirmations)'
])

const boolText = (v) => (v ? 'Yes' : 'No')

// Admin API helper
const adminApi = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      [ADMIN_API_HEADER]: ADMIN_API_KEY,
      ...(options.headers || {}),
    },
    ...options,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed: ${response.status}`)
  }
  return payload
}

// ============================================================
// COMPONENT
// ============================================================
export const AdminPanel = () => {
  const { isConnected, account, connect } = useWallet()
  const { contracts, isLoading, error, loadContracts } = useContracts()
  const { t } = useTranslation()

  // ========== EXISTING STATE ==========
  const [founderWallets, setFounderWallets] = useState([])
  const [founderRatios, setFounderRatios] = useState([])
  const [walletInputs, setWalletInputs] = useState(Array(8).fill(''))
  const [ratioInputs, setRatioInputs] = useState(Array(8).fill('1250'))
  const [repAddress, setRepAddress] = useState('')
  const [nftPool, setNftPool] = useState('')
  const [opsWallet, setOpsWallet] = useState('')

  const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null, note: null })
  const [isOwner, setIsOwner] = useState(false)
  const [ownerCheckComplete, setOwnerCheckComplete] = useState(false)

  const [txIdInput, setTxIdInput] = useState('')
  const [multisigTx, setMultisigTx] = useState(null)
  const [recentTxs, setRecentTxs] = useState([])
  const [ownerList, setOwnerList] = useState([])

  const [guardianState, setGuardianState] = useState({
    paused: false,
    globalUpgradeFreeze: false
  })

  const [systemState, setSystemState] = useState({
    levelManagerPaused: false
  })

  const [guardianProxyInput, setGuardianProxyInput] = useState('')
  const [guardianImplProxyInput, setGuardianImplProxyInput] = useState('')
  const [guardianImplInput, setGuardianImplInput] = useState('')
  const [upgradeProxyInput, setUpgradeProxyInput] = useState(import.meta.env.VITE_LEVELMANAGER_ADDRESS || '')
  const [upgradeImplementationInput, setUpgradeImplementationInput] = useState('')
  const [addOwnerInput, setAddOwnerInput] = useState('')
  const [removeOwnerInput, setRemoveOwnerInput] = useState('')
  const [replaceOwnerOldInput, setReplaceOwnerOldInput] = useState('')
  const [replaceOwnerNewInput, setReplaceOwnerNewInput] = useState('')
  const [changeRequirementInput, setChangeRequirementInput] = useState('4')
  const [selectedTxApprovals, setSelectedTxApprovals] = useState([])
  const [guardianChecks, setGuardianChecks] = useState({
    proxyApproved: null,
    implementationApproved: null
  })

  const [multisigStats, setMultisigStats] = useState({
    requiredConfirmations: '0',
    txCount: '0',
    queuedTxCount: '0',
    executedTxCount: '0',
    currentTimestamp: Math.floor(Date.now() / 1000),
    timelockDelay: '0'
  })

  // ========== NEW STATE: Founder Vault Viewer ==========
  const [walletBalances, setWalletBalances] = useState({})
  const [id1Wallet, setId1Wallet] = useState('')
  const [isID1Downline, setIsID1Downline] = useState(false)
  const [founderRefreshing, setFounderRefreshing] = useState(false)
  const [totalFounderBalance, setTotalFounderBalance] = useState('0.00')

  // ========== NEW STATE: Community Content Management ==========
  const [announcements, setAnnouncements] = useState([])
  const [events, setEvents] = useState([])
  const [socialLinks, setSocialLinks] = useState([])
  const [resources, setResources] = useState([])
  const [activeContentTab, setActiveContentTab] = useState('announcements')
  const [showContentModal, setShowContentModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [formData, setFormData] = useState({})

  // ========== FLOATING BUTTON STATE ==========
  const [showChargeModal, setShowChargeModal] = useState(false)

  const totalRatio = useMemo(
    () => ratioInputs.reduce((sum, r) => sum + parseInt(r || 0, 10), 0),
    [ratioInputs]
  )

  const levelManagerAddress = import.meta.env.VITE_LEVELMANAGER_ADDRESS
  const guardianAddress = import.meta.env.VITE_GUARDIAN_ADDRESS || ''
  const multisigAddress = import.meta.env.VITE_MULTISIG_ADDRESS || ''

  // ============================================================
  // PREMIUM GLASS STYLES (with spacing fixes)
  // ============================================================
  const adminStyles = `
    .admin-shell-premium {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 80px);
    }
    .glass-panel-premium {
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      overflow: hidden;
    }
    .admin-hero-premium {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 20px 24px;
      margin-bottom: 20px;
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
    }
    .admin-title-premium {
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #fff, var(--glow-teal));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      margin: 0;
    }
    .admin-subtitle {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      margin-top: 4px;
    }
    .admin-badge-premium {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.08);
      border-radius: 30px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255,255,255,0.8);
      font-family: monospace;
    }
    .admin-card-premium {
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 20px;
      height: 100%;
      transition: all 0.2s;
    }
    .admin-card-premium:hover {
      border-color: rgba(29, 233, 182, 0.3);
    }
    .admin-header-premium {
      background: linear-gradient(135deg, rgba(29, 233, 182, 0.12), rgba(77, 163, 255, 0.08));
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .admin-header-premium h3, .admin-header-premium .header-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--glow-teal);
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .admin-body-premium {
      padding: 16px;
    }
    .input-premium {
      width: 100%;
      padding: 10px 14px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      color: white;
      font-family: monospace;
      font-size: 13px;
      transition: all 0.2s;
    }
    .input-premium:focus {
      outline: none;
      border-color: var(--glow-teal);
      background: rgba(255,255,255,0.12);
    }
    .input-premium::placeholder {
      color: rgba(255,255,255,0.3);
    }
    .btn-premium {
      padding: 10px 20px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
      color: #07111f;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
    }
    .btn-premium-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.15);
    }
    .btn-premium-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }
    .btn-premium-sm {
      padding: 6px 12px;
      font-size: 11px;
    }
    .btn-premium-icon {
      padding: 6px 10px;
    }
    .btn-premium:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .premium-table {
      width: 100%;
      font-size: 13px;
    }
    .premium-table th {
      padding: 10px 12px;
      text-align: left;
      color: rgba(255,255,255,0.6);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .premium-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      vertical-align: middle;
    }
    .premium-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
    }
    .premium-badge-success { background: rgba(29, 233, 182, 0.2); color: #1de9b6; }
    .premium-badge-warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .premium-badge-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .premium-badge-info { background: rgba(77, 163, 255, 0.2); color: #4da3ff; }
    .premium-badge-dark { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
    .premium-progress {
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }
    .premium-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--glow-teal), #1a9b7a);
      border-radius: 3px;
      transition: width 0.3s;
    }
    .premium-accordion .accordion-item {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .premium-accordion .accordion-button {
      background: rgba(0,0,0,0.3);
      color: white;
      font-weight: 600;
      padding: 14px 18px;
    }
    .premium-accordion .accordion-button:not(.collapsed) {
      background: rgba(29, 233, 182, 0.1);
      color: var(--glow-teal);
    }
    .premium-accordion .accordion-button:focus {
      box-shadow: none;
      border-color: transparent;
    }
    .premium-accordion .accordion-body {
      background: rgba(0,0,0,0.2);
      padding: 16px;
    }
    .metric-box-premium {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 14px;
      text-align: center;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .metric-label-premium {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 6px;
    }
    .metric-value-premium {
      font-size: 16px;
      font-weight: 700;
      color: var(--glow-teal);
    }
    .action-card-premium {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 14px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .small-label-premium {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 8px;
    }
    .chip-premium {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255,255,255,0.08);
      border-radius: 20px;
      font-size: 11px;
      font-family: monospace;
    }
    .grid-3-premium {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
    .grid-2-premium {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
    }
    .flex-between-premium {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .guide-step-premium {
      border-left: 3px solid var(--glow-teal);
      padding: 10px 12px;
      background: rgba(29, 233, 182, 0.05);
      border-radius: 12px;
      margin-bottom: 8px;
    }
    .soft-panel-premium {
      padding: 12px;
      border-radius: 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .mono {
      font-family: monospace;
      font-size: 12px;
    }
    .text-glow {
      color: var(--glow-teal);
    }
    .wallet-grid-premium {
      display: grid;
      grid-template-columns: 1fr 100px;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }
    .owner-sign-pill-premium {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255,255,255,0.08);
      border-radius: 30px;
      font-size: 11px;
      font-family: monospace;
      margin: 2px 4px 2px 0;
    }
    .tx-row-premium:hover {
      background: rgba(255,255,255,0.03);
    }
    .alert-premium {
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      color: white;
      margin-bottom: 16px;
    }
    .alert-premium a {
      color: var(--glow-teal);
    }
    .content-tabs-premium {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .content-tab-premium {
      padding: 8px 16px;
      border-radius: 30px;
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.6);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .content-tab-premium:hover {
      background: rgba(255,255,255,0.05);
      color: white;
    }
    .content-tab-premium.active {
      background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
      color: #07111f;
    }
    .founder-summary-card {
      background: linear-gradient(135deg, rgba(29, 233, 182, 0.08), rgba(77, 163, 255, 0.04));
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .fab-premium {
      position: fixed;
      bottom: 30px;
      right: 30px;
      z-index: 1000;
      background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
      border: none;
      width: 56px;
      height: 56px;
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(29, 233, 182, 0.3);
      transition: all 0.2s ease;
      color: #07111f;
    }
    .fab-premium:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(29, 233, 182, 0.4);
    }
    .fab-premium:active {
      transform: scale(0.95);
    }
    @media (max-width: 768px) {
      .admin-shell-premium { padding: 12px; }
      .admin-hero-premium { flex-direction: column; align-items: flex-start; }
      .grid-3-premium, .grid-2-premium { grid-template-columns: 1fr; }
      .wallet-grid-premium { grid-template-columns: 1fr; }
      .content-tabs-premium { flex-wrap: wrap; }
      .fab-premium {
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
      }
    }
  `

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  const generateRandomEthAddresses = (count = 1) => Array.from({ length: count }, () => ethers.Wallet.createRandom().address)

  const shortAddress = (addr) => (!addr ? '—' : `${addr.slice(0, 8)}...${addr.slice(-6)}`)

  const formatUnix = (value) => {
    if (!value) return '—'
    const date = new Date(Number(value) * 1000)
    return date.toLocaleString()
  }

  const formatCountdown = (seconds) => {
    if (seconds <= 0) return 'Ready now'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  const getStageFromTx = useCallback((tx) => {
    if (!tx) return { label: 'Unknown', variant: 'secondary' }
    const confirmations = Number(tx.confirmations || 0)
    const required = Number(multisigStats.requiredConfirmations || 0)
    const executeAfter = Number(tx.executeAfter || 0)
    const now = Number(multisigStats.currentTimestamp || 0)
    const executed = Boolean(tx.executed)
    if (executed) return { label: 'Executed', variant: 'success' }
    if (confirmations < required) return { label: 'Waiting for approvals', variant: 'warning' }
    if (now < executeAfter) return { label: 'Waiting for timelock', variant: 'info' }
    return { label: 'Ready to execute', variant: 'primary' }
  }, [multisigStats])

  const remainingSeconds = useMemo(() => {
    if (!multisigTx) return 0
    const executeAfter = Number(multisigTx.executeAfter || 0)
    const now = Number(multisigStats.currentTimestamp || 0)
    return Math.max(executeAfter - now, 0)
  }, [multisigTx, multisigStats.currentTimestamp])

  const approvalPercent = useMemo(() => {
    if (!multisigTx) return 0
    const confirmations = Number(multisigTx.confirmations || 0)
    const required = Number(multisigStats.requiredConfirmations || 1)
    return Math.min((confirmations / required) * 100, 100)
  }, [multisigTx, multisigStats.requiredConfirmations])

  const decodeTransactionAction = useCallback((tx) => {
    if (!tx?.data) return { label: 'Unknown action', details: '', category: 'Unknown', targetLabel: shortAddress(tx?.to || '') }

    const tries = [
      { iface: levelManagerAdminIface, name: 'LevelManager' },
      { iface: guardianIface, name: 'Guardian' },
      { iface: multisigSelfIface, name: 'Multisig' }
    ]

    for (const entry of tries) {
      try {
        const parsed = entry.iface.parseTransaction({ data: tx.data })
        if (!parsed) continue

        const name = parsed.name
        const args = parsed.args ? Array.from(parsed.args) : []

        if (entry.name === 'LevelManager') {
          switch (name) {
            case 'setFounderWallets':
              return { label: 'Set founder wallets', details: `${args[0]?.length || 0} wallets proposed`, category: 'Configuration', targetLabel: 'LevelManager' }
            case 'setFounderRepresentatives':
              return { label: 'Set founder representatives', details: `${args[0]?.length || 0} representative(s)`, category: 'Configuration', targetLabel: 'LevelManager' }
            case 'updateChargeRecipients':
              return { label: 'Update charge recipients', details: `NFT Pool ${shortAddress(args[0])} • Operations ${shortAddress(args[1])}`, category: 'Configuration', targetLabel: 'LevelManager' }
            case 'pause':
              return { label: 'Pause protocol', details: 'Pause LevelManager operations', category: 'Emergency', targetLabel: 'LevelManager' }
            case 'unpause':
              return { label: 'Unpause protocol', details: 'Resume LevelManager operations', category: 'Emergency', targetLabel: 'LevelManager' }
            case 'setGuardian':
              return { label: 'Set guardian', details: shortAddress(args[0]), category: 'Security', targetLabel: 'LevelManager' }
            case 'setTokenController':
              return { label: 'Set token controller', details: shortAddress(args[0]), category: 'Configuration', targetLabel: 'LevelManager' }
            case 'setOrbitContracts':
              return { label: 'Set orbit contracts', details: `P4 ${shortAddress(args[0])} • P12 ${shortAddress(args[1])} • P39 ${shortAddress(args[2])}`, category: 'Configuration', targetLabel: 'LevelManager' }
            case 'approveEscrow':
              return { label: 'Approve escrow', details: `${args[0]?.toString?.() || String(args[0])}`, category: 'Configuration', targetLabel: 'LevelManager' }
            case 'setFounderRepInOrbits':
              return { label: 'Set founder rep status in orbits', details: `${shortAddress(args[0])} → ${boolText(args[1])}`, category: 'Configuration', targetLabel: 'LevelManager' }
            case 'upgradeTo':
            case 'upgradeToAndCall':
              return { label: 'Upgrade LevelManager', details: `New implementation ${shortAddress(args[0])}`, category: 'Upgrade', targetLabel: 'LevelManager', implementationAddress: args[0] }
            default:
              return { label: name, details: JSON.stringify(args), category: 'LevelManager', targetLabel: 'LevelManager' }
          }
        }

        if (entry.name === 'Guardian') {
          switch (name) {
            case 'setApprovedProxy':
              return { label: 'Set approved proxy', details: `${shortAddress(args[0])} → ${boolText(args[1])}`, category: 'Guardian', targetLabel: 'Guardian' }
            case 'setApprovedImplementation':
              return { label: 'Set approved implementation', details: `Proxy ${shortAddress(args[0])} • Impl ${shortAddress(args[1])} • ${boolText(args[2])}`, category: 'Guardian', targetLabel: 'Guardian', proxyAddress: args[0], implementationAddress: args[1] }
            case 'batchSetApprovedImplementations':
              return { label: 'Batch implementation approvals', details: `Proxy ${shortAddress(args[0])} • ${args[1]?.length || 0} implementation(s) • ${boolText(args[2])}`, category: 'Guardian', targetLabel: 'Guardian', proxyAddress: args[0] }
            case 'setGlobalUpgradeFreeze':
              return { label: args[0] ? 'Freeze upgrades' : 'Unfreeze upgrades', details: `Global upgrade freeze → ${boolText(args[0])}`, category: 'Guardian', targetLabel: 'Guardian' }
            case 'pause':
              return { label: 'Pause guardian admin', details: 'Pause guardian mutation functions', category: 'Guardian', targetLabel: 'Guardian' }
            case 'unpause':
              return { label: 'Unpause guardian admin', details: 'Resume guardian mutation functions', category: 'Guardian', targetLabel: 'Guardian' }
            default:
              return { label: name, details: JSON.stringify(args), category: 'Guardian', targetLabel: 'Guardian' }
          }
        }

        if (entry.name === 'Multisig') {
          switch (name) {
            case 'addOwner':
              return { label: 'Add owner', details: shortAddress(args[0]), category: 'Multisig', targetLabel: 'SimpleMultiSig' }
            case 'removeOwner':
              return { label: 'Remove owner', details: shortAddress(args[0]), category: 'Multisig', targetLabel: 'SimpleMultiSig' }
            case 'replaceOwner':
              return { label: 'Replace owner', details: `${shortAddress(args[0])} → ${shortAddress(args[1])}`, category: 'Multisig', targetLabel: 'SimpleMultiSig' }
            case 'changeRequirement':
              return { label: 'Change requirement', details: `${args[0]?.toString?.() || String(args[0])} confirmations`, category: 'Multisig', targetLabel: 'SimpleMultiSig' }
            default:
              return { label: name, details: JSON.stringify(args), category: 'Multisig', targetLabel: 'SimpleMultiSig' }
          }
        }
      } catch {
        // continue
      }
    }

    return { label: 'Unknown action', details: tx.data, category: 'Unknown', targetLabel: shortAddress(tx.to) }
  }, [])

  const readTransaction = useCallback(async (txId) => {
    if (!contracts?.simpleMultiSig) return null
    const tx = await contracts.simpleMultiSig.transactions(Number(txId))

    const approvals = ownerList.length > 0
      ? await Promise.all(ownerList.map(async (owner) => ({
          owner,
          approved: await contracts.simpleMultiSig.approved(Number(txId), owner)
        })))
      : []

    const raw = {
      txId: Number(txId),
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data,
      executed: tx.executed,
      confirmations: tx.confirmations.toString(),
      submittedAt: tx.submittedAt.toString(),
      executeAfter: tx.executeAfter.toString(),
      approvals
    }

    return {
      ...raw,
      ...decodeTransactionAction(raw)
    }
  }, [contracts, ownerList, decodeTransactionAction])

  const loadGuardianChecks = useCallback(async (proxyAddress, implementationAddress) => {
    if (!contracts?.guardian) {
      setGuardianChecks({ proxyApproved: null, implementationApproved: null })
      return
    }

    try {
      const [proxyApproved, implementationApproved] = await Promise.all([
        proxyAddress ? contracts.guardian.approvedProxies(proxyAddress) : Promise.resolve(null),
        proxyAddress && implementationAddress ? contracts.guardian.approvedImplementations(proxyAddress, implementationAddress) : Promise.resolve(null)
      ])

      setGuardianChecks({ proxyApproved, implementationApproved })
    } catch (err) {
      console.error(err)
      setGuardianChecks({ proxyApproved: null, implementationApproved: null })
    }
  }, [contracts])

  // ============================================================
  // NEW: Community Content API Functions
  // ============================================================
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await adminApi('/api/admin/community/announcements')
      setAnnouncements(res.data || [])
    } catch (err) { console.error('Fetch announcements failed:', err) }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await adminApi('/api/admin/community/events')
      setEvents(res.data || [])
    } catch (err) { console.error('Fetch events failed:', err) }
  }, [])

  const fetchSocialLinks = useCallback(async () => {
    try {
      const res = await adminApi('/api/admin/community/social-links')
      setSocialLinks(res.data || [])
    } catch (err) { console.error('Fetch social links failed:', err) }
  }, [])

  const fetchResources = useCallback(async () => {
    try {
      const res = await adminApi('/api/admin/community/resources')
      setResources(res.data || [])
    } catch (err) { console.error('Fetch resources failed:', err) }
  }, [])

  const fetchAllContent = useCallback(async () => {
    setContentLoading(true)
    await Promise.all([fetchAnnouncements(), fetchEvents(), fetchSocialLinks(), fetchResources()])
    setContentLoading(false)
  }, [fetchAnnouncements, fetchEvents, fetchSocialLinks, fetchResources])

  const handleCreateContent = async () => {
    const endpoints = {
      announcements: '/api/admin/community/announcements',
      events: '/api/admin/community/events',
      socialLinks: '/api/admin/community/social-links',
      resources: '/api/admin/community/resources'
    }
    try {
      await adminApi(endpoints[activeContentTab], {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setShowContentModal(false)
      setFormData({})
      fetchAllContent()
    } catch (err) {
      alert(`Failed to create: ${err.message}`)
    }
  }

  const handleUpdateContent = async () => {
    const endpoints = {
      announcements: `/api/admin/community/announcements/${editingItem._id}`,
      events: `/api/admin/community/events/${editingItem._id}`,
      socialLinks: `/api/admin/community/social-links/${editingItem._id}`,
      resources: `/api/admin/community/resources/${editingItem._id}`
    }
    try {
      await adminApi(endpoints[activeContentTab], {
        method: 'PATCH',
        body: JSON.stringify(formData)
      })
      setShowContentModal(false)
      setEditingItem(null)
      setFormData({})
      fetchAllContent()
    } catch (err) {
      alert(`Failed to update: ${err.message}`)
    }
  }

  const handleDeleteContent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    const endpoints = {
      announcements: `/api/admin/community/announcements/${id}`,
      events: `/api/admin/community/events/${id}`,
      socialLinks: `/api/admin/community/social-links/${id}`,
      resources: `/api/admin/community/resources/${id}`
    }
    try {
      await adminApi(endpoints[activeContentTab], { method: 'DELETE' })
      fetchAllContent()
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setFormData(item)
    setShowContentModal(true)
  }

  const openCreateModal = () => {
    setEditingItem(null)
    const defaultData = { isActive: true }
    if (activeContentTab === 'announcements') {
      const today = new Date()
      defaultData.date = today.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    }
    setFormData(defaultData)
    setShowContentModal(true)
  }

  // ============================================================
  // NEW: Founder Vault Functions
  // ============================================================
  const fetchFounderBalances = useCallback(async () => {
    if (!contracts?.levelManager || !contracts?.usdt) return
    setFounderRefreshing(true)
    try {
      const [wallets] = await contracts.levelManager.getFounderWallets()
      const id1 = await contracts.levelManager.id1Wallet()
      const isDownline = await contracts.levelManager.isID1Downline(account)
      
      setId1Wallet(id1)
      setIsID1Downline(isDownline)

      const balances = {}
      let total = 0
      for (const wallet of wallets) {
        try {
          const balance = await contracts.usdt.balanceOf(wallet)
          const formatted = ethers.formatUnits(balance, 6)
          balances[wallet] = formatted
          total += parseFloat(formatted)
        } catch {
          balances[wallet] = '0.00'
        }
      }
      setWalletBalances(balances)
      setTotalFounderBalance(total.toFixed(2))
    } catch (err) {
      console.error('Fetch founder balances failed:', err)
    } finally {
      setFounderRefreshing(false)
    }
  }, [contracts, account])

  // ============================================================
  // EXISTING FUNCTIONS (Complete, unabbreviated)
  // ============================================================
  const refreshGovernanceData = useCallback(async () => {
    if (!contracts || !account) return

    try {
      const ownerMatch = contracts.simpleMultiSig ? await contracts.simpleMultiSig.isOwner(account) : false
      setIsOwner(ownerMatch)

      const [
        requiredConfirmations,
        txCount,
        timelockDelay,
        owners,
        latestBlock
      ] = await Promise.all([
        contracts.simpleMultiSig?.requiredConfirmations?.() ?? 0,
        contracts.simpleMultiSig?.getTransactionCount?.() ?? 0,
        contracts.simpleMultiSig?.timelockDelay?.() ?? 0,
        contracts.simpleMultiSig?.getOwners?.() ?? [],
        contracts.levelManager?.runner?.provider?.getBlock?.('latest')
      ])

      setOwnerList(owners)
      setMultisigStats({
        requiredConfirmations: requiredConfirmations.toString(),
        txCount: txCount.toString(),
        currentTimestamp: latestBlock?.timestamp || Math.floor(Date.now() / 1000),
        timelockDelay: timelockDelay.toString()
      })

      const guardianPaused = contracts.guardian?.paused ? await contracts.guardian.paused() : false
      const globalUpgradeFreeze = contracts.guardian?.globalUpgradeFreeze ? await contracts.guardian.globalUpgradeFreeze() : false
      setGuardianState({
        paused: guardianPaused,
        globalUpgradeFreeze
      })

      const levelManagerPaused = contracts.levelManager?.paused ? await contracts.levelManager.paused() : false
      setSystemState({ levelManagerPaused })

      if (ownerMatch && contracts.levelManager) {
        const [wallets, ratios] = await contracts.levelManager.getFounderWallets()
        setFounderWallets(wallets)
        setFounderRatios(ratios.map(r => r.toString()))

        const currentNftPool = await contracts.levelManager.nftPool()
        const currentOpsWallet = await contracts.levelManager.operationsWallet()
        setNftPool(currentNftPool)
        setOpsWallet(currentOpsWallet)
      }

      const count = Number(txCount)
      const start = Math.max(0, count - 50)
      const ids = []
      for (let i = count - 1; i >= start; i -= 1) ids.push(i)

      const txs = await Promise.all(ids.map((id) => readTransaction(id)))
      const validTxs = txs.filter(Boolean)
      setRecentTxs(txs.filter(Boolean))

      const queuedTxCount = validTxs.filter((tx) => !tx.executed).length
      const executedTxCount = validTxs.filter((tx) => tx.executed).length

      setMultisigStats(prev => ({
        ...prev,
        queuedTxCount: queuedTxCount.toString(),
        executedTxCount: executedTxCount.toString()
      }))
      
      if (multisigTx?.txId !== undefined) {
        const fresh = await readTransaction(multisigTx.txId)
        setMultisigTx(fresh)
        setSelectedTxApprovals(fresh?.approvals || [])
        if (fresh?.proxyAddress || fresh?.implementationAddress) {
          await loadGuardianChecks(fresh.proxyAddress || levelManagerAddress, fresh.implementationAddress || '')
        } else {
          setGuardianChecks({ proxyApproved: null, implementationApproved: null })
        }
      }

      await fetchFounderBalances()
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setOwnerCheckComplete(true)
    }
  }, [contracts, account, multisigTx?.txId, readTransaction, loadGuardianChecks, levelManagerAddress, fetchFounderBalances])

  useEffect(() => {
    if (contracts) {
      window.contracts = contracts
    }
  }, [contracts])

  useEffect(() => {
    window.refreshGovernanceData = refreshGovernanceData
  }, [refreshGovernanceData])

  useEffect(() => {
    window.systemState = systemState
    window.guardianState = guardianState
  }, [systemState, guardianState])

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
    if (contracts && account) {
      refreshGovernanceData().catch(console.error)
      fetchAllContent()
    }
  }, [contracts, account, refreshGovernanceData, fetchAllContent])

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!contracts?.levelManager?.runner?.provider) return
      try {
        const latestBlock = await contracts.levelManager.runner.provider.getBlock('latest')
        setMultisigStats((prev) => ({
          ...prev,
          currentTimestamp: latestBlock?.timestamp || prev.currentTimestamp
        }))
      } catch (err) {
        console.error(err)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [contracts])

  const getWriteContracts = async () => {
    const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
    return writeContracts
  }

  const setLoadingTx = (hash = null, note = null) => setTxStatus({ loading: true, hash, error: null, note })
  const setDoneTx = (hash = null, note = null) => setTxStatus({ loading: false, hash, error: null, note })
  const setErrorTx = (message) => setTxStatus({ loading: false, hash: null, error: message, note: null })

  const submitRawProposal = async (target, data, note) => {
    try {
      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.simpleMultiSig.submitTransaction(target, 0, data)
      setLoadingTx(tx.hash, note)
      await tx.wait()
      setDoneTx(tx.hash, note)
      await refreshGovernanceData()
      return tx
    } catch (err) {
      setErrorTx(err?.reason || err?.message || `${note} failed`)
      throw err
    }
  }

  const submitLevelManagerProposal = async (functionName, args = [], note = 'LevelManager proposal submitted') => {
    try {
      const data = levelManagerAdminIface.encodeFunctionData(functionName, args)
      return await submitRawProposal(levelManagerAddress, data, note)
    } catch (err) {
      setErrorTx(err?.reason || err?.message || `${note} failed`)
      throw err
    }
  }

  const submitGuardianProposal = async (functionName, args = [], note = 'Guardian proposal submitted') => {
    try {
      if (!guardianAddress) throw new Error('VITE_GUARDIAN_ADDRESS is missing')
      const data = guardianIface.encodeFunctionData(functionName, args)
      return await submitRawProposal(guardianAddress, data, note)
    } catch (err) {
      setErrorTx(err?.reason || err?.message || `${note} failed`)
      throw err
    }
  }

  const submitMultisigSelfProposal = async (functionName, args = [], note = 'Multisig proposal submitted') => {
    try {
      const target = multisigAddress || contracts?.simpleMultiSig?.target
      if (!target) throw new Error('Multisig address unavailable')
      const data = multisigSelfIface.encodeFunctionData(functionName, args)
      return await submitRawProposal(target, data, note)
    } catch (err) {
      setErrorTx(err?.reason || err?.message || `${note} failed`)
      throw err
    }
  }

  const loadMultisigTx = async (forcedId = null) => {
    const idToLoad = forcedId ?? txIdInput
    if (!contracts?.simpleMultiSig || idToLoad === '' || idToLoad === null || idToLoad === undefined) return

    try {
      const latestBlock = await contracts.levelManager.runner.provider.getBlock('latest')
      setMultisigStats((prev) => ({
        ...prev,
        currentTimestamp: latestBlock?.timestamp || prev.currentTimestamp
      }))

      const tx = await readTransaction(Number(idToLoad))
      setMultisigTx(tx)
      setTxIdInput(String(idToLoad))
      setSelectedTxApprovals(tx?.approvals || [])

      if (tx?.implementationAddress || tx?.proxyAddress) {
        await loadGuardianChecks(tx.proxyAddress || levelManagerAddress, tx.implementationAddress || '')
      } else {
        setGuardianChecks({ proxyApproved: null, implementationApproved: null })
      }
    } catch (err) {
      console.error(err)
      setMultisigTx(null)
      setSelectedTxApprovals([])
      setGuardianChecks({ proxyApproved: null, implementationApproved: null })
      setErrorTx(err?.reason || err?.message || 'Failed to load multisig transaction')
    }
  }

  const handleApproveTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? txIdInput)
    try {
      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.simpleMultiSig.approveTransaction(idToUse)
      setLoadingTx(tx.hash, `Approving transaction #${idToUse}`)
      await tx.wait()
      setDoneTx(tx.hash, `Approved transaction #${idToUse}`)
      await refreshGovernanceData()
      await loadMultisigTx(idToUse)
    } catch (err) {
      setErrorTx(err?.reason || err?.message || 'Approval failed')
    }
  }

  const handleRevokeTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? txIdInput)
    try {
      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.simpleMultiSig.revokeConfirmation(idToUse)
      setLoadingTx(tx.hash, `Revoking approval for transaction #${idToUse}`)
      await tx.wait()
      setDoneTx(tx.hash, `Revoked approval for transaction #${idToUse}`)
      await refreshGovernanceData()
      await loadMultisigTx(idToUse)
    } catch (err) {
      setErrorTx(err?.reason || err?.message || 'Revoke failed')
    }
  }

  const handleExecuteTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? txIdInput)
    try {
      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.simpleMultiSig.executeTransaction(idToUse)
      setLoadingTx(tx.hash, `Executing transaction #${idToUse}`)
      await tx.wait()
      setDoneTx(tx.hash, `Executed transaction #${idToUse}`)
      await refreshGovernanceData()
      await loadMultisigTx(idToUse)
    } catch (err) {
      setErrorTx(err?.reason || err?.message || 'Execution failed')
    }
  }

  const handleSubmitPauseProposal = async () => {
    await submitLevelManagerProposal('pause', [], 'Pause LevelManager proposal')
  }

  const handleSubmitUnpauseProposal = async () => {
    await submitLevelManagerProposal('unpause', [], 'Unpause LevelManager proposal')
  }

  const handleSetFounderWallets = async () => {
    const validWallets = walletInputs.map(w => w.trim())
    const validRatios = ratioInputs.map(r => parseInt(r || 0, 10))

    if (validWallets.some(w => !ethers.isAddress(w))) {
      alert('All founder wallet addresses must be valid Ethereum addresses')
      return
    }
    if (validWallets.length !== 8) {
      alert('You must provide exactly 8 wallet addresses')
      return
    }
    const ratioSum = validRatios.reduce((sum, r) => sum + r, 0)
    if (ratioSum !== 10000) {
      alert(`Ratios must sum to 10000 (currently ${ratioSum})`)
      return
    }

    await submitLevelManagerProposal('setFounderWallets', [validWallets, validRatios], 'Founder wallet proposal')
  }

  const handleAddFounderRep = async () => {
    if (!ethers.isAddress(repAddress)) {
      alert('Please enter a valid representative address')
      return
    }
    await submitLevelManagerProposal('setFounderRepresentatives', [[repAddress]], 'Representative proposal')
    setRepAddress('')
  }

  const handleUpdateChargeRecipients = async () => {
    if (!ethers.isAddress(nftPool) || !ethers.isAddress(opsWallet)) {
      alert('NFT Pool and Operations wallet must be valid Ethereum addresses')
      return
    }
    await submitLevelManagerProposal('updateChargeRecipients', [nftPool, opsWallet], 'Charge routing proposal')
  }

  const handleGuardianFreeze = async (frozen) => {
    await submitGuardianProposal('setGlobalUpgradeFreeze', [frozen], frozen ? 'Freeze upgrades proposal' : 'Unfreeze upgrades proposal')
  }

  const handleGuardianPauseAdmin = async (paused) => {
    await submitGuardianProposal(paused ? 'pause' : 'unpause', [], paused ? 'Pause guardian admin proposal' : 'Unpause guardian admin proposal')
  }

  const handleGuardianApproveProxy = async (allowed) => {
    if (!ethers.isAddress(guardianProxyInput)) {
      alert('Enter a valid proxy address')
      return
    }
    await submitGuardianProposal('setApprovedProxy', [guardianProxyInput, allowed], allowed ? 'Approve proxy proposal' : 'Revoke proxy approval proposal')
    await loadGuardianChecks(guardianProxyInput, guardianImplInput)
  }

  const handleGuardianApproveImplementation = async (allowed) => {
    if (!ethers.isAddress(guardianImplProxyInput) || !ethers.isAddress(guardianImplInput)) {
      alert('Enter valid proxy and implementation addresses')
      return
    }
    await submitGuardianProposal('setApprovedImplementation', [guardianImplProxyInput, guardianImplInput, allowed], allowed ? 'Approve implementation proposal' : 'Revoke implementation proposal')
    await loadGuardianChecks(guardianImplProxyInput, guardianImplInput)
  }

  const handleSubmitUpgradeProposal = async () => {
    if (!ethers.isAddress(upgradeProxyInput) || !ethers.isAddress(upgradeImplementationInput)) {
      alert('Enter valid proxy and implementation addresses')
      return
    }

    const uupsIface = new ethers.Interface(['function upgradeToAndCall(address newImplementation,bytes data)'])
    const data = uupsIface.encodeFunctionData('upgradeToAndCall', [upgradeImplementationInput, '0x'])
    await submitRawProposal(upgradeProxyInput, data, 'Upgrade proposal')
  }

  const handleAddOwnerProposal = async () => {
    if (!ethers.isAddress(addOwnerInput)) {
      alert('Enter a valid new owner address')
      return
    }
    await submitMultisigSelfProposal('addOwner', [addOwnerInput], 'Add owner proposal')
    setAddOwnerInput('')
  }

  const handleRemoveOwnerProposal = async () => {
    if (!ethers.isAddress(removeOwnerInput)) {
      alert('Enter a valid owner address')
      return
    }
    await submitMultisigSelfProposal('removeOwner', [removeOwnerInput], 'Remove owner proposal')
    setRemoveOwnerInput('')
  }

  const handleReplaceOwnerProposal = async () => {
    if (!ethers.isAddress(replaceOwnerOldInput) || !ethers.isAddress(replaceOwnerNewInput)) {
      alert('Enter valid old and new owner addresses')
      return
    }
    await submitMultisigSelfProposal('replaceOwner', [replaceOwnerOldInput, replaceOwnerNewInput], 'Replace owner proposal')
    setReplaceOwnerOldInput('')
    setReplaceOwnerNewInput('')
  }

  const handleChangeRequirementProposal = async () => {
    const requirement = Number(changeRequirementInput)
    if (!Number.isInteger(requirement) || requirement <= 0) {
      alert('Enter a valid required confirmation count')
      return
    }
    await submitMultisigSelfProposal('changeRequirement', [requirement], 'Change multisig requirement proposal')
  }

  const handleWalletInputChange = (index, value) => {
    const updated = [...walletInputs]
    updated[index] = value
    setWalletInputs(updated)
  }

  const handleRatioInputChange = (index, value) => {
    const updated = [...ratioInputs]
    updated[index] = value
    setRatioInputs(updated)
  }

  const fillFounderTestAddresses = () => {
    setWalletInputs(generateRandomEthAddresses(8))
    setRatioInputs(Array(8).fill('1250'))
  }

  const fillRepTestAddress = () => {
    const [randomAddr] = generateRandomEthAddresses(1)
    setRepAddress(randomAddr)
  }

  const fillChargeTestAddresses = () => {
    const [randomNft, randomOps] = generateRandomEthAddresses(2)
    setNftPool(randomNft)
    setOpsWallet(randomOps)
  }

  const txStage = getStageFromTx(multisigTx)

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const getContentList = () => {
    switch (activeContentTab) {
      case 'announcements': return announcements
      case 'events': return events
      case 'socialLinks': return socialLinks
      case 'resources': return resources
      default: return []
    }
  }

  const getContentFields = () => {
    switch (activeContentTab) {
      case 'announcements':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'content', label: 'Content', type: 'textarea', required: true },
          { name: 'date', label: 'Date', type: 'text', placeholder: 'e.g., Jan 15, 2024', required: true },
          { name: 'type', label: 'Type', type: 'select', options: ['info', 'success', 'warning'] },
          { name: 'priority', label: 'Priority', type: 'number' },
          { name: 'isActive', label: 'Active', type: 'checkbox' }
        ]
      case 'events':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'content', label: 'Description', type: 'textarea' },
          { name: 'date', label: 'Date', type: 'text' },
          { name: 'ctaUrl', label: 'CTA URL', type: 'text' },
          { name: 'ctaLabel', label: 'CTA Label', type: 'text' },
          { name: 'isActive', label: 'Active', type: 'checkbox' }
        ]
      case 'socialLinks':
        return [
          { name: 'platform', label: 'Platform', type: 'select', options: ['telegram', 'discord', 'x', 'instagram', 'facebook'] },
          { name: 'href', label: 'URL', type: 'text', required: true },
          { name: 'sortOrder', label: 'Sort Order', type: 'number' },
          { name: 'isActive', label: 'Active', type: 'checkbox' }
        ]
      case 'resources':
        return [
          { name: 'key', label: 'Key', type: 'select', options: ['faq', 'tutorials', 'support', 'docs'] },
          { name: 'label', label: 'Label', type: 'text', required: true },
          { name: 'route', label: 'Route', type: 'text' },
          { name: 'href', label: 'External URL', type: 'text' },
          { name: 'sortOrder', label: 'Sort Order', type: 'number' },
          { name: 'isActive', label: 'Active', type: 'checkbox' }
        ]
      default: return []
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  if (!isConnected) {
    return (
      <Container className="admin-shell-premium">
        <style>{adminStyles}</style>
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <h4 className="text-glow" style={{ marginBottom: '16px' }}>Wallet Required</h4>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0' }}>Please connect your wallet using the "Connect Wallet" button in the top navigation bar to access the admin panel.</p>
        </div>
      </Container>
    )
  }

  if (isLoading || !ownerCheckComplete) {
    return (
      <Container className="admin-shell-premium">
        <style>{adminStyles}</style>
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <Spinner animation="grow" variant="info" />
          <p className="mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Authorizing admin access...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="admin-shell-premium">
        <style>{adminStyles}</style>
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <h5 className="text-glow" style={{ marginBottom: '16px' }}>Error Loading Admin Panel</h5>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
        </div>
      </Container>
    )
  }

  if (!isOwner) {
    return (
      <Container className="admin-shell-premium">
        <style>{adminStyles}</style>
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <h5 className="text-glow" style={{ marginBottom: '16px' }}>Access Denied</h5>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>This panel is available only to multisig owners.</p>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid="xl" className="admin-shell-premium">
      <style>{adminStyles}</style>

      {/* Hero Header */}
      <div className="admin-hero-premium">
        <div>
          <h1 className="admin-title-premium">Admin Panel</h1>
          <div className="admin-subtitle">Production governance cockpit for multisig owners</div>
        </div>
        <div className="flex-between-premium" style={{ gap: '12px' }}>
          <span className="admin-badge-premium"><Key size={14} /> {shortAddress(account)}</span>
          <span className="admin-badge-premium"><Crown size={14} /> Multisig Owner</span>
          <span className="admin-badge-premium"><BarChart3 size={14} /> {multisigStats.requiredConfirmations}/{ownerList.length || 5} Threshold</span>
          <span className="admin-badge-premium"><Clock size={14} /> {formatCountdown(Number(multisigStats.timelockDelay || 0))}</span>
        </div>
      </div>

      {/* Transaction Status */}
      {txStatus.error && (
        <Alert variant="danger" className="alert-premium" dismissible onClose={() => setErrorTx(null)}>
          <div className="flex-between-premium" style={{ marginBottom: '4px' }}>
            <strong><AlertTriangle size={14} /> Error:</strong>
          </div>
          {txStatus.error}
        </Alert>
      )}

      {txStatus.hash && (
        <Alert variant="info" className="alert-premium">
          <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>TRANSACTION BROADCAST</div>
          {txStatus.note && <div className="mb-2">{txStatus.note}</div>}
          <a href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`} target="_blank" rel="noopener noreferrer" className="text-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {txStatus.hash} <ExternalLink size={12} />
          </a>
        </Alert>
      )}

      {/* Governance Model & System Status */}
      <Row className="g-3 mb-4">
        <Col xl={4}>
          <div className="admin-card-premium">
            <div className="admin-header-premium">
              <div className="header-title">Governance Model</div>
            </div>
            <div className="admin-body-premium">
              <div className="guide-step-premium">
                <strong>1. Submit proposal</strong>
                <div className="admin-subtitle mt-1">Every admin change becomes a multisig transaction first.</div>
              </div>
              <div className="guide-step-premium">
                <strong>2. Owners approve</strong>
                <div className="admin-subtitle mt-1">You currently need {multisigStats.requiredConfirmations} multisig signatures.</div>
              </div>
              <div className="guide-step-premium">
                <strong>3. Timelock waits</strong>
                <div className="admin-subtitle mt-1">Execution stays blocked until the delay expires.</div>
              </div>
              <div className="guide-step-premium mb-0">
                <strong>4. Execute</strong>
                <div className="admin-subtitle mt-1">Any owner can execute once approvals and timelock are satisfied.</div>
              </div>
            </div>
          </div>
        </Col>

        <Col xl={8}>
          <div className="admin-card-premium">
            <div className="admin-header-premium">
              <div className="header-title">System Status</div>
            </div>
            <div className="admin-body-premium">
              <Row className="g-2">
                <Col md={6} xl={3}>
                  <div className="metric-box-premium">
                    <div className="metric-label-premium">LevelManager paused</div>
                    <div className="metric-value-premium">
                      <span className={`premium-badge ${systemState.levelManagerPaused ? 'premium-badge-danger' : 'premium-badge-success'}`}>
                        {boolText(systemState.levelManagerPaused)}
                      </span>
                    </div>
                  </div>
                </Col>
                <Col md={6} xl={3}>
                  <div className="metric-box-premium">
                    <div className="metric-label-premium">Guardian paused</div>
                    <div className="metric-value-premium">
                      <span className={`premium-badge ${guardianState.paused ? 'premium-badge-danger' : 'premium-badge-success'}`}>
                        {boolText(guardianState.paused)}
                      </span>
                    </div>
                  </div>
                </Col>
                <Col md={6} xl={3}>
                  <div className="metric-box-premium">
                    <div className="metric-label-premium">Global upgrade freeze</div>
                    <div className="metric-value-premium">
                      <span className={`premium-badge ${guardianState.globalUpgradeFreeze ? 'premium-badge-danger' : 'premium-badge-success'}`}>
                        {boolText(guardianState.globalUpgradeFreeze)}
                      </span>
                    </div>
                  </div>
                </Col>
                <Col md={6} xl={3}>
                  <div className="metric-box-premium">
                    <div className="metric-label-premium">Current chain time</div>
                    <div className="metric-value-premium mono">{formatUnix(multisigStats.currentTimestamp)}</div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      </Row>

      {/* Quick Governance Actions */}
      <Row className="g-3 mb-4">
        <Col xl={12}>
          <div className="admin-card-premium">
            <div className="admin-header-premium">
              <div className="header-title">Quick Governance Actions</div>
            </div>
            <div className="admin-body-premium">
              <div className="admin-subtitle mb-3">These actions submit proposals only. They do not change live contracts immediately.</div>
              <div className="grid-3-premium">
                <div className="action-card-premium">
                  <div className="small-label-premium">Emergency controls</div>
                  <div className="admin-subtitle mb-3">Pause or unpause the LevelManager via multisig.</div>
                  <div className="flex-between-premium" style={{ gap: '8px' }}>
                    <button className="btn-premium btn-premium-sm" onClick={handleSubmitPauseProposal} disabled={txStatus.loading}>Submit pause</button>
                    <button className="btn-premium btn-premium-sm" onClick={handleSubmitUnpauseProposal} disabled={txStatus.loading}>Submit unpause</button>
                  </div>
                </div>

                <div className="action-card-premium">
                  <div className="small-label-premium">Guardian controls</div>
                  <div className="admin-subtitle mb-3">Freeze upgrades or pause guardian admin actions.</div>
                  <div className="flex-between-premium" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianFreeze(true)} disabled={txStatus.loading}>Freeze upgrades</button>
                    <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianFreeze(false)} disabled={txStatus.loading}>Unfreeze upgrades</button>
                    <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianPauseAdmin(true)} disabled={txStatus.loading}>Pause guardian</button>
                    <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianPauseAdmin(false)} disabled={txStatus.loading}>Unpause guardian</button>
                  </div>
                </div>

                <div className="action-card-premium">
                  <div className="small-label-premium">Queue refresh</div>
                  <div className="admin-subtitle mb-3">Reload multisig queue, chain time, approvals, and system states.</div>
                  <button className="btn-premium w-100" onClick={refreshGovernanceData} disabled={txStatus.loading}>
                    <RefreshCw size={14} /> Refresh cockpit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Recent Transactions & Selected Transaction */}
      <Row className="g-3 mb-4">
        <Col xl={7}>
          <div className="admin-card-premium">
            <div className="admin-header-premium">
              <div className="header-title">Recent Multisig Transactions</div>
            </div>
            <div className="admin-body-premium">
              <div className="admin-subtitle mb-3">Every proposal appears here with status, votes, countdown, and quick actions.</div>
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Action</th>
                      <th>Category</th>
                      <th>Stage</th>
                      <th>Votes</th>
                      <th>Timelock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTxs.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No transactions found.</td></tr>
                    )}
                    {recentTxs.map((tx) => {
                      const stage = getStageFromTx(tx)
                      const secs = Math.max(Number(tx.executeAfter || 0) - Number(multisigStats.currentTimestamp || 0), 0)
                      const currentOwnerApproval = tx.approvals?.find((a) => a.owner.toLowerCase() === account?.toLowerCase())
                      return (
                        <tr key={tx.txId} className="tx-row-premium">
                          <td className="fw-bold text-glow">{tx.txId}</td>
                          <td>
                            <div className="fw-bold">{tx.label}</div>
                            <div className="admin-subtitle">{tx.details}</div>
                          </td>
                          <td><span className="premium-badge premium-badge-dark">{tx.category}</span></td>
                          <td><span className={`premium-badge premium-badge-${stage.variant === 'success' ? 'success' : stage.variant === 'warning' ? 'warning' : stage.variant === 'info' ? 'info' : 'dark'}`}>{stage.label}</span></td>
                          <td>{tx.confirmations} / {multisigStats.requiredConfirmations}</td>
                          <td>{tx.executed ? 'Completed' : formatCountdown(secs)}</td>
                          <td>
                            <div className="flex-between-premium" style={{ gap: '6px', flexWrap: 'wrap' }}>
                              <button className="btn-premium btn-premium-sm" onClick={() => loadMultisigTx(tx.txId)}>View</button>
                              <button className="btn-premium btn-premium-sm" onClick={() => handleApproveTx(tx.txId)} disabled={tx.executed || currentOwnerApproval?.approved}>Approve</button>
                              <button className="btn-premium btn-premium-sm" onClick={() => handleRevokeTx(tx.txId)} disabled={tx.executed || !currentOwnerApproval?.approved}>Revoke</button>
                              <button className="btn-premium btn-premium-sm" onClick={() => handleExecuteTx(tx.txId)} disabled={tx.executed || stage.label !== 'Ready to execute'}>Execute</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Col>

        <Col xl={5}>
          <div className="admin-card-premium">
            <div className="admin-header-premium">
              <div className="header-title">Selected Transaction Details</div>
            </div>
            <div className="admin-body-premium">
              <div className="admin-subtitle mb-3">Load any transaction to inspect action, approvals, target, timelock, and upgrade/guardian checks.</div>

              <Row className="g-2 align-items-end mb-3">
                <Col md={6}>
                  <Form.Label className="small-label-premium">Transaction ID</Form.Label>
                  <Form.Control
                    className="input-premium"
                    type="number"
                    value={txIdInput}
                    onChange={(e) => setTxIdInput(e.target.value)}
                    placeholder="e.g. 0"
                  />
                </Col>
                <Col md={6}>
                  <div className="flex-between-premium" style={{ gap: '6px' }}>
                    <button className="btn-premium btn-premium-sm" onClick={() => loadMultisigTx()}>Load</button>
                    <button className="btn-premium btn-premium-sm" onClick={() => handleApproveTx()} disabled={!txIdInput}>Approve</button>
                    <button className="btn-premium btn-premium-sm" onClick={() => handleRevokeTx()} disabled={!txIdInput}>Revoke</button>
                    <button className="btn-premium btn-premium-sm" onClick={() => handleExecuteTx()} disabled={!txIdInput}>Execute</button>
                  </div>
                </Col>
              </Row>

              {!multisigTx && (
                <div className="soft-panel-premium" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  No transaction selected yet.
                </div>
              )}

              {multisigTx && (
                <>
                  <Row className="g-2 mb-3">
                    <Col md={6}>
                      <div className="metric-box-premium">
                        <div className="metric-label-premium">Stage</div>
                        <div className="metric-value-premium">
                          <span className={`premium-badge premium-badge-${txStage.variant === 'success' ? 'success' : txStage.variant === 'warning' ? 'warning' : txStage.variant === 'info' ? 'info' : 'dark'}`}>{txStage.label}</span>
                        </div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="metric-box-premium">
                        <div className="metric-label-premium">Timelock remaining</div>
                        <div className="metric-value-premium">{formatCountdown(remainingSeconds)}</div>
                      </div>
                    </Col>
                  </Row>

                  <div className="mb-3">
                    <div className="small-label-premium mb-2">Approval progress</div>
                    <div className="premium-progress">
                      <div className="premium-progress-fill" style={{ width: `${approvalPercent}%` }} />
                    </div>
                    <div className="admin-subtitle mt-1">{Math.round(approvalPercent)}%</div>
                  </div>

                  <div className="table-responsive mb-3">
                    <table className="premium-table">
                      <tbody>
                        <tr><th style={{ width: '40%' }}>Transaction ID</th><td>{multisigTx.txId}</td></tr>
                        <tr><th>Action</th><td>{multisigTx.label}</td></tr>
                        <tr><th>Details</th><td>{multisigTx.details}</td></tr>
                        <tr><th>Category</th><td>{multisigTx.category}</td></tr>
                        <tr><th>Target label</th><td>{multisigTx.targetLabel}</td></tr>
                        <tr><th>Target address</th><td className="mono">{multisigTx.to}</td></tr>
                        <tr><th>Confirmations</th><td>{multisigTx.confirmations} / {multisigStats.requiredConfirmations}</td></tr>
                        <tr><th>Executed</th><td>{String(multisigTx.executed)}</td></tr>
                        <tr><th>Submitted at</th><td>{formatUnix(multisigTx.submittedAt)}</td></tr>
                        <tr><th>Execute after</th><td>{formatUnix(multisigTx.executeAfter)}</td></tr>
                        <tr><th>Current chain time</th><td>{formatUnix(multisigStats.currentTimestamp)}</td></tr>
                        <tr><th>Native value</th><td>{multisigTx.value}</td></tr>
                        <tr><th>Calldata</th><td className="mono" style={{ wordBreak: 'break-all', maxWidth: '300px' }}>{multisigTx.data}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {(multisigTx.implementationAddress || multisigTx.proxyAddress) && (
                    <div className="soft-panel-premium mb-3">
                      <div className="small-label-premium mb-2">Upgrade / guardian checks</div>
                      <div>Proxy approved: <span className={`premium-badge ${guardianChecks.proxyApproved ? 'premium-badge-success' : 'premium-badge-danger'}`}>{guardianChecks.proxyApproved === null ? 'Unknown' : boolText(guardianChecks.proxyApproved)}</span></div>
                      <div className="mt-2">Implementation approved: <span className={`premium-badge ${guardianChecks.implementationApproved ? 'premium-badge-success' : 'premium-badge-danger'}`}>{guardianChecks.implementationApproved === null ? 'Unknown' : boolText(guardianChecks.implementationApproved)}</span></div>
                    </div>
                  )}

                  <div>
                    <div className="small-label-premium mb-2">Who approved?</div>
                    <div>
                      {selectedTxApprovals.map((item) => (
                        <span key={item.owner} className="owner-sign-pill-premium">
                          <span className="mono">{shortAddress(item.owner)}</span>
                          <span className={`premium-badge ${item.approved ? 'premium-badge-success' : 'premium-badge-dark'}`}>
                            {item.approved ? 'Signed' : 'Pending'}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Governance Operations Accordion */}
      <Row className="g-3 mb-4">
        <Col xl={12}>
          <div className="admin-card-premium">
            <div className="admin-header-premium">
              <div className="header-title">Governance Operations</div>
            </div>
            <div className="admin-body-premium">
              <Accordion defaultActiveKey={['0']} alwaysOpen className="premium-accordion">
                
                {/* Founder wallets and representatives */}
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Founder wallets and representatives</Accordion.Header>
                  <Accordion.Body>
                    <Row className="g-3">
                      <Col xl={6}>
                        <div className="admin-subtitle mb-3">This creates a multisig proposal to update all 8 founder wallets and their ratios.</div>
                        <div className="soft-panel-premium mb-3">
                          <div className="small-label-premium mb-2">Current founder distribution</div>
                          <div className="table-responsive">
                            <table className="premium-table mb-0">
                              <thead>
                                <tr><th>Wallet Address</th><th>Weight</th></tr>
                              </thead>
                              <tbody>
                                {founderWallets.map((wallet, index) => (
                                  <tr key={index}>
                                    <td className="mono">{wallet.slice(0, 10)}...{wallet.slice(-8)}</td>
                                    <td>{(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%</td>
                                  </tr>
                                ))}
                                {founderWallets.length === 0 && (
                                  <tr><td colSpan={2} style={{ color: 'rgba(255,255,255,0.4)' }}>No founder wallets configured yet.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="small-label-premium mb-2">Set All Founder Wallets</div>
                        <button className="btn-premium btn-premium-sm mb-3" onClick={fillFounderTestAddresses} disabled={txStatus.loading}>Fill Test Addresses</button>

                        {walletInputs.map((wallet, index) => (
                          <div key={index} className="wallet-grid-premium mb-2">
                            <Form.Control className="input-premium" type="text" placeholder={`Founder ${index + 1} Address`} value={wallet} onChange={(e) => handleWalletInputChange(index, e.target.value)} disabled={txStatus.loading} />
                            <Form.Control className="input-premium" type="number" placeholder="Ratio" value={ratioInputs[index]} onChange={(e) => handleRatioInputChange(index, e.target.value)} disabled={txStatus.loading} />
                          </div>
                        ))}

                        <div className="flex-between-premium mt-3">
                          <span className={totalRatio === 10000 ? 'text-glow' : 'text-danger'}>Total Ratio: {totalRatio} / 10000</span>
                          <button className="btn-premium" onClick={handleSetFounderWallets} disabled={txStatus.loading}>Submit founder wallet proposal</button>
                        </div>
                      </Col>

                      <Col xl={6}>
                        <div className="action-card-premium mb-3">
                          <div className="small-label-premium">Founder representative proposal</div>
                          <div className="admin-subtitle mb-3">Submit a multisig proposal to add a founder representative.</div>
                          <div className="flex-between-premium mb-3" style={{ gap: '8px' }}>
                            <Form.Control className="input-premium" placeholder="Representative address (0x...)" value={repAddress} onChange={(e) => setRepAddress(e.target.value)} />
                            <button className="btn-premium btn-premium-sm" onClick={fillRepTestAddress} disabled={txStatus.loading}>Fill Test</button>
                          </div>
                          <button className="btn-premium w-100" onClick={handleAddFounderRep} disabled={txStatus.loading || !repAddress}>Submit representative proposal</button>
                        </div>

                        <div className="action-card-premium">
                          <div className="small-label-premium">Charge routing proposal</div>
                          <div className="admin-subtitle mb-3">Submit a proposal to update NFT pool and operations wallet routing.</div>
                          <div className="flex-between-premium mb-3" style={{ gap: '8px' }}>
                            <Form.Control className="input-premium" placeholder="NFT Pool Address" value={nftPool} onChange={(e) => setNftPool(e.target.value)} />
                            <button className="btn-premium btn-premium-sm" onClick={fillChargeTestAddresses} disabled={txStatus.loading}>Fill Both</button>
                          </div>
                          <Form.Control className="input-premium mb-3" placeholder="Operations Wallet Address" value={opsWallet} onChange={(e) => setOpsWallet(e.target.value)} />
                          <button className="btn-premium w-100" onClick={handleUpdateChargeRecipients} disabled={txStatus.loading}>Submit charge routing proposal</button>
                        </div>
                      </Col>
                    </Row>
                  </Accordion.Body>
                </Accordion.Item>

                {/* Guardian approvals and upgrade flow */}
                <Accordion.Item eventKey="1">
                  <Accordion.Header>Guardian approvals and upgrade flow</Accordion.Header>
                  <Accordion.Body>
                    <Row className="g-3">
                      <Col xl={4}>
                        <div className="action-card-premium">
                          <div className="small-label-premium">Approve proxy</div>
                          <div className="admin-subtitle mb-3">Allow or revoke a proxy address in Guardian.</div>
                          <Form.Control className="input-premium mb-3" placeholder="Proxy address" value={guardianProxyInput} onChange={(e) => setGuardianProxyInput(e.target.value)} />
                          <div className="flex-between-premium" style={{ gap: '8px' }}>
                            <button className="btn-premium w-100" onClick={() => handleGuardianApproveProxy(true)} disabled={txStatus.loading}>Approve proxy</button>
                            <button className="btn-premium w-100" onClick={() => handleGuardianApproveProxy(false)} disabled={txStatus.loading}>Revoke proxy</button>
                          </div>
                        </div>
                      </Col>
                      <Col xl={4}>
                        <div className="action-card-premium">
                          <div className="small-label-premium">Approve implementation</div>
                          <div className="admin-subtitle mb-3">Allow or revoke an implementation for a specific proxy.</div>
                          <Form.Control className="input-premium mb-2" placeholder="Proxy address" value={guardianImplProxyInput} onChange={(e) => setGuardianImplProxyInput(e.target.value)} />
                          <Form.Control className="input-premium mb-3" placeholder="Implementation address" value={guardianImplInput} onChange={(e) => setGuardianImplInput(e.target.value)} />
                          <div className="flex-between-premium" style={{ gap: '8px' }}>
                            <button className="btn-premium w-100" onClick={() => handleGuardianApproveImplementation(true)} disabled={txStatus.loading}>Approve impl</button>
                            <button className="btn-premium w-100" onClick={() => handleGuardianApproveImplementation(false)} disabled={txStatus.loading}>Revoke impl</button>
                          </div>
                        </div>
                      </Col>
                      <Col xl={4}>
                        <div className="action-card-premium">
                          <div className="small-label-premium">Submit upgrade proposal</div>
                          <div className="admin-subtitle mb-3">Create the multisig upgrade transaction for a proxy after implementation approval.</div>
                          <Form.Control className="input-premium mb-2" placeholder="Proxy address" value={upgradeProxyInput} onChange={(e) => setUpgradeProxyInput(e.target.value)} />
                          <Form.Control className="input-premium mb-3" placeholder="New implementation address" value={upgradeImplementationInput} onChange={(e) => setUpgradeImplementationInput(e.target.value)} />
                          <button className="btn-premium w-100" onClick={handleSubmitUpgradeProposal} disabled={txStatus.loading}>Submit upgrade proposal</button>
                        </div>
                      </Col>
                    </Row>
                  </Accordion.Body>
                </Accordion.Item>

                {/* Multisig owner management */}
                <Accordion.Item eventKey="2">
                  <Accordion.Header>Multisig owner management</Accordion.Header>
                  <Accordion.Body>
                    <Row className="g-3">
                      <Col xl={3}>
                        <div className="action-card-premium">
                          <div className="small-label-premium">Add owner</div>
                          <Form.Control className="input-premium mb-3" placeholder="New owner address" value={addOwnerInput} onChange={(e) => setAddOwnerInput(e.target.value)} />
                          <button className="btn-premium w-100" onClick={handleAddOwnerProposal} disabled={txStatus.loading}>Submit add owner</button>
                        </div>
                      </Col>
                      <Col xl={3}>
                        <div className="action-card-premium">
                          <div className="small-label-premium">Remove owner</div>
                          <Form.Control className="input-premium mb-3" placeholder="Owner address" value={removeOwnerInput} onChange={(e) => setRemoveOwnerInput(e.target.value)} />
                          <button className="btn-premium w-100" onClick={handleRemoveOwnerProposal} disabled={txStatus.loading}>Submit remove owner</button>
                        </div>
                      </Col>
                      <Col xl={3}>
                        <div className="action-card-premium">
                          <div className="small-label-premium">Replace owner</div>
                          <Form.Control className="input-premium mb-2" placeholder="Old owner" value={replaceOwnerOldInput} onChange={(e) => setReplaceOwnerOldInput(e.target.value)} />
                          <Form.Control className="input-premium mb-3" placeholder="New owner" value={replaceOwnerNewInput} onChange={(e) => setReplaceOwnerNewInput(e.target.value)} />
                          <button className="btn-premium w-100" onClick={handleReplaceOwnerProposal} disabled={txStatus.loading}>Submit replace owner</button>
                        </div>
                      </Col>
                      <Col xl={3}>
                        <div className="action-card-premium">
                          <div className="small-label-premium">Change requirement</div>
                          <Form.Control className="input-premium mb-3" type="number" placeholder="Required confirmations" value={changeRequirementInput} onChange={(e) => setChangeRequirementInput(e.target.value)} />
                          <button className="btn-premium w-100" onClick={handleChangeRequirementProposal} disabled={txStatus.loading}>Submit requirement change</button>
                        </div>
                      </Col>
                    </Row>

                    <div className="soft-panel-premium mt-3">
                      <div className="small-label-premium mb-2">Current multisig owners</div>
                      <div>
                        {ownerList.map((owner) => (
                          <span key={owner} className="owner-sign-pill-premium">
                            <span className="mono">{shortAddress(owner)}</span>
                            <span className="premium-badge premium-badge-info">Owner</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>

                {/* NEW: Community Content Management */}
                <Accordion.Item eventKey="3">
                  <Accordion.Header>
                    <Globe size={14} style={{ marginRight: '8px' }} />
                    Community Content Management
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="content-tabs-premium">
                      <button className={`content-tab-premium ${activeContentTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveContentTab('announcements')}>
                        <Megaphone size={12} /> Announcements
                      </button>
                      <button className={`content-tab-premium ${activeContentTab === 'events' ? 'active' : ''}`} onClick={() => setActiveContentTab('events')}>
                        <Calendar size={12} /> Events
                      </button>
                      <button className={`content-tab-premium ${activeContentTab === 'socialLinks' ? 'active' : ''}`} onClick={() => setActiveContentTab('socialLinks')}>
                        <Link2 size={12} /> Social Links
                      </button>
                      <button className={`content-tab-premium ${activeContentTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveContentTab('resources')}>
                        <FileText size={12} /> Resources
                      </button>
                    </div>

                    <div className="flex-between-premium mb-3">
                      <div className="admin-subtitle">
                        {contentLoading ? 'Loading...' : `${getContentList().length} items`}
                      </div>
                      <button className="btn-premium btn-premium-sm" onClick={openCreateModal}>
                        <Plus size={12} /> Create New
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Title/Label</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contentLoading ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center' }}><Spinner size="sm" /></td></tr>
                          ) : getContentList().length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No items found.</td></tr>
                          ) : (
                            getContentList().map((item) => (
                              <tr key={item._id}>
                                <td>
                                  <div className="fw-bold">{item.title || item.label || item.platform || item.key}</div>
                                  <div className="admin-subtitle">{item.content?.slice(0, 30) || item.href || item.route}</div>
                                </td>
                                <td>
                                  <span className={`premium-badge ${item.isActive ? 'premium-badge-success' : 'premium-badge-dark'}`}>
                                    {item.isActive ? <Eye size={10} /> : <EyeOff size={10} />} {item.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn-premium btn-premium-sm btn-premium-icon" onClick={() => openEditModal(item)}>
                                      <Edit size={12} />
                                    </button>
                                    <button className="btn-premium btn-premium-sm btn-premium-icon btn-premium-danger" onClick={() => handleDeleteContent(item._id)}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>

                {/* NEW: Founder Vault Distribution Viewer */}
                <Accordion.Item eventKey="4">
                  <Accordion.Header>
                    <Users size={14} style={{ marginRight: '8px' }} />
                    Founder Vault Distribution
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="flex-between-premium mb-3">
                      <div>
                        <div className="small-label-premium">ID1 Wallet</div>
                        <div className="mono" style={{ fontSize: '12px' }}>{shortAddress(id1Wallet)}</div>
                      </div>
                      <div>
                        <span className={`premium-badge ${isID1Downline ? 'premium-badge-success' : 'premium-badge-warning'}`}>
                          {isID1Downline ? <Check size={10} /> : <X size={10} />} {isID1Downline ? 'Downline Synced' : 'Non-ID1 Node'}
                        </span>
                      </div>
                      <button className="btn-premium btn-premium-sm" onClick={fetchFounderBalances} disabled={founderRefreshing}>
                        <RefreshCw size={12} className={founderRefreshing ? 'spin' : ''} /> Refresh
                      </button>
                    </div>

                    <div className="founder-summary-card">
                      <Row>
                        <Col md={6}>
                          <div className="small-label-premium">Total Tracked Balance</div>
                          <div className="metric-value-premium" style={{ fontSize: '20px' }}>{totalFounderBalance} USDT</div>
                        </Col>
                        <Col md={6}>
                          <div className="small-label-premium">Distribution Rule</div>
                          <div className="admin-subtitle">Ratios determine founder payout splits</div>
                        </Col>
                      </Row>
                    </div>

                    <div className="table-responsive">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Wallet Address</th>
                            <th>Ratio</th>
                            <th>USDT Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {founderWallets.length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No founder wallets configured.</td></tr>
                          ) : (
                            founderWallets.map((wallet, index) => (
                              <tr key={index}>
                                <td>
                                  <a href={`https://amoy.polygonscan.com/address/${wallet}`} target="_blank" rel="noopener noreferrer" className="text-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="mono">{wallet.slice(0, 10)}...{wallet.slice(-8)}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </td>
                                <td>
                                  <span className="premium-badge premium-badge-info">
                                    {(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%
                                  </span>
                                </td>
                                <td className="fw-bold text-glow">{walletBalances[wallet] || '0.00'} USDT</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>

              </Accordion>
            </div>
          </div>
        </Col>
      </Row>

      {/* Content Modal */}
      <Modal show={showContentModal} onHide={() => setShowContentModal(false)} centered className="premium-modal">
        <Modal.Header closeButton style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Modal.Title style={{ color: 'var(--glow-teal)' }}>
            {editingItem ? 'Edit' : 'Create'} {activeContentTab.slice(0, -1)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'rgba(0,0,0,0.4)', padding: '20px' }}>
          {getContentFields().map((field) => (
            <Form.Group key={field.name} className="mb-3">
              <Form.Label className="small-label-premium">{field.label}</Form.Label>
              {field.type === 'textarea' ? (
                <Form.Control
                  as="textarea"
                  rows={3}
                  className="input-premium"
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  required={field.required}
                />
              ) : field.type === 'select' ? (
                <Form.Select
                  className="input-premium"
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                >
                  <option value="">Select...</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Form.Select>
              ) : field.type === 'checkbox' ? (
                <Form.Check
                  type="checkbox"
                  label="Active"
                  checked={formData[field.name] || false}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                  style={{ color: 'white' }}
                />
              ) : (
                <Form.Control
                  type={field.type}
                  className="input-premium"
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  required={field.required}
                />
              )}
            </Form.Group>
          ))}
        </Modal.Body>
        <Modal.Footer style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button className="btn-premium-secondary" onClick={() => setShowContentModal(false)}>Cancel</button>
          <button className="btn-premium" onClick={editingItem ? handleUpdateContent : handleCreateContent}>
            {editingItem ? 'Update' : 'Create'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Charge Routing Modal */}
      <Modal show={showChargeModal} onHide={() => setShowChargeModal(false)} centered className="premium-modal" size="lg">
        <Modal.Header closeButton style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Modal.Title style={{ color: 'var(--glow-teal)' }}>
            <Wallet size={18} style={{ marginRight: '8px', display: 'inline' }} />
            Configure NFT & Operations Wallets
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'rgba(0,0,0,0.4)', padding: '24px' }}>
          <div className="admin-subtitle mb-4">
            Submit a governance proposal to update the charge recipients for the LevelManager contract.
            This will require multisig approval and timelock execution.
          </div>

          <Form.Group className="mb-4">
            <Form.Label className="small-label-premium">NFT Pool Address</Form.Label>
            <Form.Control
              className="input-premium"
              type="text"
              placeholder="0x..."
              value={nftPool}
              onChange={(e) => setNftPool(e.target.value)}
            />
            <div className="admin-subtitle mt-1">Address that receives NFT-related funds</div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="small-label-premium">Operations Wallet Address</Form.Label>
            <Form.Control
              className="input-premium"
              type="text"
              placeholder="0x..."
              value={opsWallet}
              onChange={(e) => setOpsWallet(e.target.value)}
            />
            <div className="admin-subtitle mt-1">Address that receives operational funds</div>
          </Form.Group>

          <div className="soft-panel-premium mb-4">
            <div className="small-label-premium mb-2">Current Configuration</div>
            <div className="mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              <div>NFT Pool: {nftPool ? shortAddress(nftPool) : 'Not set'}</div>
              <div className="mt-1">Operations: {opsWallet ? shortAddress(opsWallet) : 'Not set'}</div>
            </div>
          </div>

          <div className="flex-between-premium" style={{ gap: '12px' }}>
            <button 
              className="btn-premium-secondary" 
              onClick={() => {
                const [randomNft, randomOps] = generateRandomEthAddresses(2)
                setNftPool(randomNft)
                setOpsWallet(randomOps)
              }}
              disabled={txStatus.loading}
            >
              <RefreshCw size={14} /> Fill Test Addresses
            </button>
            <button 
              className="btn-premium" 
              onClick={async () => {
                await handleUpdateChargeRecipients()
                if (!txStatus.error) {
                  setShowChargeModal(false)
                }
              }}
              disabled={txStatus.loading || !nftPool || !opsWallet}
            >
              Submit Charge Routing Proposal
            </button>
          </div>

          {txStatus.loading && (
            <div className="mt-3 text-center">
              <Spinner size="sm" /> Submitting proposal...
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Floating Action Button */}
      <button 
        className="fab-premium"
        onClick={() => setShowChargeModal(true)}
        title="Configure NFT & Operations Wallets"
      >
        <Wallet size={24} />
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .premium-modal .modal-content {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          overflow: hidden;
        }

        .admin-shell-premium {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          min-height: calc(100vh - 80px);
          will-change: transform;
          transform: translateZ(0);
        }

        .glass-panel-premium,
        .admin-card-premium,
        .admin-hero-premium {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        .premium-table {
          will-change: transform;
          transform: translateZ(0);
        }

        .table-responsive {
          -webkit-overflow-scrolling: touch;
        }

        .input-premium {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.12) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 12px;
          color: #ffffff !important;
          font-family: monospace;
          font-size: 13px;
          transition: all 0.2s;
          caret-color: var(--glow-teal);
        }

        .input-premium:focus {
          outline: none;
          border-color: var(--glow-teal) !important;
          background: rgba(255, 255, 255, 0.18) !important;
          color: #ffffff !important;
        }

        .input-premium::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }

        .form-control.input-premium,
        textarea.input-premium,
        select.input-premium {
          background: rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
        }
      `}</style>
    </Container>
  )
}

export default AdminPanel














// import React, { useState, useEffect, useMemo, useCallback } from 'react'
// import { Container, Row, Col, Form, Button, Alert, Spinner, Table, Accordion, Modal, Nav, Badge } from 'react-bootstrap'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'
// import { web3Service } from '../Services/web3'
// import { ethers } from 'ethers'
// import { useTranslation } from 'react-i18next'
// import {
//   Key, Crown, BarChart3, Clock, AlertTriangle, Plus, Edit, Trash2,
//   Eye, EyeOff, RefreshCw, Globe, Users, Calendar, Link2, FileText,
//   Megaphone, ExternalLink, ChevronRight, X, Check, Tag, Hash
// } from 'lucide-react'

// // ============================================================
// // CONSTANTS & INTERFACES
// // ============================================================
// const API_BASE_URL = 'http://localhost:5000'
// const ADMIN_API_KEY = 'TheEagleEyeOfThe4thBatallionWeaveHowManyFounders1234567ky4574'
// const ADMIN_API_HEADER = 'x-admin-key'

// const levelManagerAdminIface = new ethers.Interface([
//   'function pause()',
//   'function unpause()',
//   'function setFounderWallets(address[] wallets,uint256[] ratios)',
//   'function setFounderRepresentatives(address[] reps)',
//   'function updateChargeRecipients(address _nftPool,address _operations)',
//   'function setGuardian(address _guardian)',
//   'function setTokenController(address _tokenController)',
//   'function setOrbitContracts(address _p4Orbit,address _p12Orbit,address _p39Orbit)',
//   'function approveEscrow(uint256 amount)',
//   'function setFounderRepInOrbits(address user,bool status)',
//   'function upgradeToAndCall(address newImplementation,bytes data)',
//   'function upgradeTo(address newImplementation)'
// ])

// const guardianIface = new ethers.Interface([
//   'function setApprovedProxy(address proxy,bool allowed)',
//   'function setApprovedImplementation(address proxy,address implementation,bool allowed)',
//   'function batchSetApprovedImplementations(address proxy,address[] implementations,bool allowed)',
//   'function setGlobalUpgradeFreeze(bool frozen)',
//   'function pause()',
//   'function unpause()'
// ])

// const multisigSelfIface = new ethers.Interface([
//   'function addOwner(address owner)',
//   'function removeOwner(address owner)',
//   'function replaceOwner(address oldOwner,address newOwner)',
//   'function changeRequirement(uint256 _requiredConfirmations)'
// ])

// const boolText = (v) => (v ? 'Yes' : 'No')

// // Admin API helper
// const adminApi = async (endpoint, options = {}) => {
//   const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//     headers: {
//       'Content-Type': 'application/json',
//       [ADMIN_API_HEADER]: ADMIN_API_KEY,
//       ...(options.headers || {}),
//     },
//     ...options,
//   })
//   const payload = await response.json().catch(() => null)
//   if (!response.ok) {
//     throw new Error(payload?.message || `Request failed: ${response.status}`)
//   }
//   return payload
// }

// // ============================================================
// // COMPONENT
// // ============================================================
// export const AdminPanel = () => {
//   const { isConnected, account, connect } = useWallet()
//   const { contracts, isLoading, error, loadContracts } = useContracts()
//   const { t } = useTranslation()

//   // ========== EXISTING STATE ==========
//   const [founderWallets, setFounderWallets] = useState([])
//   const [founderRatios, setFounderRatios] = useState([])
//   const [walletInputs, setWalletInputs] = useState(Array(8).fill(''))
//   const [ratioInputs, setRatioInputs] = useState(Array(8).fill('1250'))
//   const [repAddress, setRepAddress] = useState('')
//   const [nftPool, setNftPool] = useState('')
//   const [opsWallet, setOpsWallet] = useState('')

//   const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null, note: null })
//   const [isOwner, setIsOwner] = useState(false)
//   const [ownerCheckComplete, setOwnerCheckComplete] = useState(false)

//   const [txIdInput, setTxIdInput] = useState('')
//   const [multisigTx, setMultisigTx] = useState(null)
//   const [recentTxs, setRecentTxs] = useState([])
//   const [ownerList, setOwnerList] = useState([])

//   const [guardianState, setGuardianState] = useState({
//     paused: false,
//     globalUpgradeFreeze: false
//   })

//   const [systemState, setSystemState] = useState({
//     levelManagerPaused: false
//   })

//   const [guardianProxyInput, setGuardianProxyInput] = useState('')
//   const [guardianImplProxyInput, setGuardianImplProxyInput] = useState('')
//   const [guardianImplInput, setGuardianImplInput] = useState('')
//   const [upgradeProxyInput, setUpgradeProxyInput] = useState(import.meta.env.VITE_LEVELMANAGER_ADDRESS || '')
//   const [upgradeImplementationInput, setUpgradeImplementationInput] = useState('')
//   const [addOwnerInput, setAddOwnerInput] = useState('')
//   const [removeOwnerInput, setRemoveOwnerInput] = useState('')
//   const [replaceOwnerOldInput, setReplaceOwnerOldInput] = useState('')
//   const [replaceOwnerNewInput, setReplaceOwnerNewInput] = useState('')
//   const [changeRequirementInput, setChangeRequirementInput] = useState('4')
//   const [selectedTxApprovals, setSelectedTxApprovals] = useState([])
//   const [guardianChecks, setGuardianChecks] = useState({
//     proxyApproved: null,
//     implementationApproved: null
//   })

//   const [multisigStats, setMultisigStats] = useState({
//     requiredConfirmations: '0',
//     txCount: '0',
//     queuedTxCount: '0',
//     executedTxCount: '0',
//     currentTimestamp: Math.floor(Date.now() / 1000),
//     timelockDelay: '0'
//   })

//   // ========== NEW STATE: Founder Vault Viewer ==========
//   const [walletBalances, setWalletBalances] = useState({})
//   const [id1Wallet, setId1Wallet] = useState('')
//   const [isID1Downline, setIsID1Downline] = useState(false)
//   const [founderRefreshing, setFounderRefreshing] = useState(false)
//   const [totalFounderBalance, setTotalFounderBalance] = useState('0.00')

//   // ========== NEW STATE: Community Content Management ==========
//   const [announcements, setAnnouncements] = useState([])
//   const [events, setEvents] = useState([])
//   const [socialLinks, setSocialLinks] = useState([])
//   const [resources, setResources] = useState([])
//   const [activeContentTab, setActiveContentTab] = useState('announcements')
//   const [showContentModal, setShowContentModal] = useState(false)
//   const [editingItem, setEditingItem] = useState(null)
//   const [contentLoading, setContentLoading] = useState(false)
//   const [formData, setFormData] = useState({})

//   const totalRatio = useMemo(
//     () => ratioInputs.reduce((sum, r) => sum + parseInt(r || 0, 10), 0),
//     [ratioInputs]
//   )

//   const levelManagerAddress = import.meta.env.VITE_LEVELMANAGER_ADDRESS
//   const guardianAddress = import.meta.env.VITE_GUARDIAN_ADDRESS || ''
//   const multisigAddress = import.meta.env.VITE_MULTISIG_ADDRESS || ''

//   // ============================================================
//   // PREMIUM GLASS STYLES (with spacing fixes)
//   // ============================================================
//   const adminStyles = `
//     .admin-shell-premium {
//       padding: 20px;
//       max-width: 1400px;
//       margin: 0 auto;
//       min-height: calc(100vh - 80px);
//     }
//     .glass-panel-premium {
//       background: rgba(0, 0, 0, 0.35);
//       backdrop-filter: blur(10px);
//       border: 1px solid rgba(255, 255, 255, 0.08);
//       border-radius: 20px;
//       overflow: hidden;
//     }
//     .admin-hero-premium {
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       flex-wrap: wrap;
//       gap: 16px;
//       padding: 20px 24px;
//       margin-bottom: 20px;
//       background: rgba(0, 0, 0, 0.35);
//       backdrop-filter: blur(10px);
//       border: 1px solid rgba(255, 255, 255, 0.08);
//       border-radius: 24px;
//     }
//     .admin-title-premium {
//       font-size: clamp(1.5rem, 4vw, 2rem);
//       font-weight: 800;
//       letter-spacing: -0.02em;
//       background: linear-gradient(135deg, #fff, var(--glow-teal));
//       -webkit-background-clip: text;
//       background-clip: text;
//       color: transparent;
//       margin: 0;
//     }
//     .admin-subtitle {
//       font-size: 12px;
//       color: rgba(255,255,255,0.5);
//       margin-top: 4px;
//     }
//     .admin-badge-premium {
//       display: inline-flex;
//       align-items: center;
//       gap: 6px;
//       padding: 6px 12px;
//       background: rgba(255,255,255,0.08);
//       border-radius: 30px;
//       font-size: 12px;
//       font-weight: 500;
//       color: rgba(255,255,255,0.8);
//       font-family: monospace;
//     }
//     .admin-card-premium {
//       background: rgba(0, 0, 0, 0.35);
//       backdrop-filter: blur(10px);
//       border: 1px solid rgba(255, 255, 255, 0.08);
//       border-radius: 20px;
//       overflow: hidden;
//       margin-bottom: 20px;
//       height: 100%;
//       transition: all 0.2s;
//     }
//     .admin-card-premium:hover {
//       border-color: rgba(29, 233, 182, 0.3);
//     }
//     .admin-header-premium {
//       background: linear-gradient(135deg, rgba(29, 233, 182, 0.12), rgba(77, 163, 255, 0.08));
//       padding: 14px 18px;
//       border-bottom: 1px solid rgba(255,255,255,0.08);
//     }
//     .admin-header-premium h3, .admin-header-premium .header-title {
//       margin: 0;
//       font-size: 14px;
//       font-weight: 700;
//       letter-spacing: 1px;
//       color: var(--glow-teal);
//       text-transform: uppercase;
//       display: flex;
//       align-items: center;
//       gap: 8px;
//     }
//     .admin-body-premium {
//       padding: 16px;
//     }
//     .input-premium {
//       width: 100%;
//       padding: 10px 14px;
//       background: rgba(255,255,255,0.08);
//       border: 1px solid rgba(255,255,255,0.12);
//       border-radius: 12px;
//       color: white;
//       font-family: monospace;
//       font-size: 13px;
//       transition: all 0.2s;
//     }
//     .input-premium:focus {
//       outline: none;
//       border-color: var(--glow-teal);
//       background: rgba(255,255,255,0.12);
//     }
//     .input-premium::placeholder {
//       color: rgba(255,255,255,0.3);
//     }
//     .btn-premium {
//       padding: 10px 20px;
//       border-radius: 12px;
//       font-weight: 600;
//       font-size: 12px;
//       text-transform: uppercase;
//       letter-spacing: 0.5px;
//       border: none;
//       cursor: pointer;
//       transition: all 0.2s;
//       background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//       color: #07111f;
//       display: inline-flex;
//       align-items: center;
//       gap: 6px;
//       justify-content: center;
//     }
//     .btn-premium-secondary {
//       background: rgba(255,255,255,0.1);
//       color: white;
//       border: 1px solid rgba(255,255,255,0.15);
//     }
//     .btn-premium-danger {
//       background: linear-gradient(135deg, #ef4444, #dc2626);
//       color: white;
//     }
//     .btn-premium-sm {
//       padding: 6px 12px;
//       font-size: 11px;
//     }
//     .btn-premium-icon {
//       padding: 6px 10px;
//     }
//     .btn-premium:disabled {
//       opacity: 0.5;
//       cursor: not-allowed;
//     }
//     .premium-table {
//       width: 100%;
//       font-size: 13px;
//     }
//     .premium-table th {
//       padding: 10px 12px;
//       text-align: left;
//       color: rgba(255,255,255,0.6);
//       font-weight: 600;
//       font-size: 11px;
//       text-transform: uppercase;
//       letter-spacing: 0.5px;
//       border-bottom: 1px solid rgba(255,255,255,0.08);
//     }
//     .premium-table td {
//       padding: 10px 12px;
//       border-bottom: 1px solid rgba(255,255,255,0.05);
//       vertical-align: middle;
//     }
//     .premium-badge {
//       padding: 4px 10px;
//       border-radius: 20px;
//       font-size: 11px;
//       font-weight: 600;
//       display: inline-block;
//     }
//     .premium-badge-success { background: rgba(29, 233, 182, 0.2); color: #1de9b6; }
//     .premium-badge-warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
//     .premium-badge-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
//     .premium-badge-info { background: rgba(77, 163, 255, 0.2); color: #4da3ff; }
//     .premium-badge-dark { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
//     .premium-progress {
//       height: 6px;
//       background: rgba(255,255,255,0.1);
//       border-radius: 3px;
//       overflow: hidden;
//     }
//     .premium-progress-fill {
//       height: 100%;
//       background: linear-gradient(90deg, var(--glow-teal), #1a9b7a);
//       border-radius: 3px;
//       transition: width 0.3s;
//     }
//     .premium-accordion .accordion-item {
//       background: transparent;
//       border: 1px solid rgba(255,255,255,0.08);
//       border-radius: 16px;
//       margin-bottom: 12px;
//       overflow: hidden;
//     }
//     .premium-accordion .accordion-button {
//       background: rgba(0,0,0,0.3);
//       color: white;
//       font-weight: 600;
//       padding: 14px 18px;
//     }
//     .premium-accordion .accordion-button:not(.collapsed) {
//       background: rgba(29, 233, 182, 0.1);
//       color: var(--glow-teal);
//     }
//     .premium-accordion .accordion-button:focus {
//       box-shadow: none;
//       border-color: transparent;
//     }
//     .premium-accordion .accordion-body {
//       background: rgba(0,0,0,0.2);
//       padding: 16px;
//     }
//     .metric-box-premium {
//       background: rgba(255,255,255,0.05);
//       border-radius: 16px;
//       padding: 14px;
//       text-align: center;
//       height: 100%;
//       display: flex;
//       flex-direction: column;
//       justify-content: center;
//     }
//     .metric-label-premium {
//       font-size: 10px;
//       text-transform: uppercase;
//       letter-spacing: 1px;
//       color: rgba(255,255,255,0.5);
//       margin-bottom: 6px;
//     }
//     .metric-value-premium {
//       font-size: 16px;
//       font-weight: 700;
//       color: var(--glow-teal);
//     }
//     .action-card-premium {
//       background: rgba(255,255,255,0.05);
//       border-radius: 16px;
//       padding: 14px;
//       height: 100%;
//       display: flex;
//       flex-direction: column;
//     }
//     .small-label-premium {
//       font-size: 10px;
//       text-transform: uppercase;
//       letter-spacing: 1px;
//       color: rgba(255,255,255,0.5);
//       margin-bottom: 8px;
//     }
//     .chip-premium {
//       display: inline-flex;
//       align-items: center;
//       gap: 6px;
//       padding: 4px 10px;
//       background: rgba(255,255,255,0.08);
//       border-radius: 20px;
//       font-size: 11px;
//       font-family: monospace;
//     }
//     .grid-3-premium {
//       display: grid;
//       grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
//       gap: 14px;
//     }
//     .grid-2-premium {
//       display: grid;
//       grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
//       gap: 14px;
//     }
//     .flex-between-premium {
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       flex-wrap: wrap;
//       gap: 10px;
//     }
//     .guide-step-premium {
//       border-left: 3px solid var(--glow-teal);
//       padding: 10px 12px;
//       background: rgba(29, 233, 182, 0.05);
//       border-radius: 12px;
//       margin-bottom: 8px;
//     }
//     .soft-panel-premium {
//       padding: 12px;
//       border-radius: 16px;
//       background: rgba(255,255,255,0.05);
//       border: 1px solid rgba(255,255,255,0.08);
//     }
//     .mono {
//       font-family: monospace;
//       font-size: 12px;
//     }
//     .text-glow {
//       color: var(--glow-teal);
//     }
//     .wallet-grid-premium {
//       display: grid;
//       grid-template-columns: 1fr 100px;
//       gap: 8px;
//       margin-bottom: 8px;
//       align-items: center;
//     }
//     .owner-sign-pill-premium {
//       display: inline-flex;
//       align-items: center;
//       gap: 6px;
//       padding: 4px 10px;
//       background: rgba(255,255,255,0.08);
//       border-radius: 30px;
//       font-size: 11px;
//       font-family: monospace;
//       margin: 2px 4px 2px 0;
//     }
//     .tx-row-premium:hover {
//       background: rgba(255,255,255,0.03);
//     }
//     .alert-premium {
//       background: rgba(0,0,0,0.5);
//       backdrop-filter: blur(10px);
//       border: 1px solid rgba(255,255,255,0.1);
//       border-radius: 16px;
//       color: white;
//       margin-bottom: 16px;
//     }
//     .alert-premium a {
//       color: var(--glow-teal);
//     }
//     .content-tabs-premium {
//       display: flex;
//       gap: 4px;
//       border-bottom: 1px solid rgba(255,255,255,0.08);
//       padding-bottom: 12px;
//       margin-bottom: 16px;
//     }
//     .content-tab-premium {
//       padding: 8px 16px;
//       border-radius: 30px;
//       background: transparent;
//       border: none;
//       color: rgba(255,255,255,0.6);
//       font-size: 12px;
//       font-weight: 600;
//       text-transform: uppercase;
//       letter-spacing: 0.5px;
//       cursor: pointer;
//       transition: all 0.2s;
//       display: flex;
//       align-items: center;
//       gap: 6px;
//     }
//     .content-tab-premium:hover {
//       background: rgba(255,255,255,0.05);
//       color: white;
//     }
//     .content-tab-premium.active {
//       background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//       color: #07111f;
//     }
//     .founder-summary-card {
//       background: linear-gradient(135deg, rgba(29, 233, 182, 0.08), rgba(77, 163, 255, 0.04));
//       border-radius: 16px;
//       padding: 16px;
//       margin-bottom: 16px;
//     }
//     @media (max-width: 768px) {
//       .admin-shell-premium { padding: 12px; }
//       .admin-hero-premium { flex-direction: column; align-items: flex-start; }
//       .grid-3-premium, .grid-2-premium { grid-template-columns: 1fr; }
//       .wallet-grid-premium { grid-template-columns: 1fr; }
//       .content-tabs-premium { flex-wrap: wrap; }
//     }
//   `

//   // ============================================================
//   // HELPER FUNCTIONS
//   // ============================================================
//   const generateRandomEthAddresses = (count = 1) => Array.from({ length: count }, () => ethers.Wallet.createRandom().address)

//   const shortAddress = (addr) => (!addr ? '—' : `${addr.slice(0, 8)}...${addr.slice(-6)}`)

//   const formatUnix = (value) => {
//     if (!value) return '—'
//     const date = new Date(Number(value) * 1000)
//     return date.toLocaleString()
//   }

//   const formatCountdown = (seconds) => {
//     if (seconds <= 0) return 'Ready now'
//     const days = Math.floor(seconds / 86400)
//     const hours = Math.floor((seconds % 86400) / 3600)
//     const minutes = Math.floor((seconds % 3600) / 60)
//     const secs = seconds % 60
//     if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`
//     if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
//     if (minutes > 0) return `${minutes}m ${secs}s`
//     return `${secs}s`
//   }

//   const getStageFromTx = useCallback((tx) => {
//     if (!tx) return { label: 'Unknown', variant: 'secondary' }
//     const confirmations = Number(tx.confirmations || 0)
//     const required = Number(multisigStats.requiredConfirmations || 0)
//     const executeAfter = Number(tx.executeAfter || 0)
//     const now = Number(multisigStats.currentTimestamp || 0)
//     const executed = Boolean(tx.executed)
//     if (executed) return { label: 'Executed', variant: 'success' }
//     if (confirmations < required) return { label: 'Waiting for approvals', variant: 'warning' }
//     if (now < executeAfter) return { label: 'Waiting for timelock', variant: 'info' }
//     return { label: 'Ready to execute', variant: 'primary' }
//   }, [multisigStats])

//   const remainingSeconds = useMemo(() => {
//     if (!multisigTx) return 0
//     const executeAfter = Number(multisigTx.executeAfter || 0)
//     const now = Number(multisigStats.currentTimestamp || 0)
//     return Math.max(executeAfter - now, 0)
//   }, [multisigTx, multisigStats.currentTimestamp])

//   const approvalPercent = useMemo(() => {
//     if (!multisigTx) return 0
//     const confirmations = Number(multisigTx.confirmations || 0)
//     const required = Number(multisigStats.requiredConfirmations || 1)
//     return Math.min((confirmations / required) * 100, 100)
//   }, [multisigTx, multisigStats.requiredConfirmations])

//   const decodeTransactionAction = useCallback((tx) => {
//     if (!tx?.data) return { label: 'Unknown action', details: '', category: 'Unknown', targetLabel: shortAddress(tx?.to || '') }

//     const tries = [
//       { iface: levelManagerAdminIface, name: 'LevelManager' },
//       { iface: guardianIface, name: 'Guardian' },
//       { iface: multisigSelfIface, name: 'Multisig' }
//     ]

//     for (const entry of tries) {
//       try {
//         const parsed = entry.iface.parseTransaction({ data: tx.data })
//         if (!parsed) continue

//         const name = parsed.name
//         const args = parsed.args ? Array.from(parsed.args) : []

//         if (entry.name === 'LevelManager') {
//           switch (name) {
//             case 'setFounderWallets':
//               return { label: 'Set founder wallets', details: `${args[0]?.length || 0} wallets proposed`, category: 'Configuration', targetLabel: 'LevelManager' }
//             case 'setFounderRepresentatives':
//               return { label: 'Set founder representatives', details: `${args[0]?.length || 0} representative(s)`, category: 'Configuration', targetLabel: 'LevelManager' }
//             case 'updateChargeRecipients':
//               return { label: 'Update charge recipients', details: `NFT Pool ${shortAddress(args[0])} • Operations ${shortAddress(args[1])}`, category: 'Configuration', targetLabel: 'LevelManager' }
//             case 'pause':
//               return { label: 'Pause protocol', details: 'Pause LevelManager operations', category: 'Emergency', targetLabel: 'LevelManager' }
//             case 'unpause':
//               return { label: 'Unpause protocol', details: 'Resume LevelManager operations', category: 'Emergency', targetLabel: 'LevelManager' }
//             case 'setGuardian':
//               return { label: 'Set guardian', details: shortAddress(args[0]), category: 'Security', targetLabel: 'LevelManager' }
//             case 'setTokenController':
//               return { label: 'Set token controller', details: shortAddress(args[0]), category: 'Configuration', targetLabel: 'LevelManager' }
//             case 'setOrbitContracts':
//               return { label: 'Set orbit contracts', details: `P4 ${shortAddress(args[0])} • P12 ${shortAddress(args[1])} • P39 ${shortAddress(args[2])}`, category: 'Configuration', targetLabel: 'LevelManager' }
//             case 'approveEscrow':
//               return { label: 'Approve escrow', details: `${args[0]?.toString?.() || String(args[0])}`, category: 'Configuration', targetLabel: 'LevelManager' }
//             case 'setFounderRepInOrbits':
//               return { label: 'Set founder rep status in orbits', details: `${shortAddress(args[0])} → ${boolText(args[1])}`, category: 'Configuration', targetLabel: 'LevelManager' }
//             case 'upgradeTo':
//             case 'upgradeToAndCall':
//               return { label: 'Upgrade LevelManager', details: `New implementation ${shortAddress(args[0])}`, category: 'Upgrade', targetLabel: 'LevelManager', implementationAddress: args[0] }
//             default:
//               return { label: name, details: JSON.stringify(args), category: 'LevelManager', targetLabel: 'LevelManager' }
//           }
//         }

//         if (entry.name === 'Guardian') {
//           switch (name) {
//             case 'setApprovedProxy':
//               return { label: 'Set approved proxy', details: `${shortAddress(args[0])} → ${boolText(args[1])}`, category: 'Guardian', targetLabel: 'Guardian' }
//             case 'setApprovedImplementation':
//               return { label: 'Set approved implementation', details: `Proxy ${shortAddress(args[0])} • Impl ${shortAddress(args[1])} • ${boolText(args[2])}`, category: 'Guardian', targetLabel: 'Guardian', proxyAddress: args[0], implementationAddress: args[1] }
//             case 'batchSetApprovedImplementations':
//               return { label: 'Batch implementation approvals', details: `Proxy ${shortAddress(args[0])} • ${args[1]?.length || 0} implementation(s) • ${boolText(args[2])}`, category: 'Guardian', targetLabel: 'Guardian', proxyAddress: args[0] }
//             case 'setGlobalUpgradeFreeze':
//               return { label: args[0] ? 'Freeze upgrades' : 'Unfreeze upgrades', details: `Global upgrade freeze → ${boolText(args[0])}`, category: 'Guardian', targetLabel: 'Guardian' }
//             case 'pause':
//               return { label: 'Pause guardian admin', details: 'Pause guardian mutation functions', category: 'Guardian', targetLabel: 'Guardian' }
//             case 'unpause':
//               return { label: 'Unpause guardian admin', details: 'Resume guardian mutation functions', category: 'Guardian', targetLabel: 'Guardian' }
//             default:
//               return { label: name, details: JSON.stringify(args), category: 'Guardian', targetLabel: 'Guardian' }
//           }
//         }

//         if (entry.name === 'Multisig') {
//           switch (name) {
//             case 'addOwner':
//               return { label: 'Add owner', details: shortAddress(args[0]), category: 'Multisig', targetLabel: 'SimpleMultiSig' }
//             case 'removeOwner':
//               return { label: 'Remove owner', details: shortAddress(args[0]), category: 'Multisig', targetLabel: 'SimpleMultiSig' }
//             case 'replaceOwner':
//               return { label: 'Replace owner', details: `${shortAddress(args[0])} → ${shortAddress(args[1])}`, category: 'Multisig', targetLabel: 'SimpleMultiSig' }
//             case 'changeRequirement':
//               return { label: 'Change requirement', details: `${args[0]?.toString?.() || String(args[0])} confirmations`, category: 'Multisig', targetLabel: 'SimpleMultiSig' }
//             default:
//               return { label: name, details: JSON.stringify(args), category: 'Multisig', targetLabel: 'SimpleMultiSig' }
//           }
//         }
//       } catch {
//         // continue
//       }
//     }

//     return { label: 'Unknown action', details: tx.data, category: 'Unknown', targetLabel: shortAddress(tx.to) }
//   }, [])

//   const readTransaction = useCallback(async (txId) => {
//     if (!contracts?.simpleMultiSig) return null
//     const tx = await contracts.simpleMultiSig.transactions(Number(txId))

//     const approvals = ownerList.length > 0
//       ? await Promise.all(ownerList.map(async (owner) => ({
//           owner,
//           approved: await contracts.simpleMultiSig.approved(Number(txId), owner)
//         })))
//       : []

//     const raw = {
//       txId: Number(txId),
//       to: tx.to,
//       value: tx.value.toString(),
//       data: tx.data,
//       executed: tx.executed,
//       confirmations: tx.confirmations.toString(),
//       submittedAt: tx.submittedAt.toString(),
//       executeAfter: tx.executeAfter.toString(),
//       approvals
//     }

//     return {
//       ...raw,
//       ...decodeTransactionAction(raw)
//     }
//   }, [contracts, ownerList, decodeTransactionAction])

//   const loadGuardianChecks = useCallback(async (proxyAddress, implementationAddress) => {
//     if (!contracts?.guardian) {
//       setGuardianChecks({ proxyApproved: null, implementationApproved: null })
//       return
//     }

//     try {
//       const [proxyApproved, implementationApproved] = await Promise.all([
//         proxyAddress ? contracts.guardian.approvedProxies(proxyAddress) : Promise.resolve(null),
//         proxyAddress && implementationAddress ? contracts.guardian.approvedImplementations(proxyAddress, implementationAddress) : Promise.resolve(null)
//       ])

//       setGuardianChecks({ proxyApproved, implementationApproved })
//     } catch (err) {
//       console.error(err)
//       setGuardianChecks({ proxyApproved: null, implementationApproved: null })
//     }
//   }, [contracts])

//   // ============================================================
//   // NEW: Community Content API Functions
//   // ============================================================
//   const fetchAnnouncements = useCallback(async () => {
//     try {
//       const res = await adminApi('/api/admin/community/announcements')
//       setAnnouncements(res.data || [])
//     } catch (err) { console.error('Fetch announcements failed:', err) }
//   }, [])

//   const fetchEvents = useCallback(async () => {
//     try {
//       const res = await adminApi('/api/admin/community/events')
//       setEvents(res.data || [])
//     } catch (err) { console.error('Fetch events failed:', err) }
//   }, [])

//   const fetchSocialLinks = useCallback(async () => {
//     try {
//       const res = await adminApi('/api/admin/community/social-links')
//       setSocialLinks(res.data || [])
//     } catch (err) { console.error('Fetch social links failed:', err) }
//   }, [])

//   const fetchResources = useCallback(async () => {
//     try {
//       const res = await adminApi('/api/admin/community/resources')
//       setResources(res.data || [])
//     } catch (err) { console.error('Fetch resources failed:', err) }
//   }, [])

//   const fetchAllContent = useCallback(async () => {
//     setContentLoading(true)
//     await Promise.all([fetchAnnouncements(), fetchEvents(), fetchSocialLinks(), fetchResources()])
//     setContentLoading(false)
//   }, [fetchAnnouncements, fetchEvents, fetchSocialLinks, fetchResources])

//   const handleCreateContent = async () => {
//     const endpoints = {
//       announcements: '/api/admin/community/announcements',
//       events: '/api/admin/community/events',
//       socialLinks: '/api/admin/community/social-links',
//       resources: '/api/admin/community/resources'
//     }
//     try {
//       await adminApi(endpoints[activeContentTab], {
//         method: 'POST',
//         body: JSON.stringify(formData)
//       })
//       setShowContentModal(false)
//       setFormData({})
//       fetchAllContent()
//     } catch (err) {
//       alert(`Failed to create: ${err.message}`)
//     }
//   }

//   const handleUpdateContent = async () => {
//     const endpoints = {
//       announcements: `/api/admin/community/announcements/${editingItem._id}`,
//       events: `/api/admin/community/events/${editingItem._id}`,
//       socialLinks: `/api/admin/community/social-links/${editingItem._id}`,
//       resources: `/api/admin/community/resources/${editingItem._id}`
//     }
//     try {
//       await adminApi(endpoints[activeContentTab], {
//         method: 'PATCH',
//         body: JSON.stringify(formData)
//       })
//       setShowContentModal(false)
//       setEditingItem(null)
//       setFormData({})
//       fetchAllContent()
//     } catch (err) {
//       alert(`Failed to update: ${err.message}`)
//     }
//   }

//   const handleDeleteContent = async (id) => {
//     if (!window.confirm('Are you sure you want to delete this item?')) return
//     const endpoints = {
//       announcements: `/api/admin/community/announcements/${id}`,
//       events: `/api/admin/community/events/${id}`,
//       socialLinks: `/api/admin/community/social-links/${id}`,
//       resources: `/api/admin/community/resources/${id}`
//     }
//     try {
//       await adminApi(endpoints[activeContentTab], { method: 'DELETE' })
//       fetchAllContent()
//     } catch (err) {
//       alert(`Failed to delete: ${err.message}`)
//     }
//   }

//   const openEditModal = (item) => {
//     setEditingItem(item)
//     setFormData(item)
//     setShowContentModal(true)
//   }

//   // const openCreateModal = () => {
//   //   setEditingItem(null)
//   //   setFormData({ isActive: true })
//   //   setShowContentModal(true)
//   // }


//   const openCreateModal = () => {
//   setEditingItem(null)
//   // Auto-fill date for announcements
//   const defaultData = { isActive: true }
//   if (activeContentTab === 'announcements') {
//     const today = new Date()
//     defaultData.date = today.toLocaleDateString('en-US', { 
//       month: 'short', 
//       day: 'numeric', 
//       year: 'numeric' 
//     })
//   }
//   setFormData(defaultData)
//   setShowContentModal(true)
// }

//   // ============================================================
//   // NEW: Founder Vault Functions
//   // ============================================================
//   const fetchFounderBalances = useCallback(async () => {
//     if (!contracts?.levelManager || !contracts?.usdt) return
//     setFounderRefreshing(true)
//     try {
//       const [wallets] = await contracts.levelManager.getFounderWallets()
//       const id1 = await contracts.levelManager.id1Wallet()
//       const isDownline = await contracts.levelManager.isID1Downline(account)
      
//       setId1Wallet(id1)
//       setIsID1Downline(isDownline)

//       const balances = {}
//       let total = 0
//       for (const wallet of wallets) {
//         try {
//           const balance = await contracts.usdt.balanceOf(wallet)
//           const formatted = ethers.formatUnits(balance, 6)
//           balances[wallet] = formatted
//           total += parseFloat(formatted)
//         } catch {
//           balances[wallet] = '0.00'
//         }
//       }
//       setWalletBalances(balances)
//       setTotalFounderBalance(total.toFixed(2))
//     } catch (err) {
//       console.error('Fetch founder balances failed:', err)
//     } finally {
//       setFounderRefreshing(false)
//     }
//   }, [contracts, account])

//   // ============================================================
//   // EXISTING FUNCTIONS (Complete, unabbreviated)
//   // ============================================================
//   const refreshGovernanceData = useCallback(async () => {
//     if (!contracts || !account) return

//     try {
//       const ownerMatch = contracts.simpleMultiSig ? await contracts.simpleMultiSig.isOwner(account) : false
//       setIsOwner(ownerMatch)

//       const [
//         requiredConfirmations,
//         txCount,
//         timelockDelay,
//         owners,
//         latestBlock
//       ] = await Promise.all([
//         contracts.simpleMultiSig?.requiredConfirmations?.() ?? 0,
//         contracts.simpleMultiSig?.getTransactionCount?.() ?? 0,
//         contracts.simpleMultiSig?.timelockDelay?.() ?? 0,
//         contracts.simpleMultiSig?.getOwners?.() ?? [],
//         contracts.levelManager?.runner?.provider?.getBlock?.('latest')
//       ])

//       setOwnerList(owners)
//       setMultisigStats({
//         requiredConfirmations: requiredConfirmations.toString(),
//         txCount: txCount.toString(),
//         currentTimestamp: latestBlock?.timestamp || Math.floor(Date.now() / 1000),
//         timelockDelay: timelockDelay.toString()
//       })

//       const guardianPaused = contracts.guardian?.paused ? await contracts.guardian.paused() : false
//       const globalUpgradeFreeze = contracts.guardian?.globalUpgradeFreeze ? await contracts.guardian.globalUpgradeFreeze() : false
//       setGuardianState({
//         paused: guardianPaused,
//         globalUpgradeFreeze
//       })

//       const levelManagerPaused = contracts.levelManager?.paused ? await contracts.levelManager.paused() : false
//       setSystemState({ levelManagerPaused })

//       if (ownerMatch && contracts.levelManager) {
//         const [wallets, ratios] = await contracts.levelManager.getFounderWallets()
//         setFounderWallets(wallets)
//         setFounderRatios(ratios.map(r => r.toString()))

//         const currentNftPool = await contracts.levelManager.nftPool()
//         const currentOpsWallet = await contracts.levelManager.operationsWallet()
//         setNftPool(currentNftPool)
//         setOpsWallet(currentOpsWallet)
//       }

//       const count = Number(txCount)
//       const start = Math.max(0, count - 50)
//       const ids = []
//       for (let i = count - 1; i >= start; i -= 1) ids.push(i)

//       const txs = await Promise.all(ids.map((id) => readTransaction(id)))
//       const validTxs = txs.filter(Boolean)
//       setRecentTxs(txs.filter(Boolean))

//       const queuedTxCount = validTxs.filter((tx) => !tx.executed).length
//       const executedTxCount = validTxs.filter((tx) => tx.executed).length

//       setMultisigStats(prev => ({
//         ...prev,
//         queuedTxCount: queuedTxCount.toString(),
//         executedTxCount: executedTxCount.toString()
//       }))
      
//       if (multisigTx?.txId !== undefined) {
//         const fresh = await readTransaction(multisigTx.txId)
//         setMultisigTx(fresh)
//         setSelectedTxApprovals(fresh?.approvals || [])
//         if (fresh?.proxyAddress || fresh?.implementationAddress) {
//           await loadGuardianChecks(fresh.proxyAddress || levelManagerAddress, fresh.implementationAddress || '')
//         } else {
//           setGuardianChecks({ proxyApproved: null, implementationApproved: null })
//         }
//       }

//       // NEW: Also refresh founder balances
//       await fetchFounderBalances()
//     } catch (err) {
//       console.error('Error fetching admin data:', err)
//     } finally {
//       setOwnerCheckComplete(true)
//     }
//   }, [contracts, account, multisigTx?.txId, readTransaction, loadGuardianChecks, levelManagerAddress, fetchFounderBalances])

//   useEffect(() => {
//     if (contracts) {
//       window.contracts = contracts
//     }
//   }, [contracts])

//   useEffect(() => {
//     window.refreshGovernanceData = refreshGovernanceData
//   }, [refreshGovernanceData])

//   useEffect(() => {
//     window.systemState = systemState
//     window.guardianState = guardianState
//   }, [systemState, guardianState])

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   useEffect(() => {
//     if (contracts && account) {
//       refreshGovernanceData().catch(console.error)
//       fetchAllContent() // NEW: Fetch community content on load
//     }
//   }, [contracts, account, refreshGovernanceData, fetchAllContent])

//   useEffect(() => {
//     const interval = setInterval(async () => {
//       if (!contracts?.levelManager?.runner?.provider) return
//       try {
//         const latestBlock = await contracts.levelManager.runner.provider.getBlock('latest')
//         setMultisigStats((prev) => ({
//           ...prev,
//           currentTimestamp: latestBlock?.timestamp || prev.currentTimestamp
//         }))
//       } catch (err) {
//         console.error(err)
//       }
//     }, 10000)

//     return () => clearInterval(interval)
//   }, [contracts])

//   const getWriteContracts = async () => {
//     const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
//     return writeContracts
//   }

//   const setLoadingTx = (hash = null, note = null) => setTxStatus({ loading: true, hash, error: null, note })
//   const setDoneTx = (hash = null, note = null) => setTxStatus({ loading: false, hash, error: null, note })
//   const setErrorTx = (message) => setTxStatus({ loading: false, hash: null, error: message, note: null })

//   const submitRawProposal = async (target, data, note) => {
//     try {
//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.simpleMultiSig.submitTransaction(target, 0, data)
//       setLoadingTx(tx.hash, note)
//       await tx.wait()
//       setDoneTx(tx.hash, note)
//       await refreshGovernanceData()
//       return tx
//     } catch (err) {
//       setErrorTx(err?.reason || err?.message || `${note} failed`)
//       throw err
//     }
//   }

//   const submitLevelManagerProposal = async (functionName, args = [], note = 'LevelManager proposal submitted') => {
//     try {
//       const data = levelManagerAdminIface.encodeFunctionData(functionName, args)
//       return await submitRawProposal(levelManagerAddress, data, note)
//     } catch (err) {
//       setErrorTx(err?.reason || err?.message || `${note} failed`)
//       throw err
//     }
//   }

//   const submitGuardianProposal = async (functionName, args = [], note = 'Guardian proposal submitted') => {
//     try {
//       if (!guardianAddress) throw new Error('VITE_GUARDIAN_ADDRESS is missing')
//       const data = guardianIface.encodeFunctionData(functionName, args)
//       return await submitRawProposal(guardianAddress, data, note)
//     } catch (err) {
//       setErrorTx(err?.reason || err?.message || `${note} failed`)
//       throw err
//     }
//   }

//   const submitMultisigSelfProposal = async (functionName, args = [], note = 'Multisig proposal submitted') => {
//     try {
//       const target = multisigAddress || contracts?.simpleMultiSig?.target
//       if (!target) throw new Error('Multisig address unavailable')
//       const data = multisigSelfIface.encodeFunctionData(functionName, args)
//       return await submitRawProposal(target, data, note)
//     } catch (err) {
//       setErrorTx(err?.reason || err?.message || `${note} failed`)
//       throw err
//     }
//   }

//   const loadMultisigTx = async (forcedId = null) => {
//     const idToLoad = forcedId ?? txIdInput
//     if (!contracts?.simpleMultiSig || idToLoad === '' || idToLoad === null || idToLoad === undefined) return

//     try {
//       const latestBlock = await contracts.levelManager.runner.provider.getBlock('latest')
//       setMultisigStats((prev) => ({
//         ...prev,
//         currentTimestamp: latestBlock?.timestamp || prev.currentTimestamp
//       }))

//       const tx = await readTransaction(Number(idToLoad))
//       setMultisigTx(tx)
//       setTxIdInput(String(idToLoad))
//       setSelectedTxApprovals(tx?.approvals || [])

//       if (tx?.implementationAddress || tx?.proxyAddress) {
//         await loadGuardianChecks(tx.proxyAddress || levelManagerAddress, tx.implementationAddress || '')
//       } else {
//         setGuardianChecks({ proxyApproved: null, implementationApproved: null })
//       }
//     } catch (err) {
//       console.error(err)
//       setMultisigTx(null)
//       setSelectedTxApprovals([])
//       setGuardianChecks({ proxyApproved: null, implementationApproved: null })
//       setErrorTx(err?.reason || err?.message || 'Failed to load multisig transaction')
//     }
//   }

//   const handleApproveTx = async (forcedId = null) => {
//     const idToUse = Number(forcedId ?? txIdInput)
//     try {
//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.simpleMultiSig.approveTransaction(idToUse)
//       setLoadingTx(tx.hash, `Approving transaction #${idToUse}`)
//       await tx.wait()
//       setDoneTx(tx.hash, `Approved transaction #${idToUse}`)
//       await refreshGovernanceData()
//       await loadMultisigTx(idToUse)
//     } catch (err) {
//       setErrorTx(err?.reason || err?.message || 'Approval failed')
//     }
//   }

//   const handleRevokeTx = async (forcedId = null) => {
//     const idToUse = Number(forcedId ?? txIdInput)
//     try {
//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.simpleMultiSig.revokeConfirmation(idToUse)
//       setLoadingTx(tx.hash, `Revoking approval for transaction #${idToUse}`)
//       await tx.wait()
//       setDoneTx(tx.hash, `Revoked approval for transaction #${idToUse}`)
//       await refreshGovernanceData()
//       await loadMultisigTx(idToUse)
//     } catch (err) {
//       setErrorTx(err?.reason || err?.message || 'Revoke failed')
//     }
//   }

//   const handleExecuteTx = async (forcedId = null) => {
//     const idToUse = Number(forcedId ?? txIdInput)
//     try {
//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.simpleMultiSig.executeTransaction(idToUse)
//       setLoadingTx(tx.hash, `Executing transaction #${idToUse}`)
//       await tx.wait()
//       setDoneTx(tx.hash, `Executed transaction #${idToUse}`)
//       await refreshGovernanceData()
//       await loadMultisigTx(idToUse)
//     } catch (err) {
//       setErrorTx(err?.reason || err?.message || 'Execution failed')
//     }
//   }

//   const handleSubmitPauseProposal = async () => {
//     await submitLevelManagerProposal('pause', [], 'Pause LevelManager proposal')
//   }

//   const handleSubmitUnpauseProposal = async () => {
//     await submitLevelManagerProposal('unpause', [], 'Unpause LevelManager proposal')
//   }

//   const handleSetFounderWallets = async () => {
//     const validWallets = walletInputs.map(w => w.trim())
//     const validRatios = ratioInputs.map(r => parseInt(r || 0, 10))

//     if (validWallets.some(w => !ethers.isAddress(w))) {
//       alert('All founder wallet addresses must be valid Ethereum addresses')
//       return
//     }
//     if (validWallets.length !== 8) {
//       alert('You must provide exactly 8 wallet addresses')
//       return
//     }
//     const ratioSum = validRatios.reduce((sum, r) => sum + r, 0)
//     if (ratioSum !== 10000) {
//       alert(`Ratios must sum to 10000 (currently ${ratioSum})`)
//       return
//     }

//     await submitLevelManagerProposal('setFounderWallets', [validWallets, validRatios], 'Founder wallet proposal')
//   }

//   const handleAddFounderRep = async () => {
//     if (!ethers.isAddress(repAddress)) {
//       alert('Please enter a valid representative address')
//       return
//     }
//     await submitLevelManagerProposal('setFounderRepresentatives', [[repAddress]], 'Representative proposal')
//     setRepAddress('')
//   }

//   const handleUpdateChargeRecipients = async () => {
//     if (!ethers.isAddress(nftPool) || !ethers.isAddress(opsWallet)) {
//       alert('NFT Pool and Operations wallet must be valid Ethereum addresses')
//       return
//     }
//     await submitLevelManagerProposal('updateChargeRecipients', [nftPool, opsWallet], 'Charge routing proposal')
//   }

//   const handleGuardianFreeze = async (frozen) => {
//     await submitGuardianProposal('setGlobalUpgradeFreeze', [frozen], frozen ? 'Freeze upgrades proposal' : 'Unfreeze upgrades proposal')
//   }

//   const handleGuardianPauseAdmin = async (paused) => {
//     await submitGuardianProposal(paused ? 'pause' : 'unpause', [], paused ? 'Pause guardian admin proposal' : 'Unpause guardian admin proposal')
//   }

//   const handleGuardianApproveProxy = async (allowed) => {
//     if (!ethers.isAddress(guardianProxyInput)) {
//       alert('Enter a valid proxy address')
//       return
//     }
//     await submitGuardianProposal('setApprovedProxy', [guardianProxyInput, allowed], allowed ? 'Approve proxy proposal' : 'Revoke proxy approval proposal')
//     await loadGuardianChecks(guardianProxyInput, guardianImplInput)
//   }

//   const handleGuardianApproveImplementation = async (allowed) => {
//     if (!ethers.isAddress(guardianImplProxyInput) || !ethers.isAddress(guardianImplInput)) {
//       alert('Enter valid proxy and implementation addresses')
//       return
//     }
//     await submitGuardianProposal('setApprovedImplementation', [guardianImplProxyInput, guardianImplInput, allowed], allowed ? 'Approve implementation proposal' : 'Revoke implementation proposal')
//     await loadGuardianChecks(guardianImplProxyInput, guardianImplInput)
//   }

//   const handleSubmitUpgradeProposal = async () => {
//     if (!ethers.isAddress(upgradeProxyInput) || !ethers.isAddress(upgradeImplementationInput)) {
//       alert('Enter valid proxy and implementation addresses')
//       return
//     }

//     const uupsIface = new ethers.Interface(['function upgradeToAndCall(address newImplementation,bytes data)'])
//     const data = uupsIface.encodeFunctionData('upgradeToAndCall', [upgradeImplementationInput, '0x'])
//     await submitRawProposal(upgradeProxyInput, data, 'Upgrade proposal')
//   }

//   const handleAddOwnerProposal = async () => {
//     if (!ethers.isAddress(addOwnerInput)) {
//       alert('Enter a valid new owner address')
//       return
//     }
//     await submitMultisigSelfProposal('addOwner', [addOwnerInput], 'Add owner proposal')
//     setAddOwnerInput('')
//   }

//   const handleRemoveOwnerProposal = async () => {
//     if (!ethers.isAddress(removeOwnerInput)) {
//       alert('Enter a valid owner address')
//       return
//     }
//     await submitMultisigSelfProposal('removeOwner', [removeOwnerInput], 'Remove owner proposal')
//     setRemoveOwnerInput('')
//   }

//   const handleReplaceOwnerProposal = async () => {
//     if (!ethers.isAddress(replaceOwnerOldInput) || !ethers.isAddress(replaceOwnerNewInput)) {
//       alert('Enter valid old and new owner addresses')
//       return
//     }
//     await submitMultisigSelfProposal('replaceOwner', [replaceOwnerOldInput, replaceOwnerNewInput], 'Replace owner proposal')
//     setReplaceOwnerOldInput('')
//     setReplaceOwnerNewInput('')
//   }

//   const handleChangeRequirementProposal = async () => {
//     const requirement = Number(changeRequirementInput)
//     if (!Number.isInteger(requirement) || requirement <= 0) {
//       alert('Enter a valid required confirmation count')
//       return
//     }
//     await submitMultisigSelfProposal('changeRequirement', [requirement], 'Change multisig requirement proposal')
//   }

//   const handleWalletInputChange = (index, value) => {
//     const updated = [...walletInputs]
//     updated[index] = value
//     setWalletInputs(updated)
//   }

//   const handleRatioInputChange = (index, value) => {
//     const updated = [...ratioInputs]
//     updated[index] = value
//     setRatioInputs(updated)
//   }

//   const fillFounderTestAddresses = () => {
//     setWalletInputs(generateRandomEthAddresses(8))
//     setRatioInputs(Array(8).fill('1250'))
//   }

//   const fillRepTestAddress = () => {
//     const [randomAddr] = generateRandomEthAddresses(1)
//     setRepAddress(randomAddr)
//   }

//   const fillChargeTestAddresses = () => {
//     const [randomNft, randomOps] = generateRandomEthAddresses(2)
//     setNftPool(randomNft)
//     setOpsWallet(randomOps)
//   }

//   const txStage = getStageFromTx(multisigTx)

//   // ============================================================
//   // RENDER HELPERS
//   // ============================================================
//   const getContentList = () => {
//     switch (activeContentTab) {
//       case 'announcements': return announcements
//       case 'events': return events
//       case 'socialLinks': return socialLinks
//       case 'resources': return resources
//       default: return []
//     }
//   }

//   const getContentFields = () => {
//     switch (activeContentTab) {
//       case 'announcements':
//         return [
//           { name: 'title', label: 'Title', type: 'text', required: true },
//           { name: 'content', label: 'Content', type: 'textarea', required: true },
//           { name: 'date', label: 'Date', type: 'text', placeholder: 'e.g., Jan 15, 2024', required: true },
//           { name: 'type', label: 'Type', type: 'select', options: ['info', 'success', 'warning'] },
//           { name: 'priority', label: 'Priority', type: 'number' },
//           { name: 'isActive', label: 'Active', type: 'checkbox' }
//         ]
//       case 'events':
//         return [
//           { name: 'title', label: 'Title', type: 'text', required: true },
//           { name: 'content', label: 'Description', type: 'textarea' },
//           { name: 'date', label: 'Date', type: 'text' },
//           { name: 'ctaUrl', label: 'CTA URL', type: 'text' },
//           { name: 'ctaLabel', label: 'CTA Label', type: 'text' },
//           { name: 'isActive', label: 'Active', type: 'checkbox' }
//         ]
//       case 'socialLinks':
//         return [
//           { name: 'platform', label: 'Platform', type: 'select', options: ['telegram', 'discord', 'x', 'instagram', 'facebook'] },
//           { name: 'href', label: 'URL', type: 'text', required: true },
//           { name: 'sortOrder', label: 'Sort Order', type: 'number' },
//           { name: 'isActive', label: 'Active', type: 'checkbox' }
//         ]
//       case 'resources':
//         return [
//           { name: 'key', label: 'Key', type: 'select', options: ['faq', 'tutorials', 'support', 'docs'] },
//           { name: 'label', label: 'Label', type: 'text', required: true },
//           { name: 'route', label: 'Route', type: 'text' },
//           { name: 'href', label: 'External URL', type: 'text' },
//           { name: 'sortOrder', label: 'Sort Order', type: 'number' },
//           { name: 'isActive', label: 'Active', type: 'checkbox' }
//         ]
//       default: return []
//     }
//   }

//   // ============================================================
//   // RENDER
//   // ============================================================
//   if (!isConnected) {
//     return (
//       <Container className="admin-shell-premium">
//         <style>{adminStyles}</style>
//         <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
//           <h4 className="text-glow" style={{ marginBottom: '16px' }}>Wallet Required</h4>
//           <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0' }}>Please connect your wallet using the "Connect Wallet" button in the top navigation bar to access the admin panel.</p>
//         </div>
//       </Container>
//     )
//   }

//   if (isLoading || !ownerCheckComplete) {
//     return (
//       <Container className="admin-shell-premium">
//         <style>{adminStyles}</style>
//         <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
//           <Spinner animation="grow" variant="info" />
//           <p className="mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Authorizing admin access...</p>
//         </div>
//       </Container>
//     )
//   }

//   if (error) {
//     return (
//       <Container className="admin-shell-premium">
//         <style>{adminStyles}</style>
//         <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
//           <h5 className="text-glow" style={{ marginBottom: '16px' }}>Error Loading Admin Panel</h5>
//           <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
//         </div>
//       </Container>
//     )
//   }

//   if (!isOwner) {
//     return (
//       <Container className="admin-shell-premium">
//         <style>{adminStyles}</style>
//         <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
//           <h5 className="text-glow" style={{ marginBottom: '16px' }}>Access Denied</h5>
//           <p style={{ color: 'rgba(255,255,255,0.6)' }}>This panel is available only to multisig owners.</p>
//         </div>
//       </Container>
//     )
//   }

//   return (
//     <Container fluid="xl" className="admin-shell-premium">
//       <style>{adminStyles}</style>

//       {/* Hero Header */}
//       <div className="admin-hero-premium">
//         <div>
//           <h1 className="admin-title-premium">Admin Panel</h1>
//           <div className="admin-subtitle">Production governance cockpit for multisig owners</div>
//         </div>
//         <div className="flex-between-premium" style={{ gap: '12px' }}>
//           <span className="admin-badge-premium"><Key size={14} /> {shortAddress(account)}</span>
//           <span className="admin-badge-premium"><Crown size={14} /> Multisig Owner</span>
//           <span className="admin-badge-premium"><BarChart3 size={14} /> {multisigStats.requiredConfirmations}/{ownerList.length || 5} Threshold</span>
//           <span className="admin-badge-premium"><Clock size={14} /> {formatCountdown(Number(multisigStats.timelockDelay || 0))}</span>
//         </div>
//       </div>

//       {/* Transaction Status */}
//       {txStatus.error && (
//         <Alert variant="danger" className="alert-premium" dismissible onClose={() => setErrorTx(null)}>
//           <div className="flex-between-premium" style={{ marginBottom: '4px' }}>
//             <strong><AlertTriangle size={14} /> Error:</strong>
//           </div>
//           {txStatus.error}
//         </Alert>
//       )}

//       {txStatus.hash && (
//         <Alert variant="info" className="alert-premium">
//           <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>TRANSACTION BROADCAST</div>
//           {txStatus.note && <div className="mb-2">{txStatus.note}</div>}
//           <a href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`} target="_blank" rel="noopener noreferrer" className="text-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
//             {txStatus.hash} <ExternalLink size={12} />
//           </a>
//         </Alert>
//       )}

//       {/* Governance Model & System Status */}
//       <Row className="g-3 mb-4">
//         <Col xl={4}>
//           <div className="admin-card-premium">
//             <div className="admin-header-premium">
//               <div className="header-title">Governance Model</div>
//             </div>
//             <div className="admin-body-premium">
//               <div className="guide-step-premium">
//                 <strong>1. Submit proposal</strong>
//                 <div className="admin-subtitle mt-1">Every admin change becomes a multisig transaction first.</div>
//               </div>
//               <div className="guide-step-premium">
//                 <strong>2. Owners approve</strong>
//                 <div className="admin-subtitle mt-1">You currently need {multisigStats.requiredConfirmations} multisig signatures.</div>
//               </div>
//               <div className="guide-step-premium">
//                 <strong>3. Timelock waits</strong>
//                 <div className="admin-subtitle mt-1">Execution stays blocked until the delay expires.</div>
//               </div>
//               <div className="guide-step-premium mb-0">
//                 <strong>4. Execute</strong>
//                 <div className="admin-subtitle mt-1">Any owner can execute once approvals and timelock are satisfied.</div>
//               </div>
//             </div>
//           </div>
//         </Col>

//         <Col xl={8}>
//           <div className="admin-card-premium">
//             <div className="admin-header-premium">
//               <div className="header-title">System Status</div>
//             </div>
//             <div className="admin-body-premium">
//               <Row className="g-2">
//                 <Col md={6} xl={3}>
//                   <div className="metric-box-premium">
//                     <div className="metric-label-premium">LevelManager paused</div>
//                     <div className="metric-value-premium">
//                       <span className={`premium-badge ${systemState.levelManagerPaused ? 'premium-badge-danger' : 'premium-badge-success'}`}>
//                         {boolText(systemState.levelManagerPaused)}
//                       </span>
//                     </div>
//                   </div>
//                 </Col>
//                 <Col md={6} xl={3}>
//                   <div className="metric-box-premium">
//                     <div className="metric-label-premium">Guardian paused</div>
//                     <div className="metric-value-premium">
//                       <span className={`premium-badge ${guardianState.paused ? 'premium-badge-danger' : 'premium-badge-success'}`}>
//                         {boolText(guardianState.paused)}
//                       </span>
//                     </div>
//                   </div>
//                 </Col>
//                 <Col md={6} xl={3}>
//                   <div className="metric-box-premium">
//                     <div className="metric-label-premium">Global upgrade freeze</div>
//                     <div className="metric-value-premium">
//                       <span className={`premium-badge ${guardianState.globalUpgradeFreeze ? 'premium-badge-danger' : 'premium-badge-success'}`}>
//                         {boolText(guardianState.globalUpgradeFreeze)}
//                       </span>
//                     </div>
//                   </div>
//                 </Col>
//                 <Col md={6} xl={3}>
//                   <div className="metric-box-premium">
//                     <div className="metric-label-premium">Current chain time</div>
//                     <div className="metric-value-premium mono">{formatUnix(multisigStats.currentTimestamp)}</div>
//                   </div>
//                 </Col>
//               </Row>
//             </div>
//           </div>
//         </Col>
//       </Row>

//       {/* Quick Governance Actions */}
//       <Row className="g-3 mb-4">
//         <Col xl={12}>
//           <div className="admin-card-premium">
//             <div className="admin-header-premium">
//               <div className="header-title">Quick Governance Actions</div>
//             </div>
//             <div className="admin-body-premium">
//               <div className="admin-subtitle mb-3">These actions submit proposals only. They do not change live contracts immediately.</div>
//               <div className="grid-3-premium">
//                 <div className="action-card-premium">
//                   <div className="small-label-premium">Emergency controls</div>
//                   <div className="admin-subtitle mb-3">Pause or unpause the LevelManager via multisig.</div>
//                   <div className="flex-between-premium" style={{ gap: '8px' }}>
//                     <button className="btn-premium btn-premium-sm" onClick={handleSubmitPauseProposal} disabled={txStatus.loading}>Submit pause</button>
//                     <button className="btn-premium btn-premium-sm" onClick={handleSubmitUnpauseProposal} disabled={txStatus.loading}>Submit unpause</button>
//                   </div>
//                 </div>

//                 <div className="action-card-premium">
//                   <div className="small-label-premium">Guardian controls</div>
//                   <div className="admin-subtitle mb-3">Freeze upgrades or pause guardian admin actions.</div>
//                   <div className="flex-between-premium" style={{ flexWrap: 'wrap', gap: '8px' }}>
//                     <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianFreeze(true)} disabled={txStatus.loading}>Freeze upgrades</button>
//                     <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianFreeze(false)} disabled={txStatus.loading}>Unfreeze upgrades</button>
//                     <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianPauseAdmin(true)} disabled={txStatus.loading}>Pause guardian</button>
//                     <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianPauseAdmin(false)} disabled={txStatus.loading}>Unpause guardian</button>
//                   </div>
//                 </div>

//                 <div className="action-card-premium">
//                   <div className="small-label-premium">Queue refresh</div>
//                   <div className="admin-subtitle mb-3">Reload multisig queue, chain time, approvals, and system states.</div>
//                   <button className="btn-premium w-100" onClick={refreshGovernanceData} disabled={txStatus.loading}>
//                     <RefreshCw size={14} /> Refresh cockpit
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </Col>
//       </Row>

//       {/* Recent Transactions & Selected Transaction */}
//       <Row className="g-3 mb-4">
//         <Col xl={7}>
//           <div className="admin-card-premium">
//             <div className="admin-header-premium">
//               <div className="header-title">Recent Multisig Transactions</div>
//             </div>
//             <div className="admin-body-premium">
//               <div className="admin-subtitle mb-3">Every proposal appears here with status, votes, countdown, and quick actions.</div>
//               <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
//                 <table className="premium-table">
//                   <thead>
//                     <tr>
//                       <th>ID</th>
//                       <th>Action</th>
//                       <th>Category</th>
//                       <th>Stage</th>
//                       <th>Votes</th>
//                       <th>Timelock</th>
//                       <th>Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {recentTxs.length === 0 && (
//                       <tr><td colSpan={7} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No transactions found.</td></tr>
//                     )}
//                     {recentTxs.map((tx) => {
//                       const stage = getStageFromTx(tx)
//                       const secs = Math.max(Number(tx.executeAfter || 0) - Number(multisigStats.currentTimestamp || 0), 0)
//                       const currentOwnerApproval = tx.approvals?.find((a) => a.owner.toLowerCase() === account?.toLowerCase())
//                       return (
//                         <tr key={tx.txId} className="tx-row-premium">
//                           <td className="fw-bold text-glow">{tx.txId}</td>
//                           <td>
//                             <div className="fw-bold">{tx.label}</div>
//                             <div className="admin-subtitle">{tx.details}</div>
//                           </td>
//                           <td><span className="premium-badge premium-badge-dark">{tx.category}</span></td>
//                           <td><span className={`premium-badge premium-badge-${stage.variant === 'success' ? 'success' : stage.variant === 'warning' ? 'warning' : stage.variant === 'info' ? 'info' : 'dark'}`}>{stage.label}</span></td>
//                           <td>{tx.confirmations} / {multisigStats.requiredConfirmations}</td>
//                           <td>{tx.executed ? 'Completed' : formatCountdown(secs)}</td>
//                           <td>
//                             <div className="flex-between-premium" style={{ gap: '6px', flexWrap: 'wrap' }}>
//                               <button className="btn-premium btn-premium-sm" onClick={() => loadMultisigTx(tx.txId)}>View</button>
//                               <button className="btn-premium btn-premium-sm" onClick={() => handleApproveTx(tx.txId)} disabled={tx.executed || currentOwnerApproval?.approved}>Approve</button>
//                               <button className="btn-premium btn-premium-sm" onClick={() => handleRevokeTx(tx.txId)} disabled={tx.executed || !currentOwnerApproval?.approved}>Revoke</button>
//                               <button className="btn-premium btn-premium-sm" onClick={() => handleExecuteTx(tx.txId)} disabled={tx.executed || stage.label !== 'Ready to execute'}>Execute</button>
//                             </div>
//                           </td>
//                         </tr>
//                       )
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </div>
//         </Col>

//         <Col xl={5}>
//           <div className="admin-card-premium">
//             <div className="admin-header-premium">
//               <div className="header-title">Selected Transaction Details</div>
//             </div>
//             <div className="admin-body-premium">
//               <div className="admin-subtitle mb-3">Load any transaction to inspect action, approvals, target, timelock, and upgrade/guardian checks.</div>

//               <Row className="g-2 align-items-end mb-3">
//                 <Col md={6}>
//                   <Form.Label className="small-label-premium">Transaction ID</Form.Label>
//                   <Form.Control
//                     className="input-premium"
//                     type="number"
//                     value={txIdInput}
//                     onChange={(e) => setTxIdInput(e.target.value)}
//                     placeholder="e.g. 0"
//                   />
//                 </Col>
//                 <Col md={6}>
//                   <div className="flex-between-premium" style={{ gap: '6px' }}>
//                     <button className="btn-premium btn-premium-sm" onClick={() => loadMultisigTx()}>Load</button>
//                     <button className="btn-premium btn-premium-sm" onClick={() => handleApproveTx()} disabled={!txIdInput}>Approve</button>
//                     <button className="btn-premium btn-premium-sm" onClick={() => handleRevokeTx()} disabled={!txIdInput}>Revoke</button>
//                     <button className="btn-premium btn-premium-sm" onClick={() => handleExecuteTx()} disabled={!txIdInput}>Execute</button>
//                   </div>
//                 </Col>
//               </Row>

//               {!multisigTx && (
//                 <div className="soft-panel-premium" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
//                   No transaction selected yet.
//                 </div>
//               )}

//               {multisigTx && (
//                 <>
//                   <Row className="g-2 mb-3">
//                     <Col md={6}>
//                       <div className="metric-box-premium">
//                         <div className="metric-label-premium">Stage</div>
//                         <div className="metric-value-premium">
//                           <span className={`premium-badge premium-badge-${txStage.variant === 'success' ? 'success' : txStage.variant === 'warning' ? 'warning' : txStage.variant === 'info' ? 'info' : 'dark'}`}>{txStage.label}</span>
//                         </div>
//                       </div>
//                     </Col>
//                     <Col md={6}>
//                       <div className="metric-box-premium">
//                         <div className="metric-label-premium">Timelock remaining</div>
//                         <div className="metric-value-premium">{formatCountdown(remainingSeconds)}</div>
//                       </div>
//                     </Col>
//                   </Row>

//                   <div className="mb-3">
//                     <div className="small-label-premium mb-2">Approval progress</div>
//                     <div className="premium-progress">
//                       <div className="premium-progress-fill" style={{ width: `${approvalPercent}%` }} />
//                     </div>
//                     <div className="admin-subtitle mt-1">{Math.round(approvalPercent)}%</div>
//                   </div>

//                   <div className="table-responsive mb-3">
//                     <table className="premium-table">
//                       <tbody>
//                         <tr><th style={{ width: '40%' }}>Transaction ID</th><td>{multisigTx.txId}</td></tr>
//                         <tr><th>Action</th><td>{multisigTx.label}</td></tr>
//                         <tr><th>Details</th><td>{multisigTx.details}</td></tr>
//                         <tr><th>Category</th><td>{multisigTx.category}</td></tr>
//                         <tr><th>Target label</th><td>{multisigTx.targetLabel}</td></tr>
//                         <tr><th>Target address</th><td className="mono">{multisigTx.to}</td></tr>
//                         <tr><th>Confirmations</th><td>{multisigTx.confirmations} / {multisigStats.requiredConfirmations}</td></tr>
//                         <tr><th>Executed</th><td>{String(multisigTx.executed)}</td></tr>
//                         <tr><th>Submitted at</th><td>{formatUnix(multisigTx.submittedAt)}</td></tr>
//                         <tr><th>Execute after</th><td>{formatUnix(multisigTx.executeAfter)}</td></tr>
//                         <tr><th>Current chain time</th><td>{formatUnix(multisigStats.currentTimestamp)}</td></tr>
//                         <tr><th>Native value</th><td>{multisigTx.value}</td></tr>
//                         <tr><th>Calldata</th><td className="mono" style={{ wordBreak: 'break-all', maxWidth: '300px' }}>{multisigTx.data}</td></tr>
//                       </tbody>
//                     </table>
//                   </div>

//                   {(multisigTx.implementationAddress || multisigTx.proxyAddress) && (
//                     <div className="soft-panel-premium mb-3">
//                       <div className="small-label-premium mb-2">Upgrade / guardian checks</div>
//                       <div>Proxy approved: <span className={`premium-badge ${guardianChecks.proxyApproved ? 'premium-badge-success' : 'premium-badge-danger'}`}>{guardianChecks.proxyApproved === null ? 'Unknown' : boolText(guardianChecks.proxyApproved)}</span></div>
//                       <div className="mt-2">Implementation approved: <span className={`premium-badge ${guardianChecks.implementationApproved ? 'premium-badge-success' : 'premium-badge-danger'}`}>{guardianChecks.implementationApproved === null ? 'Unknown' : boolText(guardianChecks.implementationApproved)}</span></div>
//                     </div>
//                   )}

//                   <div>
//                     <div className="small-label-premium mb-2">Who approved?</div>
//                     <div>
//                       {selectedTxApprovals.map((item) => (
//                         <span key={item.owner} className="owner-sign-pill-premium">
//                           <span className="mono">{shortAddress(item.owner)}</span>
//                           <span className={`premium-badge ${item.approved ? 'premium-badge-success' : 'premium-badge-dark'}`}>
//                             {item.approved ? 'Signed' : 'Pending'}
//                           </span>
//                         </span>
//                       ))}
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </Col>
//       </Row>

//       {/* Governance Operations Accordion */}
//       <Row className="g-3 mb-4">
//         <Col xl={12}>
//           <div className="admin-card-premium">
//             <div className="admin-header-premium">
//               <div className="header-title">Governance Operations</div>
//             </div>
//             <div className="admin-body-premium">
//               <Accordion defaultActiveKey={['0']} alwaysOpen className="premium-accordion">
                
//                 {/* Founder wallets and representatives */}
//                 <Accordion.Item eventKey="0">
//                   <Accordion.Header>Founder wallets and representatives</Accordion.Header>
//                   <Accordion.Body>
//                     <Row className="g-3">
//                       <Col xl={6}>
//                         <div className="admin-subtitle mb-3">This creates a multisig proposal to update all 8 founder wallets and their ratios.</div>
//                         <div className="soft-panel-premium mb-3">
//                           <div className="small-label-premium mb-2">Current founder distribution</div>
//                           <div className="table-responsive">
//                             <table className="premium-table mb-0">
//                               <thead>
//                                 <tr><th>Wallet Address</th><th>Weight</th></tr>
//                               </thead>
//                               <tbody>
//                                 {founderWallets.map((wallet, index) => (
//                                   <tr key={index}>
//                                     <td className="mono">{wallet.slice(0, 10)}...{wallet.slice(-8)}</td>
//                                     <td>{(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%</td>
//                                   </tr>
//                                 ))}
//                                 {founderWallets.length === 0 && (
//                                   <tr><td colSpan={2} style={{ color: 'rgba(255,255,255,0.4)' }}>No founder wallets configured yet.</td></tr>
//                                 )}
//                               </tbody>
//                             </table>
//                           </div>
//                         </div>

//                         <div className="small-label-premium mb-2">Set All Founder Wallets</div>
//                         <button className="btn-premium btn-premium-sm mb-3" onClick={fillFounderTestAddresses} disabled={txStatus.loading}>Fill Test Addresses</button>

//                         {walletInputs.map((wallet, index) => (
//                           <div key={index} className="wallet-grid-premium mb-2">
//                             <Form.Control className="input-premium" type="text" placeholder={`Founder ${index + 1} Address`} value={wallet} onChange={(e) => handleWalletInputChange(index, e.target.value)} disabled={txStatus.loading} />
//                             <Form.Control className="input-premium" type="number" placeholder="Ratio" value={ratioInputs[index]} onChange={(e) => handleRatioInputChange(index, e.target.value)} disabled={txStatus.loading} />
//                           </div>
//                         ))}

//                         <div className="flex-between-premium mt-3">
//                           <span className={totalRatio === 10000 ? 'text-glow' : 'text-danger'}>Total Ratio: {totalRatio} / 10000</span>
//                           <button className="btn-premium" onClick={handleSetFounderWallets} disabled={txStatus.loading}>Submit founder wallet proposal</button>
//                         </div>
//                       </Col>

//                       <Col xl={6}>
//                         <div className="action-card-premium mb-3">
//                           <div className="small-label-premium">Founder representative proposal</div>
//                           <div className="admin-subtitle mb-3">Submit a multisig proposal to add a founder representative.</div>
//                           <div className="flex-between-premium mb-3" style={{ gap: '8px' }}>
//                             <Form.Control className="input-premium" placeholder="Representative address (0x...)" value={repAddress} onChange={(e) => setRepAddress(e.target.value)} />
//                             <button className="btn-premium btn-premium-sm" onClick={fillRepTestAddress} disabled={txStatus.loading}>Fill Test</button>
//                           </div>
//                           <button className="btn-premium w-100" onClick={handleAddFounderRep} disabled={txStatus.loading || !repAddress}>Submit representative proposal</button>
//                         </div>

//                         <div className="action-card-premium">
//                           <div className="small-label-premium">Charge routing proposal</div>
//                           <div className="admin-subtitle mb-3">Submit a proposal to update NFT pool and operations wallet routing.</div>
//                           <div className="flex-between-premium mb-3" style={{ gap: '8px' }}>
//                             <Form.Control className="input-premium" placeholder="NFT Pool Address" value={nftPool} onChange={(e) => setNftPool(e.target.value)} />
//                             <button className="btn-premium btn-premium-sm" onClick={fillChargeTestAddresses} disabled={txStatus.loading}>Fill Both</button>
//                           </div>
//                           <Form.Control className="input-premium mb-3" placeholder="Operations Wallet Address" value={opsWallet} onChange={(e) => setOpsWallet(e.target.value)} />
//                           <button className="btn-premium w-100" onClick={handleUpdateChargeRecipients} disabled={txStatus.loading}>Submit charge routing proposal</button>
//                         </div>
//                       </Col>
//                     </Row>
//                   </Accordion.Body>
//                 </Accordion.Item>

//                 {/* Guardian approvals and upgrade flow */}
//                 <Accordion.Item eventKey="1">
//                   <Accordion.Header>Guardian approvals and upgrade flow</Accordion.Header>
//                   <Accordion.Body>
//                     <Row className="g-3">
//                       <Col xl={4}>
//                         <div className="action-card-premium">
//                           <div className="small-label-premium">Approve proxy</div>
//                           <div className="admin-subtitle mb-3">Allow or revoke a proxy address in Guardian.</div>
//                           <Form.Control className="input-premium mb-3" placeholder="Proxy address" value={guardianProxyInput} onChange={(e) => setGuardianProxyInput(e.target.value)} />
//                           <div className="flex-between-premium" style={{ gap: '8px' }}>
//                             <button className="btn-premium w-100" onClick={() => handleGuardianApproveProxy(true)} disabled={txStatus.loading}>Approve proxy</button>
//                             <button className="btn-premium w-100" onClick={() => handleGuardianApproveProxy(false)} disabled={txStatus.loading}>Revoke proxy</button>
//                           </div>
//                         </div>
//                       </Col>
//                       <Col xl={4}>
//                         <div className="action-card-premium">
//                           <div className="small-label-premium">Approve implementation</div>
//                           <div className="admin-subtitle mb-3">Allow or revoke an implementation for a specific proxy.</div>
//                           <Form.Control className="input-premium mb-2" placeholder="Proxy address" value={guardianImplProxyInput} onChange={(e) => setGuardianImplProxyInput(e.target.value)} />
//                           <Form.Control className="input-premium mb-3" placeholder="Implementation address" value={guardianImplInput} onChange={(e) => setGuardianImplInput(e.target.value)} />
//                           <div className="flex-between-premium" style={{ gap: '8px' }}>
//                             <button className="btn-premium w-100" onClick={() => handleGuardianApproveImplementation(true)} disabled={txStatus.loading}>Approve impl</button>
//                             <button className="btn-premium w-100" onClick={() => handleGuardianApproveImplementation(false)} disabled={txStatus.loading}>Revoke impl</button>
//                           </div>
//                         </div>
//                       </Col>
//                       <Col xl={4}>
//                         <div className="action-card-premium">
//                           <div className="small-label-premium">Submit upgrade proposal</div>
//                           <div className="admin-subtitle mb-3">Create the multisig upgrade transaction for a proxy after implementation approval.</div>
//                           <Form.Control className="input-premium mb-2" placeholder="Proxy address" value={upgradeProxyInput} onChange={(e) => setUpgradeProxyInput(e.target.value)} />
//                           <Form.Control className="input-premium mb-3" placeholder="New implementation address" value={upgradeImplementationInput} onChange={(e) => setUpgradeImplementationInput(e.target.value)} />
//                           <button className="btn-premium w-100" onClick={handleSubmitUpgradeProposal} disabled={txStatus.loading}>Submit upgrade proposal</button>
//                         </div>
//                       </Col>
//                     </Row>
//                   </Accordion.Body>
//                 </Accordion.Item>

//                 {/* Multisig owner management */}
//                 <Accordion.Item eventKey="2">
//                   <Accordion.Header>Multisig owner management</Accordion.Header>
//                   <Accordion.Body>
//                     <Row className="g-3">
//                       <Col xl={3}>
//                         <div className="action-card-premium">
//                           <div className="small-label-premium">Add owner</div>
//                           <Form.Control className="input-premium mb-3" placeholder="New owner address" value={addOwnerInput} onChange={(e) => setAddOwnerInput(e.target.value)} />
//                           <button className="btn-premium w-100" onClick={handleAddOwnerProposal} disabled={txStatus.loading}>Submit add owner</button>
//                         </div>
//                       </Col>
//                       <Col xl={3}>
//                         <div className="action-card-premium">
//                           <div className="small-label-premium">Remove owner</div>
//                           <Form.Control className="input-premium mb-3" placeholder="Owner address" value={removeOwnerInput} onChange={(e) => setRemoveOwnerInput(e.target.value)} />
//                           <button className="btn-premium w-100" onClick={handleRemoveOwnerProposal} disabled={txStatus.loading}>Submit remove owner</button>
//                         </div>
//                       </Col>
//                       <Col xl={3}>
//                         <div className="action-card-premium">
//                           <div className="small-label-premium">Replace owner</div>
//                           <Form.Control className="input-premium mb-2" placeholder="Old owner" value={replaceOwnerOldInput} onChange={(e) => setReplaceOwnerOldInput(e.target.value)} />
//                           <Form.Control className="input-premium mb-3" placeholder="New owner" value={replaceOwnerNewInput} onChange={(e) => setReplaceOwnerNewInput(e.target.value)} />
//                           <button className="btn-premium w-100" onClick={handleReplaceOwnerProposal} disabled={txStatus.loading}>Submit replace owner</button>
//                         </div>
//                       </Col>
//                       <Col xl={3}>
//                         <div className="action-card-premium">
//                           <div className="small-label-premium">Change requirement</div>
//                           <Form.Control className="input-premium mb-3" type="number" placeholder="Required confirmations" value={changeRequirementInput} onChange={(e) => setChangeRequirementInput(e.target.value)} />
//                           <button className="btn-premium w-100" onClick={handleChangeRequirementProposal} disabled={txStatus.loading}>Submit requirement change</button>
//                         </div>
//                       </Col>
//                     </Row>

//                     <div className="soft-panel-premium mt-3">
//                       <div className="small-label-premium mb-2">Current multisig owners</div>
//                       <div>
//                         {ownerList.map((owner) => (
//                           <span key={owner} className="owner-sign-pill-premium">
//                             <span className="mono">{shortAddress(owner)}</span>
//                             <span className="premium-badge premium-badge-info">Owner</span>
//                           </span>
//                         ))}
//                       </div>
//                     </div>
//                   </Accordion.Body>
//                 </Accordion.Item>

//                 {/* NEW: Community Content Management */}
//                 <Accordion.Item eventKey="3">
//                   <Accordion.Header>
//                     <Globe size={14} style={{ marginRight: '8px' }} />
//                     Community Content Management
//                   </Accordion.Header>
//                   <Accordion.Body>
//                     <div className="content-tabs-premium">
//                       <button className={`content-tab-premium ${activeContentTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveContentTab('announcements')}>
//                         <Megaphone size={12} /> Announcements
//                       </button>
//                       <button className={`content-tab-premium ${activeContentTab === 'events' ? 'active' : ''}`} onClick={() => setActiveContentTab('events')}>
//                         <Calendar size={12} /> Events
//                       </button>
//                       <button className={`content-tab-premium ${activeContentTab === 'socialLinks' ? 'active' : ''}`} onClick={() => setActiveContentTab('socialLinks')}>
//                         <Link2 size={12} /> Social Links
//                       </button>
//                       <button className={`content-tab-premium ${activeContentTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveContentTab('resources')}>
//                         <FileText size={12} /> Resources
//                       </button>
//                     </div>

//                     <div className="flex-between-premium mb-3">
//                       <div className="admin-subtitle">
//                         {contentLoading ? 'Loading...' : `${getContentList().length} items`}
//                       </div>
//                       <button className="btn-premium btn-premium-sm" onClick={openCreateModal}>
//                         <Plus size={12} /> Create New
//                       </button>
//                     </div>

//                     <div className="table-responsive">
//                       <table className="premium-table">
//                         <thead>
//                           <tr>
//                             <th>Title/Label</th>
//                             <th>Status</th>
//                             <th>Actions</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {contentLoading ? (
//                             <tr><td colSpan={3} style={{ textAlign: 'center' }}><Spinner size="sm" /></td></tr>
//                           ) : getContentList().length === 0 ? (
//                             <tr><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No items found.</td></tr>
//                           ) : (
//                             getContentList().map((item) => (
//                               <tr key={item._id}>
//                                 <td>
//                                   <div className="fw-bold">{item.title || item.label || item.platform || item.key}</div>
//                                   <div className="admin-subtitle">{item.content?.slice(0, 30) || item.href || item.route}</div>
//                                 </td>
//                                 <td>
//                                   <span className={`premium-badge ${item.isActive ? 'premium-badge-success' : 'premium-badge-dark'}`}>
//                                     {item.isActive ? <Eye size={10} /> : <EyeOff size={10} />} {item.isActive ? 'Active' : 'Inactive'}
//                                   </span>
//                                 </td>
//                                 <td>
//                                   <div style={{ display: 'flex', gap: '6px' }}>
//                                     <button className="btn-premium btn-premium-sm btn-premium-icon" onClick={() => openEditModal(item)}>
//                                       <Edit size={12} />
//                                     </button>
//                                     <button className="btn-premium btn-premium-sm btn-premium-icon btn-premium-danger" onClick={() => handleDeleteContent(item._id)}>
//                                       <Trash2 size={12} />
//                                     </button>
//                                   </div>
//                                 </td>
//                               </tr>
//                             ))
//                           )}
//                         </tbody>
//                       </table>
//                     </div>
//                   </Accordion.Body>
//                 </Accordion.Item>

//                 {/* NEW: Founder Vault Distribution Viewer */}
//                 <Accordion.Item eventKey="4">
//                   <Accordion.Header>
//                     <Users size={14} style={{ marginRight: '8px' }} />
//                     Founder Vault Distribution
//                   </Accordion.Header>
//                   <Accordion.Body>
//                     <div className="flex-between-premium mb-3">
//                       <div>
//                         <div className="small-label-premium">ID1 Wallet</div>
//                         <div className="mono" style={{ fontSize: '12px' }}>{shortAddress(id1Wallet)}</div>
//                       </div>
//                       <div>
//                         <span className={`premium-badge ${isID1Downline ? 'premium-badge-success' : 'premium-badge-warning'}`}>
//                           {isID1Downline ? <Check size={10} /> : <X size={10} />} {isID1Downline ? 'Downline Synced' : 'Non-ID1 Node'}
//                         </span>
//                       </div>
//                       <button className="btn-premium btn-premium-sm" onClick={fetchFounderBalances} disabled={founderRefreshing}>
//                         <RefreshCw size={12} className={founderRefreshing ? 'spin' : ''} /> Refresh
//                       </button>
//                     </div>

//                     <div className="founder-summary-card">
//                       <Row>
//                         <Col md={6}>
//                           <div className="small-label-premium">Total Tracked Balance</div>
//                           <div className="metric-value-premium" style={{ fontSize: '20px' }}>{totalFounderBalance} USDT</div>
//                         </Col>
//                         <Col md={6}>
//                           <div className="small-label-premium">Distribution Rule</div>
//                           <div className="admin-subtitle">Ratios determine founder payout splits</div>
//                         </Col>
//                       </Row>
//                     </div>

//                     <div className="table-responsive">
//                       <table className="premium-table">
//                         <thead>
//                           <tr>
//                             <th>Wallet Address</th>
//                             <th>Ratio</th>
//                             <th>USDT Balance</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {founderWallets.length === 0 ? (
//                             <tr><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No founder wallets configured.</td></tr>
//                           ) : (
//                             founderWallets.map((wallet, index) => (
//                               <tr key={index}>
//                                 <td>
//                                   <a href={`https://amoy.polygonscan.com/address/${wallet}`} target="_blank" rel="noopener noreferrer" className="text-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
//                                     <span className="mono">{wallet.slice(0, 10)}...{wallet.slice(-8)}</span>
//                                     <ExternalLink size={10} />
//                                   </a>
//                                 </td>
//                                 <td>
//                                   <span className="premium-badge premium-badge-info">
//                                     {(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%
//                                   </span>
//                                 </td>
//                                 <td className="fw-bold text-glow">{walletBalances[wallet] || '0.00'} USDT</td>
//                               </tr>
//                             ))
//                           )}
//                         </tbody>
//                       </table>
//                     </div>
//                   </Accordion.Body>
//                 </Accordion.Item>

//               </Accordion>
//             </div>
//           </div>
//         </Col>
//       </Row>

//       {/* Content Modal */}
//       <Modal show={showContentModal} onHide={() => setShowContentModal(false)} centered className="premium-modal">
//         <Modal.Header closeButton style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
//           <Modal.Title style={{ color: 'var(--glow-teal)' }}>
//             {editingItem ? 'Edit' : 'Create'} {activeContentTab.slice(0, -1)}
//           </Modal.Title>
//         </Modal.Header>
//         <Modal.Body style={{ background: 'rgba(0,0,0,0.4)', padding: '20px' }}>
//           {getContentFields().map((field) => (
//             <Form.Group key={field.name} className="mb-3">
//               <Form.Label className="small-label-premium">{field.label}</Form.Label>
//               {field.type === 'textarea' ? (
//                 <Form.Control
//                   as="textarea"
//                   rows={3}
//                   className="input-premium"
//                   value={formData[field.name] || ''}
//                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
//                   required={field.required}
//                 />
//               ) : field.type === 'select' ? (
//                 <Form.Select
//                   className="input-premium"
//                   value={formData[field.name] || ''}
//                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
//                 >
//                   <option value="">Select...</option>
//                   {field.options.map((opt) => (
//                     <option key={opt} value={opt}>{opt}</option>
//                   ))}
//                 </Form.Select>
//               ) : field.type === 'checkbox' ? (
//                 <Form.Check
//                   type="checkbox"
//                   label="Active"
//                   checked={formData[field.name] || false}
//                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
//                   style={{ color: 'white' }}
//                 />
//               ) : (
//                 <Form.Control
//                   type={field.type}
//                   className="input-premium"
//                   value={formData[field.name] || ''}
//                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
//                   required={field.required}
//                 />
//               )}
//             </Form.Group>
//           ))}
//         </Modal.Body>
//         <Modal.Footer style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
//           <button className="btn-premium-secondary" onClick={() => setShowContentModal(false)}>Cancel</button>
//           <button className="btn-premium" onClick={editingItem ? handleUpdateContent : handleCreateContent}>
//             {editingItem ? 'Update' : 'Create'}
//           </button>
//         </Modal.Footer>
//       </Modal>

//       <style>{`
//         @keyframes spin {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
//         .spin {
//           animation: spin 1s linear infinite;
//         }
//         .premium-modal .modal-content {
//           background: transparent;
//           border: 1px solid rgba(255,255,255,0.1);
//           border-radius: 20px;
//           overflow: hidden;
//         }

//         /* Add to adminStyles */
//           .admin-shell-premium {
//             padding: 20px;
//             max-width: 1400px;
//             margin: 0 auto;
//             min-height: calc(100vh - 80px);
//             will-change: transform; /* Hardware acceleration */
//             transform: translateZ(0);
//           }

//           .glass-panel-premium,
//           .admin-card-premium,
//           .admin-hero-premium {
//             /* Reduce backdrop-filter intensity */
//             backdrop-filter: blur(8px);
//             -webkit-backdrop-filter: blur(8px);
//           }

//           /* Disable heavy animations on scroll */
//           @media (prefers-reduced-motion: reduce) {
//             *,
//             *::before,
//             *::after {
//               animation-duration: 0.01ms !important;
//               animation-iteration-count: 1 !important;
//               transition-duration: 0.01ms !important;
//             }
//           }

//           /* Optimize table rendering */
//           .premium-table {
//             will-change: transform;
//             transform: translateZ(0);
//           }

//           .table-responsive {
//             -webkit-overflow-scrolling: touch;
//           }

//           .input-premium {
//             width: 100%;
//             padding: 10px 14px;
//             background: rgba(255, 255, 255, 0.12) !important; /* Darker background */
//             border: 1px solid rgba(255, 255, 255, 0.2) !important;
//             border-radius: 12px;
//             color: #ffffff !important; /* Pure white text */
//             font-family: monospace;
//             font-size: 13px;
//             transition: all 0.2s;
//             caret-color: var(--glow-teal); /* Visible cursor */
//           }

//           .input-premium:focus {
//             outline: none;
//             border-color: var(--glow-teal) !important;
//             background: rgba(255, 255, 255, 0.18) !important;
//             color: #ffffff !important;
//           }

//           .input-premium::placeholder {
//             color: rgba(255, 255, 255, 0.5) !important;
//           }

//           /* Fix for form controls */
//           .form-control.input-premium,
//           textarea.input-premium,
//           select.input-premium {
//             background: rgba(255, 255, 255, 0.12) !important;
//             color: #ffffff !important;
//           }
//       `}</style>
//     </Container>
//   )
// }

// export default AdminPanel