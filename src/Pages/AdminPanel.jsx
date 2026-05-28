import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { Container, Row, Col, Form, Button, Alert, Spinner, Table, Accordion, Badge, Modal } from 'react-bootstrap';
import { useWallet } from '../hooks/useWallet';
import { useContracts } from '../hooks/useContracts';
import { web3Service } from '../Services/web3';
import { ethers } from 'ethers';
import { useTranslation } from 'react-i18next';
import { getApiUrl } from '../Services/apiConfig';
import { NETWORK_CONFIG } from '../constants/addresses';
import { useToast } from '../components/feedback';
import { normalizeError } from '../utils/errorMap';
import './AdminPanel.css';
import {
  Key, Crown, BarChart3, Clock, AlertTriangle, Plus, Edit, Trash2,
  Eye, EyeOff, RefreshCw, Globe, Users, Calendar, Link2, FileText,
  Megaphone, ExternalLink, X, Check, Wallet,
  ShieldCheck, LayoutDashboard, Settings, Activity } from
'lucide-react';

// ============================================================
// CONSTANTS & INTERFACES'
// ============================================================
const ADMIN_API_HEADER = 'x-admin-key';
const ADMIN_SESSION_KEY = 'ffn_admin_api_key_session';
const HIDDEN_MULTISIG_TXS_KEY = 'ffn_hidden_multisig_txs';
const MULTISIG_RECENT_WINDOW_SECONDS = 7 * 24 * 60 * 60;
const GAS_BUFFER_BPS = 12000n;
const GAS_BUFFER_DENOMINATOR = 10000n;

const withGasBuffer = (estimate) => {
  try {
    return (BigInt(estimate) * GAS_BUFFER_BPS) / GAS_BUFFER_DENOMINATOR;
  } catch {
    return estimate;
  }
};

const getRuntimeAdminKey = () => {
  if (typeof window === 'undefined') return '';

  const cached = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (cached) return cached;

  const entered = window.prompt('Enter admin API key for this session');
  if (entered) {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, entered);
    return entered;
  }

  return '';
};

const clearRuntimeAdminKey = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

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
'function upgradeTo(address newImplementation)']
);

const guardianIface = new ethers.Interface([
'function setApprovedProxy(address proxy,bool allowed)',
'function setApprovedImplementation(address proxy,address implementation,bool allowed)',
'function batchSetApprovedImplementations(address proxy,address[] implementations,bool allowed)',
'function setGlobalUpgradeFreeze(bool frozen)',
'function pause()',
'function unpause()']
);

const multisigSelfIface = new ethers.Interface([
'function addOwner(address owner)',
'function removeOwner(address owner)',
'function replaceOwner(address oldOwner,address newOwner)',
'function changeRequirement(uint256 _requiredConfirmations)']
);

const operationsVaultIface = new ethers.Interface([
'function disburse(address recipient,uint256 amount,string reason)']
);

const nftPoolVaultIface = new ethers.Interface([
'function setDistributionRoot(bytes32 distributionId,bytes32 merkleRoot,string metadataURI,string reason)',
'function distribute(address recipient,uint256 amount,bytes32 distributionId,string reason)']
);

const boolText = (v) => v ? 'Yes' : 'No';
const readHiddenMultisigTxs = () => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HIDDEN_MULTISIG_TXS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const emptyFinancialTruth = {
  totalGeneratedVolume: '0.00',
  systemChargeTotal: '0.00',
  nftRewardPool: {
    totalInflow: '0.00',
    totalDistributed: '0.00',
    currentBalance: '0.00'
  },
  devOperations: {
    totalInflow: '0.00',
    totalUtilized: '0.00',
    currentBalance: '0.00'
  }
};

const unwrapCommunitySummary = (payload = {}) => {
  const data = payload?.data || payload || {};
  return data.public || payload.public || data || {};
};

const buildAdminFinancialTruth = (publicData = {}) => {
  const totalGeneratedVolume =
    publicData.generatedGross ??
    publicData.totalGeneratedVolume ??
    publicData.totalGross ??
    '0.00';

  const nftPoolAllocated =
    publicData.nftPoolAllocated ??
    publicData.nftPoolReceived ??
    publicData.nftRewardPool?.totalInflow ??
    '0.00';

  const operationsAllocated =
    publicData.operationsAllocated ??
    publicData.operationsReceived ??
    publicData.devOperations?.totalInflow ??
    '0.00';

  const nftPoolLiveBalance =
    publicData.nftPoolLiveBalance ??
    publicData.nftPool ??
    publicData.nftPoolBalance ??
    publicData.nftRewardPool?.currentBalance ??
    '0.00';

  const operationsLiveBalance =
    publicData.operationsLiveBalance ??
    publicData.operations ??
    publicData.operationsBalance ??
    publicData.devOperations?.currentBalance ??
    '0.00';

  return {
    totalGeneratedVolume,
    systemChargeTotal: publicData.systemChargeTotal ?? '0.00',
    nftRewardPool: {
      totalInflow: nftPoolAllocated,
      totalDistributed:
        publicData.nftPoolDistributed ??
        publicData.nftRewardPool?.totalDistributed ??
        '0.00',
      currentBalance: nftPoolLiveBalance
    },
    devOperations: {
      totalInflow: operationsAllocated,
      totalUtilized:
        publicData.operationsUtilized ??
        publicData.devOperations?.totalUtilized ??
        '0.00',
      currentBalance: operationsLiveBalance
    }
  };
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Admin API helper
const adminApi = async (endpoint, options = {}) => {
  const adminKey = getRuntimeAdminKey();
  if (!adminKey) {
    throw new Error('Admin API key is required for this action');
  }

  const response = await fetch(getApiUrl(endpoint), {
    headers: {
      'Content-Type': 'application/json',
      [ADMIN_API_HEADER]: adminKey,
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearRuntimeAdminKey();
    }
    throw new Error(payload?.message || `Request failed: ${response.status}`);
  }
  return payload;
};







// ============================================================
// GUIDED TOUR SYSTEM COMPONENTS
// ============================================================

const TOUR_STORAGE_KEY = 'admin_tour_preferences';

// Tour steps configuration
const tourSteps = [
{
  id: 1,
  title: "🎯 Navigation Dock",
  description: "This sidebar gives you access to all 6 sections of the admin panel. Click any button to switch between Dashboard, Queue, Security, Founders, Community, and Multisig controls.",
  targetSelector: ".command-dock",
  tab: null, // No tab switching needed
  position: "right"
},
{
  id: 2,
  title: "📊 Dashboard Overview",
  description: "The Dashboard shows system status at a glance. Monitor protocol pauses, guardian state, and quickly access emergency controls like pausing the LevelManager.",
  targetSelector: ".admin-card-premium",
  tab: "dashboard",
  position: "bottom"
},
{
  id: 3,
  title: "📋 Transaction Queue",
  description: "All multisig proposals live here. View pending transactions, approve/revoke votes, and execute ready proposals. Click any row to see full transaction details.",
  targetSelector: ".command-dock button:nth-child(2)",
  tab: "queue",
  position: "right"
},
{
  id: 4,
  title: "🔒 Security & Guardian",
  description: "Control upgrade security here. Approve proxy addresses and implementations before any contract upgrades can be executed.",
  targetSelector: ".command-dock button:nth-child(3)",
  tab: "security",
  position: "right"
},
{
  id: 5,
  title: "💰 Founder Vault",
  description: "Track founder wallet balances and submit proposals to update distribution ratios. The ID1 wallet and downline status are shown here.",
  targetSelector: ".command-dock button:nth-child(4)",
  tab: "founders",
  position: "right"
},
{
  id: 6,
  title: "📢 Community Content",
  description: "Manage announcements, events, social links, and resources. Use the 'Create New' button to add content visible to users.",
  targetSelector: ".command-dock button:nth-child(5)",
  tab: "community",
  position: "right"
},
{
  id: 7,
  title: "⚙️ Multisig Settings",
  description: "Add or remove multisig owners and change the signature requirement for governance proposals.",
  targetSelector: ".command-dock button:nth-child(6)",
  tab: "multisig",
  position: "right"
},
{
  id: 8,
  title: "🚀 Quick Actions",
  description: "This floating button lets you quickly configure NFT pool and operations wallet routing without navigating menus.",
  targetSelector: ".fab-premium",
  tab: null,
  position: "left"
}];


// Helper to get tour preferences
const getTourPreferences = () => {
  const stored = localStorage.getItem(TOUR_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

// Helper to save tour preferences
const saveTourPreferences = (prefs) => {
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(prefs));
};

// Tour Manager Component
const TourManager = ({ isOwner, activeTab, setActiveTab }) => {
  const { t } = useTranslation();
  const adminT = useCallback((key, fallback, options) => t(`adminPanel.${key}`, fallback, options), [t]);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [highlightRect, setHighlightRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [targetElement, setTargetElement] = useState(null);
  const [showHelpButton, setShowHelpButton] = useState(false);

  // Check if tour should show on mount
  useEffect(() => {
    if (!isOwner) return;

    const prefs = getTourPreferences();

    if (!prefs) {
      // First time - show welcome modal
      setShowWelcome(true);
    } else if (prefs.skippedForever) {
      // User skipped forever - never show
      return;
    } else if (prefs.completed) {
      // Tour completed, show help button only
      setShowHelpButton(true);
    } else if (prefs.currentStep !== undefined && prefs.currentStep < tourSteps.length) {
      // Resume incomplete tour
      setCurrentStep(prefs.currentStep);
      startTour(prefs.currentStep);
    } else {
      setShowHelpButton(true);
    }
  }, [isOwner]);

  // Update highlight when tour is active
  useEffect(() => {
    if (isTourActive && currentStep < tourSteps.length) {
      const step = tourSteps[currentStep];
      const element = document.querySelector(step.targetSelector);

      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);

        // Calculate tooltip position
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        let top,left,placement = step.position || 'bottom';

        switch (placement) {
          case 'right':
            left = rect.right + 16;
            top = rect.top + rect.height / 2 - 60;
            if (left + 320 > viewportWidth) {
              placement = 'left';
              left = rect.left - 336;
            }
            break;
          case 'left':
            left = rect.left - 336;
            top = rect.top + rect.height / 2 - 60;
            if (left < 0) {
              placement = 'right';
              left = rect.right + 16;
            }
            break;
          case 'top':
            top = rect.top - 120;
            left = rect.left + rect.width / 2 - 160;
            if (top < 0) {
              placement = 'bottom';
              top = rect.bottom + 16;
            }
            break;
          default: // bottom
            top = rect.bottom + 16;
            left = rect.left + rect.width / 2 - 160;
            if (top + 200 > viewportHeight) {
              placement = 'top';
              top = rect.top - 120;
            }
            break;
        }

        // Ensure tooltip stays in viewport horizontally
        left = Math.max(16, Math.min(left, viewportWidth - 336));

        setTooltipPosition({ top, left, placement });

        // Scroll element into view if needed
        if (rect.top < 0 || rect.bottom > viewportHeight) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Element not found, try again after a delay
        setTimeout(() => {
          const retryElement = document.querySelector(step.targetSelector);
          if (retryElement && isTourActive) {
            const retryRect = retryElement.getBoundingClientRect();
            setHighlightRect(retryRect);
            setTargetElement(retryElement);
          }
        }, 300);
      }
    } else if (isTourActive && currentStep >= tourSteps.length) {
      // Tour completed
      completeTour();
    }
  }, [isTourActive, currentStep]);

  // Handle tab switching for steps that require specific tabs
  useEffect(() => {
    if (isTourActive && currentStep < tourSteps.length) {
      const step = tourSteps[currentStep];
      if (step.tab && step.tab !== activeTab) {
        setActiveTab(step.tab);
      }
    }
  }, [isTourActive, currentStep, activeTab, setActiveTab]);

  const startTour = (stepIndex = 0) => {
    setCurrentStep(stepIndex);
    setIsTourActive(true);
    setShowWelcome(false);

    // Save progress
    saveTourPreferences({
      completed: false,
      skippedForever: false,
      currentStep: stepIndex,
      lastUpdated: Date.now()
    });
  };

  const nextStep = () => {
    if (currentStep + 1 < tourSteps.length) {
      setCurrentStep(currentStep + 1);
      // Update saved progress
      const prefs = getTourPreferences() || {};
      saveTourPreferences({
        ...prefs,
        currentStep: currentStep + 1,
        lastUpdated: Date.now()
      });
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Update saved progress
      const prefs = getTourPreferences() || {};
      saveTourPreferences({
        ...prefs,
        currentStep: currentStep - 1,
        lastUpdated: Date.now()
      });
    }
  };

  const completeTour = () => {
    setIsTourActive(false);
    setHighlightRect(null);
    setTargetElement(null);
    setShowHelpButton(true);
    saveTourPreferences({
      completed: true,
      skippedForever: false,
      completedAt: Date.now()
    });
  };

  const skipForever = () => {
    setIsTourActive(false);
    setHighlightRect(null);
    setTargetElement(null);
    saveTourPreferences({
      completed: false,
      skippedForever: true,
      skippedAt: Date.now()
    });
  };

  const restartTour = () => {
    setShowHelpButton(false);
    startTour(0);
  };

  const handleWelcomeStart = () => {
    startTour(0);
  };

  const handleWelcomeSkip = () => {
    setShowWelcome(false);
    saveTourPreferences({
      completed: false,
      skippedForever: true,
      skippedAt: Date.now()
    });
  };

  const handleWelcomeLater = () => {
    setShowWelcome(false);
    setShowHelpButton(true);
    saveTourPreferences({
      completed: false,
      skippedForever: false,
      remindLater: true,
      remindAt: Date.now()
    });
  };

  const currentStepData = tourSteps[currentStep];

  return (
    <>
      {/* Welcome Modal */}
      {showWelcome &&
      <div className="tour-welcome-overlay" onClick={() => {}}>
          <div className="tour-welcome-card" onClick={(e) => e.stopPropagation()}>
            <div className="tour-welcome-icon">🚀</div>
            <h3>{adminT("tour.line396.welcomeToAdminCockpit", "Welcome to Admin Cockpit!")}</h3>
            <p>{adminT("tour.line397.thisPanelControlsAllGovernanceOperations", "This panel controls all governance operations for the protocol. You can take a quick tour of the main features. (Takes about 60 seconds)")}</p>
            <div className="tour-welcome-buttons">
              <button className="btn-premium-secondary" onClick={handleWelcomeSkip}>{adminT("tour.line399.skipForever", "Skip Forever")}</button>
              <button className="btn-premium-secondary" onClick={handleWelcomeLater}>{adminT("tour.line400.remindLater", "Remind Later")}</button>
              <button className="btn-premium" onClick={handleWelcomeStart}>{adminT("tour.line401.startTour", "Start Tour")}</button>
            </div>
          </div>
        </div>
      }

      {/* Help Button (shows after tour completion or dismissal) */}
      {showHelpButton &&
      <button className="tour-help-button" onClick={restartTour} title={adminT("tour.line409.restartTour", "Restart Tour")}>
          <HelpCircle size={24} />
        </button>
      }

      {/* Tour Overlay and Highlight */}
      {isTourActive && highlightRect &&
      <>
          <div className="tour-highlight-overlay">
            <div
            className="tour-highlight-box"
            style={{
              top: highlightRect.top - 4,
              left: highlightRect.left - 4,
              width: highlightRect.width + 8,
              height: highlightRect.height + 8
            }} />

          </div>

          {/* Tooltip Popover */}
          <div
          className="tour-tooltip"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            margin: tooltipPosition.placement === 'bottom' ? '8px 0 0 0' :
            tooltipPosition.placement === 'top' ? '0 0 8px 0' :
            tooltipPosition.placement === 'right' ? '0 0 0 8px' : '0 8px 0 0'
          }}
          data-placement={tooltipPosition.placement}>

            <div className="tour-tooltip-header">
              <span className="tour-step-badge">{adminT("tour.line442.step", "Step")}{currentStep + 1}/{tourSteps.length}</span>
              <button className="tour-tooltip-close" onClick={skipForever}>✕</button>
            </div>
            <div className="tour-tooltip-body">
              <h4>{adminT(`tour.steps.${currentStepData.id}.title`, currentStepData.title)}</h4>
              <p>{adminT(`tour.steps.${currentStepData.id}.description`, currentStepData.description)}</p>
            </div>
            <div className="tour-tooltip-footer">
              <button className="tour-btn-skip" onClick={skipForever}>{adminT("tour.line450.skipForever", "Skip Forever")}</button>
              <div>
                <button
                className="tour-btn-prev"
                onClick={prevStep}
                disabled={currentStep === 0}
                style={{ opacity: currentStep === 0 ? 0.5 : 1 }}>{adminT("tour.line457.previous", "Previous")}


              </button>
                <button className="tour-btn-next" onClick={nextStep}>
                  {currentStep + 1 === tourSteps.length ? adminT("tour.line461.finish", "Finish") : adminT("tour.line461.next", "Next")}
                </button>
              </div>
            </div>
          </div>
        </>
      }
    </>);

};




// ============================================================
// COMPONENT
// ============================================================
export const AdminPanel = () => {
  const { isConnected, account, connect } = useWallet();
  const { contracts, isLoading, error, loadContracts } = useContracts();
  const { t } = useTranslation();
  const toast = useToast();

  // ========== VIEW NAVIGATION STATE ==========
  const adminT = useCallback((key, fallback, options) => t(`adminPanel.${key}`, fallback, options), [t]);const boolLabel = useCallback((value) => value ? adminT('common.yes', 'Yes') : adminT('common.no', 'No'), [adminT]);const [activeTab, setActiveTab] = useState('dashboard');

  // ========== EXISTING STATE ==========
  const [founderWallets, setFounderWallets] = useState([]);
  const [founderRatios, setFounderRatios] = useState([]);
  const [walletInputs, setWalletInputs] = useState(Array(8).fill(''));
  const [ratioInputs, setRatioInputs] = useState(Array(8).fill('1250'));
  const [repAddress, setRepAddress] = useState('');
  const [nftPool, setNftPool] = useState('');
  const [opsWallet, setOpsWallet] = useState('');
  const [opsDisbursement, setOpsDisbursement] = useState({ recipient: '', amount: '', reason: '' });
  const [nftDistribution, setNftDistribution] = useState({ recipient: '', amount: '', distributionId: '', merkleRoot: '', metadataURI: '', reason: '' });

  const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null, note: null });
  const [isOwner, setIsOwner] = useState(false);
  const [ownerCheckComplete, setOwnerCheckComplete] = useState(false);

  const [txIdInput, setTxIdInput] = useState('');
  const [multisigTx, setMultisigTx] = useState(null);
  const [recentTxs, setRecentTxs] = useState([]);
  const [showHiddenTxs, setShowHiddenTxs] = useState(false);
  const [showExecutedTxs, setShowExecutedTxs] = useState(false);
  const [hiddenTxIds, setHiddenTxIds] = useState(readHiddenMultisigTxs);
  const [ownerList, setOwnerList] = useState([]);

  const [guardianState, setGuardianState] = useState({
    paused: false,
    globalUpgradeFreeze: false
  });

  const [systemState, setSystemState] = useState({
    levelManagerPaused: false
  });

  const [guardianProxyInput, setGuardianProxyInput] = useState('');
  const [guardianImplProxyInput, setGuardianImplProxyInput] = useState('');
  const [guardianImplInput, setGuardianImplInput] = useState('');
  const [upgradeProxyInput, setUpgradeProxyInput] = useState(import.meta.env.VITE_LEVELMANAGER_ADDRESS || '');
  const [upgradeImplementationInput, setUpgradeImplementationInput] = useState('');
  const [addOwnerInput, setAddOwnerInput] = useState('');
  const [removeOwnerInput, setRemoveOwnerInput] = useState('');
  const [replaceOwnerOldInput, setReplaceOwnerOldInput] = useState('');
  const [replaceOwnerNewInput, setReplaceOwnerNewInput] = useState('');
  const [changeRequirementInput, setChangeRequirementInput] = useState('4');
  const [selectedTxApprovals, setSelectedTxApprovals] = useState([]);
  const [guardianChecks, setGuardianChecks] = useState({
    proxyApproved: null,
    implementationApproved: null
  });

  const [multisigStats, setMultisigStats] = useState({
    requiredConfirmations: '0',
    txCount: '0',
    queuedTxCount: '0',
    executedTxCount: '0',
    currentTimestamp: Math.floor(Date.now() / 1000),
    timelockDelay: '0'
  });

  // ========== NEW STATE: Founder Vault Viewer ==========
  const [founderPayouts, setFounderPayouts] = useState({});
  const [id1Wallet, setId1Wallet] = useState('');
  const [isID1Downline, setIsID1Downline] = useState(false);
  const [founderRefreshing, setFounderRefreshing] = useState(false);
  const [totalFounderPayout, setTotalFounderPayout] = useState('0.00');
  const [skipAutoRefresh, setSkipAutoRefresh] = useState(false);

  // ========== NEW STATE: Community Content Management ==========
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [resources, setResources] = useState([]);
  const [activeContentTab, setActiveContentTab] = useState('announcements');
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [formData, setFormData] = useState({});

  // ========== FLOATING BUTTON STATE ==========
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [financialTruth, setFinancialTruth] = useState(emptyFinancialTruth);
  const [financialTruthError, setFinancialTruthError] = useState('');

  const totalRatio = useMemo(
    () => ratioInputs.reduce((sum, r) => sum + parseInt(r || 0, 10), 0),
    [ratioInputs]
  );

  const levelManagerAddress = import.meta.env.VITE_LEVELMANAGER_ADDRESS;
  const guardianAddress = import.meta.env.VITE_GUARDIAN_ADDRESS || '';
  const multisigAddress = import.meta.env.VITE_MULTISIG_ADDRESS || '';
  const nftPoolVaultAddress = import.meta.env.VITE_NFT_POOL_VAULT_ADDRESS || import.meta.env.VITE_NFT_POOL_ADDRESS || '';
  const operationsVaultAddress = import.meta.env.VITE_OPERATIONS_VAULT_ADDRESS || import.meta.env.VITE_OPERATIONS_WALLET_ADDRESS || '';

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  const shortAddress = (addr) => !addr ? '—' : `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  const formatUnix = (value) => {
    if (!value) return '—';
    const date = new Date(Number(value) * 1000);
    return date.toLocaleString();
  };

  const formatCountdown = (seconds) => {
    if (seconds <= 0) return 'Ready now';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getStageFromTx = useCallback((tx) => {
    if (!tx) return { label: 'Unknown', variant: 'secondary' };
    const confirmations = Number(tx.confirmations || 0);
    const required = Number(multisigStats.requiredConfirmations || 0);
    const executeAfter = Number(tx.executeAfter || 0);
    const now = Number(multisigStats.currentTimestamp || 0);
    const executed = Boolean(tx.executed);
    if (executed) return { label: 'Executed', variant: 'success' };
    if (confirmations < required) return { label: 'Waiting for approvals', variant: 'warning' };
    if (now < executeAfter) return { label: 'Waiting for timelock', variant: 'info' };
    return { label: 'Ready to execute', variant: 'primary' };
  }, [multisigStats]);

  const remainingSeconds = useMemo(() => {
    if (!multisigTx) return 0;
    const executeAfter = Number(multisigTx.executeAfter || 0);
    const now = Number(multisigStats.currentTimestamp || 0);
    return Math.max(executeAfter - now, 0);
  }, [multisigTx, multisigStats.currentTimestamp]);

  const approvalPercent = useMemo(() => {
    if (!multisigTx) return 0;
    const confirmations = Number(multisigTx.confirmations || 0);
    const required = Number(multisigStats.requiredConfirmations || 1);
    return Math.min(confirmations / required * 100, 100);
  }, [multisigTx, multisigStats.requiredConfirmations]);

  const visibleRecentTxs = useMemo(() => {
    const now = Number(multisigStats.currentTimestamp || Math.floor(Date.now() / 1000));
    return recentTxs.filter((tx) => {
      const txId = String(tx.txId);
      const hidden = hiddenTxIds.includes(txId);
      if (hidden && !showHiddenTxs) return false;

      const executed = Boolean(tx.executed);
      const submittedAt = Number(tx.submittedAt || 0);
      const isRecent = submittedAt > 0 && now - submittedAt <= MULTISIG_RECENT_WINDOW_SECONDS;
      if (executed && !showExecutedTxs && !isRecent) return false;

      return true;
    });
  }, [hiddenTxIds, multisigStats.currentTimestamp, recentTxs, showExecutedTxs, showHiddenTxs]);

  const persistHiddenTxIds = useCallback((nextIds) => {
    const normalized = Array.from(new Set(nextIds.map(String)));
    setHiddenTxIds(normalized);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HIDDEN_MULTISIG_TXS_KEY, JSON.stringify(normalized));
    }
  }, []);

  const handleHideTx = useCallback((txId) => {
    persistHiddenTxIds([...hiddenTxIds, String(txId)]);
  }, [hiddenTxIds, persistHiddenTxIds]);

  const handleUnhideTx = useCallback((txId) => {
    persistHiddenTxIds(hiddenTxIds.filter((id) => id !== String(txId)));
  }, [hiddenTxIds, persistHiddenTxIds]);

  const handleHideExecutedTxs = useCallback(() => {
    const executedIds = recentTxs.filter((tx) => tx.executed).map((tx) => String(tx.txId));
    persistHiddenTxIds([...hiddenTxIds, ...executedIds]);
  }, [hiddenTxIds, persistHiddenTxIds, recentTxs]);

  const refreshFinancialTruth = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/community/summary'));
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || `Request failed: ${response.status}`);
      setFinancialTruth(buildAdminFinancialTruth(unwrapCommunitySummary(payload)));
      setFinancialTruthError('');
    } catch (err) {
      setFinancialTruthError(err?.message || 'Unable to load indexed financial truth');
    }
  }, []);

  const decodeTransactionAction = useCallback((tx) => {
    if (!tx?.data) return { label: 'Unknown action', details: '', category: 'Unknown', targetLabel: shortAddress(tx?.to || '') };

    const tries = [
    { iface: levelManagerAdminIface, name: 'LevelManager' },
    { iface: guardianIface, name: 'Guardian' },
    { iface: multisigSelfIface, name: 'Multisig' },
    { iface: operationsVaultIface, name: 'OperationsVault' },
    { iface: nftPoolVaultIface, name: 'NFTPoolVault' }];


    for (const entry of tries) {
      try {
        const parsed = entry.iface.parseTransaction({ data: tx.data });
        if (!parsed) continue;

        const name = parsed.name;
        const args = parsed.args ? Array.from(parsed.args) : [];

        if (entry.name === 'LevelManager') {
          switch (name) {
            case 'setFounderWallets':
              return { label: 'Set founder wallets', details: `${args[0]?.length || 0} wallets proposed`, category: 'Configuration', targetLabel: 'LevelManager' };
            case 'setFounderRepresentatives':
              return { label: 'Set founder representatives', details: `${args[0]?.length || 0} representative(s)`, category: 'Configuration', targetLabel: 'LevelManager' };
            case 'updateChargeRecipients':
              return { label: 'Update charge recipients', details: `NFT Pool ${shortAddress(args[0])} • Operations ${shortAddress(args[1])}`, category: 'Configuration', targetLabel: 'LevelManager' };
            case 'pause':
              return { label: 'Pause protocol', details: 'Pause LevelManager operations', category: 'Emergency', targetLabel: 'LevelManager' };
            case 'unpause':
              return { label: 'Unpause protocol', details: 'Resume LevelManager operations', category: 'Emergency', targetLabel: 'LevelManager' };
            case 'setGuardian':
              return { label: 'Set guardian', details: shortAddress(args[0]), category: 'Security', targetLabel: 'LevelManager' };
            case 'setTokenController':
              return { label: 'Set token controller', details: shortAddress(args[0]), category: 'Configuration', targetLabel: 'LevelManager' };
            case 'setOrbitContracts':
              return { label: 'Set orbit contracts', details: `P4 ${shortAddress(args[0])} • P12 ${shortAddress(args[1])} • P39 ${shortAddress(args[2])}`, category: 'Configuration', targetLabel: 'LevelManager' };
            case 'approveEscrow':
              return { label: 'Approve escrow', details: `${args[0]?.toString?.() || String(args[0])}`, category: 'Configuration', targetLabel: 'LevelManager' };
            case 'setFounderRepInOrbits':
              return { label: 'Set founder rep status in orbits', details: `${shortAddress(args[0])} → ${boolLabel(args[1])}`, category: 'Configuration', targetLabel: 'LevelManager' };
            case 'upgradeTo':
            case 'upgradeToAndCall':
              return { label: 'Upgrade LevelManager', details: `New implementation ${shortAddress(args[0])}`, category: 'Upgrade', targetLabel: 'LevelManager', implementationAddress: args[0] };
            default:
              return { label: name, details: JSON.stringify(args), category: 'LevelManager', targetLabel: 'LevelManager' };
          }
        }

        if (entry.name === 'Guardian') {
          switch (name) {
            case 'setApprovedProxy':
              return { label: 'Set approved proxy', details: `${shortAddress(args[0])} → ${boolLabel(args[1])}`, category: 'Guardian', targetLabel: 'Guardian' };
            case 'setApprovedImplementation':
              return { label: 'Set approved implementation', details: `Proxy ${shortAddress(args[0])} • Impl ${shortAddress(args[1])} • ${boolLabel(args[2])}`, category: 'Guardian', targetLabel: 'Guardian', proxyAddress: args[0], implementationAddress: args[1] };
            case 'batchSetApprovedImplementations':
              return { label: 'Batch implementation approvals', details: `Proxy ${shortAddress(args[0])} • ${args[1]?.length || 0} implementation(s) • ${boolLabel(args[2])}`, category: 'Guardian', targetLabel: 'Guardian', proxyAddress: args[0] };
            case 'setGlobalUpgradeFreeze':
              return { label: args[0] ? 'Freeze upgrades' : 'Unfreeze upgrades', details: `Global upgrade freeze → ${boolLabel(args[0])}`, category: 'Guardian', targetLabel: 'Guardian' };
            case 'pause':
              return { label: 'Pause guardian admin', details: 'Pause guardian mutation functions', category: 'Guardian', targetLabel: 'Guardian' };
            case 'unpause':
              return { label: 'Unpause guardian admin', details: 'Resume guardian mutation functions', category: 'Guardian', targetLabel: 'Guardian' };
            default:
              return { label: name, details: JSON.stringify(args), category: 'Guardian', targetLabel: 'Guardian' };
          }
        }

        if (entry.name === 'OperationsVault') {
          if (name === 'disburse') {
            return { label: 'Operations disbursement', details: `${formatMoney(ethers.formatUnits(args[1], 6))} USDT to ${shortAddress(args[0])} - ${args[2] || 'No reason'}`, category: 'Treasury', targetLabel: 'OperationsVault' };
          }
        }

        if (entry.name === 'NFTPoolVault') {
          if (name === 'setDistributionRoot') {
            return { label: 'Set NFT distribution root', details: `${String(args[0]).slice(0, 10)}... - ${args[3] || args[2] || 'No reason'}`, category: 'Treasury', targetLabel: 'NFTPoolVault' };
          }
          if (name === 'distribute') {
            return { label: 'NFT pool distribution', details: `${formatMoney(ethers.formatUnits(args[1], 6))} USDT to ${shortAddress(args[0])} - ${args[3] || 'No reason'}`, category: 'Treasury', targetLabel: 'NFTPoolVault' };
          }
        }

        if (entry.name === 'Multisig') {
          switch (name) {
            case 'addOwner':
              return { label: 'Add owner', details: shortAddress(args[0]), category: 'Multisig', targetLabel: 'SimpleMultiSig' };
            case 'removeOwner':
              return { label: 'Remove owner', details: shortAddress(args[0]), category: 'Multisig', targetLabel: 'SimpleMultiSig' };
            case 'replaceOwner':
              return { label: 'Replace owner', details: `${shortAddress(args[0])} → ${shortAddress(args[1])}`, category: 'Multisig', targetLabel: 'SimpleMultiSig' };
            case 'changeRequirement':
              return { label: 'Change requirement', details: `${args[0]?.toString?.() || String(args[0])} confirmations`, category: 'Multisig', targetLabel: 'SimpleMultiSig' };
            default:
              return { label: name, details: JSON.stringify(args), category: 'Multisig', targetLabel: 'SimpleMultiSig' };
          }
        }
      } catch {

        // continue
      }}

    return { label: 'Unknown action', details: tx.data, category: 'Unknown', targetLabel: shortAddress(tx.to) };
  }, []);

  const readTransaction = useCallback(async (txId) => {
    if (!contracts?.simpleMultiSig) return null;
    const tx = await contracts.simpleMultiSig.transactions(Number(txId));

    const approvals = ownerList.length > 0 ?
    await Promise.all(ownerList.map(async (owner) => ({
      owner,
      approved: await contracts.simpleMultiSig.approved(Number(txId), owner)
    }))) :
    [];

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
    };

    return {
      ...raw,
      ...decodeTransactionAction(raw)
    };
  }, [contracts, ownerList, decodeTransactionAction]);

  const loadGuardianChecks = useCallback(async (proxyAddress, implementationAddress) => {
    if (!contracts?.guardian) {
      setGuardianChecks({ proxyApproved: null, implementationApproved: null });
      return;
    }

    try {
      const [proxyApproved, implementationApproved] = await Promise.all([
      proxyAddress ? contracts.guardian.approvedProxies(proxyAddress) : Promise.resolve(null),
      proxyAddress && implementationAddress ? contracts.guardian.approvedImplementations(proxyAddress, implementationAddress) : Promise.resolve(null)]
      );

      setGuardianChecks({ proxyApproved, implementationApproved });
    } catch (err) {
      console.error(err);
      setGuardianChecks({ proxyApproved: null, implementationApproved: null });
    }
  }, [contracts]);

  // ============================================================
  // Community Content API Functions
  // ============================================================
  const fetchAnnouncements = useCallback(async () => {
    const res = await adminApi('/api/admin/community/announcements');
    setAnnouncements(res.data || []);
  }, []);

  const fetchEvents = useCallback(async () => {
    const res = await adminApi('/api/admin/community/events');
    setEvents(res.data || []);
  }, []);

  const fetchSocialLinks = useCallback(async () => {
    const res = await adminApi('/api/admin/community/social-links');
    setSocialLinks(res.data || []);
  }, []);

  const fetchResources = useCallback(async () => {
    const res = await adminApi('/api/admin/community/resources');
    setResources(res.data || []);
  }, []);

  const fetchAllContent = useCallback(async () => {
    setContentLoading(true);
    try {
      await Promise.all([fetchAnnouncements(), fetchEvents(), fetchSocialLinks(), fetchResources()]);
    } catch (err) {
      const message = err?.message || 'Admin API key validation failed';
      setErrorTx(message);
      toast.danger(message, { dedupeKey: `admin-api-key-${message}` });
    } finally {
      setContentLoading(false);
    }
  }, [fetchAnnouncements, fetchEvents, fetchSocialLinks, fetchResources, toast]);

  const handleCreateContent = async () => {
    const endpoints = {
      announcements: '/api/admin/community/announcements',
      events: '/api/admin/community/events',
      socialLinks: '/api/admin/community/social-links',
      resources: '/api/admin/community/resources'
    };
    try {
      await adminApi(endpoints[activeContentTab], {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowContentModal(false);
      setFormData({});
      fetchAllContent();
      toast.success(adminT('toast.contentCreated', 'Content created.'), { dedupeKey: `admin-content-created-${activeContentTab}` });
    } catch (err) {
      toast.danger(`Failed to create: ${err.message}`, { dedupeKey: `admin-content-create-failed-${activeContentTab}` });
    }
  };

  const handleUpdateContent = async () => {
    const endpoints = {
      announcements: `/api/admin/community/announcements/${editingItem._id}`,
      events: `/api/admin/community/events/${editingItem._id}`,
      socialLinks: `/api/admin/community/social-links/${editingItem._id}`,
      resources: `/api/admin/community/resources/${editingItem._id}`
    };
    try {
      await adminApi(endpoints[activeContentTab], {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      setShowContentModal(false);
      setEditingItem(null);
      setFormData({});
      fetchAllContent();
      toast.success(adminT('toast.contentUpdated', 'Content updated.'), { dedupeKey: `admin-content-updated-${activeContentTab}` });
    } catch (err) {
      toast.danger(`Failed to update: ${err.message}`, { dedupeKey: `admin-content-update-failed-${activeContentTab}` });
    }
  };

  const handleDeleteContent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    const endpoints = {
      announcements: `/api/admin/community/announcements/${id}`,
      events: `/api/admin/community/events/${id}`,
      socialLinks: `/api/admin/community/social-links/${id}`,
      resources: `/api/admin/community/resources/${id}`
    };
    try {
      await adminApi(endpoints[activeContentTab], { method: 'DELETE' });
      fetchAllContent();
      toast.success(adminT('toast.contentDeleted', 'Content deleted.'), { dedupeKey: `admin-content-deleted-${activeContentTab}` });
    } catch (err) {
      toast.danger(`Failed to delete: ${err.message}`, { dedupeKey: `admin-content-delete-failed-${activeContentTab}` });
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowContentModal(true);
  };

  // const openCreateModal = () => {
  //   setEditingItem(null)
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



  const openCreateModal = () => {
    console.log('Opening modal, setting showContentModal to true');
    setEditingItem(null);
    const defaultData = { isActive: true };
    if (activeContentTab === 'announcements') {
      const today = new Date();
      defaultData.date = today.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    setFormData(defaultData);
    setShowContentModal(true);
  };

  // ============================================================
  // Founder Vault Functions
  // ============================================================
  const fetchFounderPayouts = useCallback(async () => {
    setFounderRefreshing(true);
    try {
      const response = await fetch(getApiUrl('/api/community/founders/distribution'));
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || `Request failed: ${response.status}`);

      const data = payload?.data || {};
      const founders = Array.isArray(data.founders) ? data.founders : [];
      const payouts = {};

      for (const founder of founders) {
        payouts[founder.wallet] = founder.totalPaid || '0.00';
      }

      setFounderWallets(founders.map((founder) => founder.wallet));
      setFounderRatios(founders.map((founder) => String(founder.ratioBps || '0')));
      setFounderPayouts(payouts);
      setTotalFounderPayout(data.totalPaid || '0.00');

      if (contracts?.levelManager && account) {
        const id1 = await contracts.levelManager.id1Wallet();
        const isDownline = await contracts.levelManager.isID1Downline(account);

        setId1Wallet(id1);
        setIsID1Downline(isDownline);
      }
    } catch (err) {
      console.error('Fetch founder payouts failed:', err);
    } finally {
      setFounderRefreshing(false);
    }
  }, [contracts, account]);

  // ============================================================
  // EXISTING FUNCTIONS
  // ============================================================
  const refreshGovernanceData = useCallback(async () => {
    if (!contracts || !account) return;

    try {
      const ownerMatch = contracts.simpleMultiSig ? await contracts.simpleMultiSig.isOwner(account) : false;
      setIsOwner(ownerMatch);

      const [
      requiredConfirmations,
      txCount,
      timelockDelay,
      owners,
      latestBlock] =
      await Promise.all([
      contracts.simpleMultiSig?.requiredConfirmations?.() ?? 0,
      contracts.simpleMultiSig?.getTransactionCount?.() ?? 0,
      contracts.simpleMultiSig?.timelockDelay?.() ?? 0,
      contracts.simpleMultiSig?.getOwners?.() ?? [],
      contracts.levelManager?.runner?.provider?.getBlock?.('latest')]
      );

      setOwnerList(owners);
      setMultisigStats({
        requiredConfirmations: requiredConfirmations.toString(),
        txCount: txCount.toString(),
        currentTimestamp: latestBlock?.timestamp || Math.floor(Date.now() / 1000),
        timelockDelay: timelockDelay.toString()
      });

      const guardianPaused = contracts.guardian?.paused ? await contracts.guardian.paused() : false;
      const globalUpgradeFreeze = contracts.guardian?.globalUpgradeFreeze ? await contracts.guardian.globalUpgradeFreeze() : false;
      setGuardianState({
        paused: guardianPaused,
        globalUpgradeFreeze
      });

      const levelManagerPaused = contracts.levelManager?.paused ? await contracts.levelManager.paused() : false;
      setSystemState({ levelManagerPaused });

      if (ownerMatch && contracts.levelManager) {
        const [wallets, ratios] = await contracts.levelManager.getFounderWallets();
        setFounderWallets(wallets);
        setFounderRatios(ratios.map((r) => r.toString()));

        if (!skipAutoRefresh) {
          const currentNftPool = await contracts.levelManager.nftPool();
          const currentOpsWallet = await contracts.levelManager.operationsWallet();
          setNftPool(currentNftPool);
          setOpsWallet(currentOpsWallet);
        }
      }

      const count = Number(txCount);
      const start = Math.max(0, count - 50);
      const ids = [];
      for (let i = count - 1; i >= start; i -= 1) ids.push(i);

      const txs = await Promise.all(ids.map((id) => readTransaction(id)));
      const validTxs = txs.filter(Boolean);
      setRecentTxs(txs.filter(Boolean));

      const queuedTxCount = validTxs.filter((tx) => !tx.executed).length;
      const executedTxCount = validTxs.filter((tx) => tx.executed).length;

      setMultisigStats((prev) => ({
        ...prev,
        queuedTxCount: queuedTxCount.toString(),
        executedTxCount: executedTxCount.toString()
      }));

      if (multisigTx?.txId !== undefined) {
        const fresh = await readTransaction(multisigTx.txId);
        setMultisigTx(fresh);
        setSelectedTxApprovals(fresh?.approvals || []);
        if (fresh?.proxyAddress || fresh?.implementationAddress) {
          await loadGuardianChecks(fresh.proxyAddress || levelManagerAddress, fresh.implementationAddress || '');
        } else {
          setGuardianChecks({ proxyApproved: null, implementationApproved: null });
        }
      }

      await Promise.all([
        fetchFounderPayouts(),
        refreshFinancialTruth()
      ]);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setOwnerCheckComplete(true);
    }
  }, [contracts, account, multisigTx?.txId, readTransaction, loadGuardianChecks, levelManagerAddress, fetchFounderPayouts, refreshFinancialTruth, skipAutoRefresh]);

  useEffect(() => {
    if (contracts) {
      window.contracts = contracts;
    }
  }, [contracts]);

  useEffect(() => {
    window.refreshGovernanceData = refreshGovernanceData;
  }, [refreshGovernanceData]);

  useEffect(() => {
    window.systemState = systemState;
    window.guardianState = guardianState;
  }, [systemState, guardianState]);

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error);
    }
  }, [isConnected, loadContracts]);

  useEffect(() => {
    if (contracts && account) {
      refreshGovernanceData().catch(console.error);
      fetchAllContent();
    }
  }, [contracts, account, refreshGovernanceData, fetchAllContent]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!contracts?.levelManager?.runner?.provider) return;
      try {
        const latestBlock = await contracts.levelManager.runner.provider.getBlock('latest');
        setMultisigStats((prev) => ({
          ...prev,
          currentTimestamp: latestBlock?.timestamp || prev.currentTimestamp
        }));
      } catch (err) {
        console.error(err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [contracts]);

  const getWriteContracts = async () => {
    const { writeContracts } = await web3Service.initWallet({ requestAccounts: false });
    return writeContracts;
  };

  const setLoadingTx = (hash = null, note = null) => {
    setTxStatus({ loading: true, hash, error: null, note });
    if (hash) toast.info(note || adminT('toast.transactionSubmitted', 'Transaction submitted.'), { dedupeKey: `admin-tx-submitted-${hash}` });
  };
  const setDoneTx = (hash = null, note = null) => {
    setTxStatus({ loading: false, hash, error: null, note });
    toast.success(note || adminT('toast.transactionConfirmed', 'Transaction confirmed.'), { dedupeKey: `admin-tx-confirmed-${hash || note || 'done'}` });
  };
  const setErrorTx = (message) => {
    setTxStatus({ loading: false, hash: null, error: message, note: null });
    if (message) toast.danger(message, { dedupeKey: `admin-tx-error-${String(message).slice(0, 80)}` });
  };
  const setNormalizedErrorTx = (err, fallback) => {
    const normalized = normalizeError(err, fallback);
    setErrorTx(normalized.message);
  };

  const submitRawProposal = async (target, data, note) => {
    try {
      const writeContracts = await getWriteContracts();
      const gasEstimate = await writeContracts.simpleMultiSig.submitTransaction.estimateGas(target, 0, data);
      const tx = await writeContracts.simpleMultiSig.submitTransaction(target, 0, data, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, note);
      await tx.wait();
      setDoneTx(tx.hash, note);
      await refreshGovernanceData();
      return tx;
    } catch (err) {
      setNormalizedErrorTx(err, `${note} failed`);
      throw err;
    }
  };

  const submitLevelManagerProposal = async (functionName, args = [], note = 'LevelManager proposal submitted') => {
    try {
      const data = levelManagerAdminIface.encodeFunctionData(functionName, args);
      return await submitRawProposal(levelManagerAddress, data, note);
    } catch (err) {
      setNormalizedErrorTx(err, `${note} failed`);
      throw err;
    }
  };

  const submitGuardianProposal = async (functionName, args = [], note = 'Guardian proposal submitted') => {
    try {
      if (!guardianAddress) throw new Error('VITE_GUARDIAN_ADDRESS is missing');
      const data = guardianIface.encodeFunctionData(functionName, args);
      return await submitRawProposal(guardianAddress, data, note);
    } catch (err) {
      setNormalizedErrorTx(err, `${note} failed`);
      throw err;
    }
  };

  const submitMultisigSelfProposal = async (functionName, args = [], note = 'Multisig proposal submitted') => {
    try {
      const target = multisigAddress || contracts?.simpleMultiSig?.target;
      if (!target) throw new Error('Multisig address unavailable');
      const data = multisigSelfIface.encodeFunctionData(functionName, args);
      return await submitRawProposal(target, data, note);
    } catch (err) {
      setNormalizedErrorTx(err, `${note} failed`);
      throw err;
    }
  };

  const submitVaultProposal = async (target, iface, functionName, args = [], note = 'Treasury proposal submitted') => {
    if (!target || !ethers.isAddress(target)) {
      throw new Error('Treasury vault address is missing or invalid. Check frontend env configuration.');
    }
    const data = iface.encodeFunctionData(functionName, args);
    return submitRawProposal(target, data, note);
  };

  const loadMultisigTx = async (forcedId = null) => {
    const idToLoad = forcedId ?? txIdInput;
    if (!contracts?.simpleMultiSig || idToLoad === '' || idToLoad === null || idToLoad === undefined) return;

    try {
      const latestBlock = await contracts.levelManager.runner.provider.getBlock('latest');
      setMultisigStats((prev) => ({
        ...prev,
        currentTimestamp: latestBlock?.timestamp || prev.currentTimestamp
      }));

      const tx = await readTransaction(Number(idToLoad));
      setMultisigTx(tx);
      setTxIdInput(String(idToLoad));
      setSelectedTxApprovals(tx?.approvals || []);

      if (tx?.implementationAddress || tx?.proxyAddress) {
        await loadGuardianChecks(tx.proxyAddress || levelManagerAddress, tx.implementationAddress || '');
      } else {
        setGuardianChecks({ proxyApproved: null, implementationApproved: null });
      }
    } catch (err) {
      console.error(err);
      setMultisigTx(null);
      setSelectedTxApprovals([]);
      setGuardianChecks({ proxyApproved: null, implementationApproved: null });
      setErrorTx(err?.reason || err?.message || 'Failed to load multisig transaction');
    }
  };

  const handleApproveTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? txIdInput);
    try {
      const writeContracts = await getWriteContracts();
      const gasEstimate = await writeContracts.simpleMultiSig.approveTransaction.estimateGas(idToUse);
      const tx = await writeContracts.simpleMultiSig.approveTransaction(idToUse, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, `Approving transaction #${idToUse}`);
      await tx.wait();
      setDoneTx(tx.hash, `Approved transaction #${idToUse}`);
      await refreshGovernanceData();
      await loadMultisigTx(idToUse);
    } catch (err) {
      setNormalizedErrorTx(err, 'Approval failed');
    }
  };

  const handleRevokeTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? txIdInput);
    try {
      const writeContracts = await getWriteContracts();
      const gasEstimate = await writeContracts.simpleMultiSig.revokeConfirmation.estimateGas(idToUse);
      const tx = await writeContracts.simpleMultiSig.revokeConfirmation(idToUse, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, `Revoking approval for transaction #${idToUse}`);
      await tx.wait();
      setDoneTx(tx.hash, `Revoked approval for transaction #${idToUse}`);
      await refreshGovernanceData();
      await loadMultisigTx(idToUse);
    } catch (err) {
      setNormalizedErrorTx(err, 'Revoke failed');
    }
  };

  const handleExecuteTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? txIdInput);
    try {
      const writeContracts = await getWriteContracts();
      const gasEstimate = await writeContracts.simpleMultiSig.executeTransaction.estimateGas(idToUse);
      const tx = await writeContracts.simpleMultiSig.executeTransaction(idToUse, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, `Executing transaction #${idToUse}`);
      await tx.wait();
      setDoneTx(tx.hash, `Executed transaction #${idToUse}`);
      await refreshGovernanceData();
      await loadMultisigTx(idToUse);
    } catch (err) {
      setNormalizedErrorTx(err, 'Execution failed');
    }
  };

  const handleSubmitPauseProposal = async () => {
    await submitLevelManagerProposal('pause', [], 'Pause LevelManager proposal');
  };

  const handleSubmitUnpauseProposal = async () => {
    await submitLevelManagerProposal('unpause', [], 'Unpause LevelManager proposal');
  };

  const handleSetFounderWallets = async () => {
    const validWallets = walletInputs.map((w) => w.trim());
    const validRatios = ratioInputs.map((r) => parseInt(r || 0, 10));

    if (validWallets.some((w) => !ethers.isAddress(w))) {
      alert('All founder wallet addresses must be valid Ethereum addresses');
      return;
    }
    if (validWallets.length !== 8) {
      alert('You must provide exactly 8 wallet addresses');
      return;
    }
    const ratioSum = validRatios.reduce((sum, r) => sum + r, 0);
    if (ratioSum !== 10000) {
      alert(`Ratios must sum to 10000 (currently ${ratioSum})`);
      return;
    }

    await submitLevelManagerProposal('setFounderWallets', [validWallets, validRatios], 'Founder wallet proposal');
  };

  const handleAddFounderRep = async () => {
    if (!ethers.isAddress(repAddress)) {
      alert('Please enter a valid representative address');
      return;
    }
    await submitLevelManagerProposal('setFounderRepresentatives', [[repAddress]], 'Representative proposal');
    setRepAddress('');
  };

  const handleUpdateChargeRecipients = async () => {
    if (!ethers.isAddress(nftPool) || !ethers.isAddress(opsWallet)) {
      alert('NFT Pool and Operations wallet must be valid Ethereum addresses');
      return;
    }
    await submitLevelManagerProposal('updateChargeRecipients', [nftPool, opsWallet], 'Charge routing proposal');
  };

  const handleOperationsDisbursementProposal = async () => {
    if (!ethers.isAddress(opsDisbursement.recipient)) {
      alert('Enter a valid recipient address');
      return;
    }
    if (!opsDisbursement.reason.trim()) {
      alert('A clear reason is required for operations disbursement');
      return;
    }
    const amount = ethers.parseUnits(String(opsDisbursement.amount || '0'), 6);
    if (amount <= 0n) {
      alert('Enter a valid USDT amount');
      return;
    }
    await submitVaultProposal(
      operationsVaultAddress,
      operationsVaultIface,
      'disburse',
      [opsDisbursement.recipient.trim(), amount, opsDisbursement.reason.trim()],
      'Operations vault disbursement proposal'
    );
  };

  const handleNFTDistributionRootProposal = async () => {
    if (!nftDistribution.distributionId.trim()) {
      alert('Distribution ID is required');
      return;
    }
    const distributionId = nftDistribution.distributionId?.startsWith('0x')
      ? nftDistribution.distributionId
      : ethers.id(nftDistribution.distributionId || '');
    const merkleRoot = nftDistribution.merkleRoot;

    if (!ethers.isHexString(distributionId, 32) || !ethers.isHexString(merkleRoot, 32) || merkleRoot === ethers.ZeroHash) {
      alert('Distribution ID and Merkle root are required');
      return;
    }
    if (!nftDistribution.reason.trim()) {
      alert('A clear reason is required for NFT pool root setup');
      return;
    }

    await submitVaultProposal(
      nftPoolVaultAddress,
      nftPoolVaultIface,
      'setDistributionRoot',
      [distributionId, merkleRoot, nftDistribution.metadataURI.trim(), nftDistribution.reason.trim()],
      'NFT pool distribution root proposal'
    );
  };

  const handleNFTDistributionProposal = async () => {
    if (!ethers.isAddress(nftDistribution.recipient)) {
      alert('Enter a valid recipient address');
      return;
    }
    if (!nftDistribution.reason.trim()) {
      alert('A clear reason is required for NFT pool distribution');
      return;
    }
    const amount = ethers.parseUnits(String(nftDistribution.amount || '0'), 6);
    if (amount <= 0n) {
      alert('Enter a valid USDT amount');
      return;
    }
    const distributionId = nftDistribution.distributionId?.startsWith('0x')
      ? nftDistribution.distributionId
      : ethers.id(nftDistribution.distributionId || '');
    if (!ethers.isHexString(distributionId, 32)) {
      alert('Enter a valid distribution ID or label');
      return;
    }

    await submitVaultProposal(
      nftPoolVaultAddress,
      nftPoolVaultIface,
      'distribute',
      [nftDistribution.recipient.trim(), amount, distributionId || ethers.ZeroHash, nftDistribution.reason.trim()],
      'NFT pool distribution proposal'
    );
  };

  const handleGuardianFreeze = async (frozen) => {
    await submitGuardianProposal('setGlobalUpgradeFreeze', [frozen], frozen ? 'Freeze upgrades proposal' : 'Unfreeze upgrades proposal');
  };

  const handleGuardianPauseAdmin = async (paused) => {
    await submitGuardianProposal(paused ? 'pause' : 'unpause', [], paused ? 'Pause guardian admin proposal' : 'Unpause guardian admin proposal');
  };

  const handleGuardianApproveProxy = async (allowed) => {
    if (!ethers.isAddress(guardianProxyInput)) {
      alert('Enter a valid proxy address');
      return;
    }
    await submitGuardianProposal('setApprovedProxy', [guardianProxyInput, allowed], allowed ? 'Approve proxy proposal' : 'Revoke proxy approval proposal');
    await loadGuardianChecks(guardianProxyInput, guardianImplInput);
  };

  const handleGuardianApproveImplementation = async (allowed) => {
    if (!ethers.isAddress(guardianImplProxyInput) || !ethers.isAddress(guardianImplInput)) {
      alert('Enter valid proxy and implementation addresses');
      return;
    }
    await submitGuardianProposal('setApprovedImplementation', [guardianImplProxyInput, guardianImplInput, allowed], allowed ? 'Approve implementation proposal' : 'Revoke implementation proposal');
    await loadGuardianChecks(guardianImplProxyInput, guardianImplInput);
  };

  const handleSubmitUpgradeProposal = async () => {
    if (!ethers.isAddress(upgradeProxyInput) || !ethers.isAddress(upgradeImplementationInput)) {
      alert('Enter valid proxy and implementation addresses');
      return;
    }

    const uupsIface = new ethers.Interface(['function upgradeToAndCall(address newImplementation,bytes data)']);
    const data = uupsIface.encodeFunctionData('upgradeToAndCall', [upgradeImplementationInput, '0x']);
    await submitRawProposal(upgradeProxyInput, data, 'Upgrade proposal');
  };

  const handleAddOwnerProposal = async () => {
    if (!ethers.isAddress(addOwnerInput)) {
      alert('Enter a valid new owner address');
      return;
    }
    await submitMultisigSelfProposal('addOwner', [addOwnerInput], 'Add owner proposal');
    setAddOwnerInput('');
  };

  const handleRemoveOwnerProposal = async () => {
    if (!ethers.isAddress(removeOwnerInput)) {
      alert('Enter a valid owner address');
      return;
    }
    await submitMultisigSelfProposal('removeOwner', [removeOwnerInput], 'Remove owner proposal');
    setRemoveOwnerInput('');
  };

  const handleReplaceOwnerProposal = async () => {
    if (!ethers.isAddress(replaceOwnerOldInput) || !ethers.isAddress(replaceOwnerNewInput)) {
      alert('Enter valid old and new owner addresses');
      return;
    }
    await submitMultisigSelfProposal('replaceOwner', [replaceOwnerOldInput, replaceOwnerNewInput], 'Replace owner proposal');
    setReplaceOwnerOldInput('');
    setReplaceOwnerNewInput('');
  };

  const handleChangeRequirementProposal = async () => {
    const requirement = Number(changeRequirementInput);
    if (!Number.isInteger(requirement) || requirement <= 0) {
      alert('Enter a valid required confirmation count');
      return;
    }
    await submitMultisigSelfProposal('changeRequirement', [requirement], 'Change multisig requirement proposal');
  };

  const handleWalletInputChange = (index, value) => {
    const updated = [...walletInputs];
    updated[index] = value;
    setWalletInputs(updated);
  };

  const handleRatioInputChange = (index, value) => {
    const updated = [...ratioInputs];
    updated[index] = value;
    setRatioInputs(updated);
  };

  const applyEqualFounderRatios = () => {
    setRatioInputs(Array(8).fill('1250'));
  };

  const txStage = getStageFromTx(multisigTx);

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const getContentList = () => {
    switch (activeContentTab) {
      case 'announcements':return announcements;
      case 'events':return events;
      case 'socialLinks':return socialLinks;
      case 'resources':return resources;
      default:return [];
    }
  };

  const getContentFields = () => {
    switch (activeContentTab) {
      case 'announcements':
        return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'content', label: 'Content', type: 'textarea', required: true },
        { name: 'date', label: 'Date', type: 'text', placeholder: 'e.g., Jan 15, 2024', required: true },
        { name: 'type', label: 'Type', type: 'select', options: ['info', 'success', 'warning'] },
        { name: 'priority', label: 'Priority', type: 'number' },
        { name: 'isActive', label: 'Active', type: 'checkbox' }];

      case 'events':
        return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'content', label: 'Description', type: 'textarea' },
        { name: 'date', label: 'Date', type: 'text' },
        { name: 'ctaUrl', label: 'CTA URL', type: 'text' },
        { name: 'ctaLabel', label: 'CTA Label', type: 'text' },
        { name: 'isActive', label: 'Active', type: 'checkbox' }];

      case 'socialLinks':
        return [
        { name: 'platform', label: 'Platform', type: 'select', options: ['telegram', 'discord', 'x', 'instagram', 'facebook'] },
        { name: 'href', label: 'URL', type: 'text', required: true },
        { name: 'sortOrder', label: 'Sort Order', type: 'number' },
        { name: 'isActive', label: 'Active', type: 'checkbox' }];

      case 'resources':
        return [
        { name: 'key', label: 'Key', type: 'select', options: ['faq', 'tutorials', 'support', 'docs'] },
        { name: 'label', label: 'Label', type: 'text', required: true },
        { name: 'route', label: 'Route', type: 'text' },
        { name: 'href', label: 'External URL', type: 'text' },
        { name: 'sortOrder', label: 'Sort Order', type: 'number' },
        { name: 'isActive', label: 'Active', type: 'checkbox' }];

      default:return [];
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (!isConnected) {
    return (
      <Container className="admin-shell-premium">
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <h4 className="text-glow" style={{ marginBottom: '16px' }}>{adminT("ui.line1406.walletRequired", "Wallet Required")}</h4>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0' }}>{adminT("ui.line1407.pleaseConnectYourWalletUsingThe", "Please connect your wallet using the \"Connect Wallet\" button in the top navigation bar to access the admin panel.")}</p>
        </div>
      </Container>);

  }

  if (isLoading || !ownerCheckComplete) {
    return (
      <Container className="admin-shell-premium">
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <Spinner animation="grow" variant="info" />
          <p className="mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{adminT("ui.line1418.authorizingAdminAccess", "Authorizing admin access...")}</p>
        </div>
      </Container>);

  }

  if (error) {
    return (
      <Container className="admin-shell-premium">
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <h5 className="text-glow" style={{ marginBottom: '16px' }}>{adminT("ui.line1428.errorLoadingAdminPanel", "Error Loading Admin Panel")}</h5>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
        </div>
      </Container>);

  }

  if (!isOwner) {
    return (
      <Container className="admin-shell-premium">
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <h5 className="text-glow" style={{ marginBottom: '16px' }}>{adminT("ui.line1439.accessDenied", "Access Denied")}</h5>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>{adminT("ui.line1440.thisPanelIsAvailableOnlyTo", "This panel is available only to multisig owners.")}</p>
        </div>
      </Container>);

  }

  return (
    <Container fluid="xl" className="admin-shell-premium">

      {/* Hero Header */}
      <div className="admin-hero-premium">
        <div>
          <h1 className="admin-title-premium">{adminT("ui.line1452.adminPanel", "Admin Panel")}</h1>
          <div className="admin-subtitle">{adminT("ui.line1453.productionGovernanceCockpitForMultisigOwners", "Production governance cockpit for multisig owners")}</div>
        </div>
        <div className="flex-between-premium" style={{ gap: '12px' }}>
          <span className="admin-badge-premium"><Key size={14} /> {shortAddress(account)}</span>
          <span className="admin-badge-premium"><Crown size={14} />{adminT("ui.line1457.multisigOwner", "Multisig Owner")}</span>
          <span className="admin-badge-premium"><BarChart3 size={14} /> {multisigStats.requiredConfirmations}/{ownerList.length || 5}{adminT("ui.line1458.threshold", "Threshold")}</span>
          <span className="admin-badge-premium"><Clock size={14} /> {formatCountdown(Number(multisigStats.timelockDelay || 0))}</span>
        </div>
      </div>

      {/* Command Dock - Tab Navigation */}
      <nav className="command-dock">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')} title={adminT("ui.line1465.dashboard", "Dashboard")}>
          <LayoutDashboard size={20} />
          <span>{adminT("ui.line1467.dashboard", "Dashboard")}</span>
        </button>
        <button className={activeTab === 'queue' ? 'active' : ''} onClick={() => setActiveTab('queue')} title={adminT("ui.line1469.txQueue", "Tx Queue")}>
          <Activity size={20} />
          <span>{adminT("ui.line1471.queue", "Queue")}</span>
        </button>
        <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')} title={adminT("ui.line1473.guardian", "Guardian")}>
          <ShieldCheck size={20} />
          <span>{adminT("ui.line1475.security", "Security")}</span>
        </button>
        <button className={activeTab === 'founders' ? 'active' : ''} onClick={() => setActiveTab('founders')} title={adminT("ui.line1477.founderOps", "Founder Ops")}>
          <Users size={20} />
          <span>{adminT("ui.line1479.founders", "Founders")}</span>
        </button>
        <button className={activeTab === 'community' ? 'active' : ''} onClick={() => setActiveTab('community')} title={adminT("ui.line1481.community", "Community")}>
          <Globe size={20} />
          <span>{adminT("ui.line1483.community", "Community")}</span>
        </button>
        <button className={activeTab === 'multisig' ? 'active' : ''} onClick={() => setActiveTab('multisig')} title={adminT("ui.line1485.multisigSettings", "Multisig Settings")}>
          <Settings size={20} />
          <span>{adminT("ui.line1487.multisig", "Multisig")}</span>
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('admin_tour_preferences');
            window.location.reload();
          }}
          title={adminT("ui.line1495.restartTutorial", "Restart Tutorial")}>

          <HelpCircle size={20} />
          <span>{adminT("ui.line1498.help", "Help")}</span>
        </button>
      </nav>

      {/* Transaction Status Alerts */}
      {txStatus.error &&
      <Alert variant="danger" className="alert-premium" dismissible onClose={() => setErrorTx(null)}>
          <div className="flex-between-premium" style={{ marginBottom: '4px' }}>
            <strong><AlertTriangle size={14} />{adminT("ui.line1506.error", "Error:")}</strong>
          </div>
          {txStatus.error}
        </Alert>
      }

      {txStatus.hash &&
      <Alert variant="info" className="alert-premium">
          <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>{adminT("ui.line1514.tRANSACTIONBROADCAST", "TRANSACTION BROADCAST")}</div>
          {txStatus.note && <div className="mb-2">{txStatus.note}</div>}
          <a href={`${NETWORK_CONFIG.blockExplorerUrls[0]}tx/${txStatus.hash}`} target="_blank" rel="noopener noreferrer" className="text-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {txStatus.hash} <ExternalLink size={12} />
          </a>
        </Alert>
      }

      {/* DYNAMIC MAIN STAGE */}
      <main className="admin-main-stage">

        {/* VIEW: DASHBOARD */}
        {activeTab === 'dashboard' &&
        <section className="fade-in">
            <Row className="g-3 mb-4">
              <Col xl={4}>
                <div className="admin-card-premium">
                  <div className="admin-header-premium" style={{ padding: '10px' }}>
                    <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line1532.governanceModel", "Governance Model")}</div>
                  </div>
                  <div className="admin-body-premium">
                    <div className="guide-step-premium">
                      <strong>{adminT("ui.line1536.1SubmitProposal", "1. Submit proposal")}</strong>
                      <div className="admin-subtitle mt-1">{adminT("ui.line1537.everyAdminChangeBecomesAMultisig", "Every admin change becomes a multisig transaction first.")}</div>
                    </div>
                    <div className="guide-step-premium">
                      <strong>{adminT("ui.line1540.2OwnersApprove", "2. Owners approve")}</strong>
                      <div className="admin-subtitle mt-1">{adminT("ui.line1541.youCurrentlyNeed", "You currently need")}{multisigStats.requiredConfirmations}{adminT("ui.line1541.multisigSignatures", "multisig signatures.")}</div>
                    </div>
                    <div className="guide-step-premium">
                      <strong>{adminT("ui.line1544.3TimelockWaits", "3. Timelock waits")}</strong>
                      <div className="admin-subtitle mt-1">{adminT("ui.line1545.executionStaysBlockedUntilTheDelay", "Execution stays blocked until the delay expires.")}</div>
                    </div>
                    <div className="guide-step-premium mb-0">
                      <strong>{adminT("ui.line1548.4Execute", "4. Execute")}</strong>
                      <div className="admin-subtitle mt-1">{adminT("ui.line1549.anyOwnerCanExecuteOnceApprovals", "Any owner can execute once approvals and timelock are satisfied.")}</div>
                    </div>
                  </div>
                </div>
              </Col>

              <Col xl={8}>
                <div className="admin-card-premium">
                  <div className="admin-header-premium" style={{ padding: '10px' }}>
                    <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line1558.systemStatus", "System Status")}</div>
                  </div>
                  <div className="admin-body-premium">
                    <Row className="g-2">
                      <Col md={6} xl={3}>
                        <div className="metric-box-premium">
                          <div className="metric-label-premium">{adminT("ui.line1564.levelManagerPaused", "LevelManager paused")}</div>
                          <div className="metric-value-premium">
                            <span className={`premium-badge ${systemState.levelManagerPaused ? 'premium-badge-danger' : 'premium-badge-success'}`}>
                              {boolLabel(systemState.levelManagerPaused)}
                            </span>
                          </div>
                        </div>
                      </Col>
                      <Col md={6} xl={3}>
                        <div className="metric-box-premium">
                          <div className="metric-label-premium">{adminT("ui.line1574.guardianPaused", "Guardian paused")}</div>
                          <div className="metric-value-premium">
                            <span className={`premium-badge ${guardianState.paused ? 'premium-badge-danger' : 'premium-badge-success'}`}>
                              {boolLabel(guardianState.paused)}
                            </span>
                          </div>
                        </div>
                      </Col>
                      <Col md={6} xl={3}>
                        <div className="metric-box-premium">
                          <div className="metric-label-premium">{adminT("ui.line1584.globalUpgradeFreeze", "Global upgrade freeze")}</div>
                          <div className="metric-value-premium">
                            <span className={`premium-badge ${guardianState.globalUpgradeFreeze ? 'premium-badge-danger' : 'premium-badge-success'}`}>
                              {boolLabel(guardianState.globalUpgradeFreeze)}
                            </span>
                          </div>
                        </div>
                      </Col>
                      <Col md={6} xl={3}>
                        <div className="metric-box-premium">
                          <div className="metric-label-premium">{adminT("ui.line1594.currentChainTime", "Current chain time")}</div>
                          <div className="metric-value-premium mono">{formatUnix(multisigStats.currentTimestamp)}</div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
            </Row>

            <Row className="g-3 mb-4">
              <Col xl={12}>
                <div className="admin-card-premium admin-financial-truth" style={{ padding: '10px' }}>
                  <div className="admin-header-premium">
                    <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.financialTruth.title", "Indexed Financial Truth")}</div>
                  </div>
                  <div className="admin-body-premium">
                    {financialTruthError && <Alert variant="warning" className="alert-premium">{financialTruthError}</Alert>}
                    <Row className="g-2">
                      <Col md={6} xl={3}>
                        <div className="metric-box-premium">
                          <div className="metric-label-premium">{adminT("ui.financialTruth.totalGenerated", "Total Generated")}</div>
                          <div className="metric-value-premium">${formatMoney(financialTruth.totalGeneratedVolume)}</div>
                        </div>
                      </Col>
                      <Col md={6} xl={3}>
                        <div className="metric-box-premium">
                          <div className="metric-label-premium">{adminT("ui.financialTruth.systemCharge", "10% System Charge")}</div>
                          <div className="metric-value-premium">${formatMoney(financialTruth.systemChargeTotal)}</div>
                        </div>
                      </Col>
                      <Col md={6} xl={3}>
                        <div className="metric-box-premium">
                          <div className="metric-label-premium">{adminT("ui.financialTruth.nftPool", "NFT Reward Pool")}</div>
                          <div className="admin-metric-stack">
                            <span>{adminT("ui.financialTruth.totalInflow", "Total Inflow")}: ${formatMoney(financialTruth.nftRewardPool.totalInflow)}</span>
                            <span>{adminT("ui.financialTruth.totalDistributed", "Total Distributed")}: ${formatMoney(financialTruth.nftRewardPool.totalDistributed)}</span>
                            <span>{adminT("ui.financialTruth.currentBalance", "Current Balance")}: ${formatMoney(financialTruth.nftRewardPool.currentBalance)}</span>
                          </div>
                        </div>
                      </Col>
                      <Col md={6} xl={3}>
                        <div className="metric-box-premium">
                          <div className="metric-label-premium">{adminT("ui.financialTruth.devOperations", "Dev & Operations")}</div>
                          <div className="admin-metric-stack">
                            <span>{adminT("ui.financialTruth.totalInflow", "Total Inflow")}: ${formatMoney(financialTruth.devOperations.totalInflow)}</span>
                            <span>{adminT("ui.financialTruth.totalUtilized", "Total Utilized")}: ${formatMoney(financialTruth.devOperations.totalUtilized)}</span>
                            <span>{adminT("ui.financialTruth.currentBalance", "Current Balance")}: ${formatMoney(financialTruth.devOperations.currentBalance)}</span>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
            </Row>

            <Row className="g-3 mb-4">
              <Col xl={12}>
                <div className="admin-card-premium" style={{ padding: '10px' }}>
                  <div className="admin-header-premium">
                    <div className="header-title" style={{ textAlign: 'center' }}>Operations Vault Disbursement</div>
                  </div>
                  <div className="admin-body-premium">
                    <div className="admin-subtitle mb-3">
                      Submit a multisig proposal to send USDT from the operations vault. Execution still requires the configured approvals and timelock.
                    </div>
                    <div className="soft-panel-premium mb-3">
                      <div className="small-label-premium">Vault</div>
                      <div className="mono" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.68)' }}>
                        {operationsVaultAddress || 'Missing VITE_OPERATIONS_VAULT_ADDRESS'}
                      </div>
                    </div>
                    <Row className="g-2">
                      <Col md={5}>
                        <Form.Control
                          className="input-premium"
                          placeholder="Recipient wallet"
                          value={opsDisbursement.recipient}
                          onChange={(e) => setOpsDisbursement((current) => ({ ...current, recipient: e.target.value }))}
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Control
                          className="input-premium"
                          placeholder="USDT amount"
                          value={opsDisbursement.amount}
                          onChange={(e) => setOpsDisbursement((current) => ({ ...current, amount: e.target.value }))}
                        />
                      </Col>
                      <Col md={4}>
                        <Form.Control
                          className="input-premium"
                          placeholder="Reason"
                          value={opsDisbursement.reason}
                          onChange={(e) => setOpsDisbursement((current) => ({ ...current, reason: e.target.value }))}
                        />
                      </Col>
                    </Row>
                    <div className="d-flex justify-content-end mt-3">
                      <button
                        className="btn-premium"
                        onClick={handleOperationsDisbursementProposal}
                        disabled={txStatus.loading || !operationsVaultAddress}
                      >
                        Submit Operations Proposal
                      </button>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            <Row className="g-3">
              <Col xl={12}>
                <div className="admin-card-premium" style={{ padding: '10px' }}>
                  <div className="admin-header-premium">
                    <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line1608.quickGovernanceActions", "Quick Governance Actions")}</div>
                  </div>
                  <div className="admin-body-premium">
                    <div className="admin-subtitle mb-3">{adminT("ui.line1611.theseActionsSubmitProposalsOnlyThey", "These actions submit proposals only. They do not change live contracts immediately.")}</div>
                    <div className="grid-3-premium">
                      <div className="action-card-premium">
                        <div className="small-label-premium">{adminT("ui.line1614.emergencyControls", "Emergency controls")}</div>
                        <div className="admin-subtitle mb-3">{adminT("ui.line1615.pauseOrUnpauseTheLevelManagerVia", "Pause or unpause the LevelManager via multisig.")}</div>
                        <div className="flex-between-premium" style={{ gap: '8px' }}>
                          <button className="btn-premium btn-premium-sm" onClick={handleSubmitPauseProposal} disabled={txStatus.loading}>{adminT("ui.line1617.submitPause", "Submit pause")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={handleSubmitUnpauseProposal} disabled={txStatus.loading}>{adminT("ui.line1618.submitUnpause", "Submit unpause")}</button>
                        </div>
                      </div>

                      <div className="action-card-premium">
                        <div className="small-label-premium">{adminT("ui.line1623.guardianControls", "Guardian controls")}</div>
                        <div className="admin-subtitle mb-3">{adminT("ui.line1624.freezeUpgradesOrPauseGuardianAdmin", "Freeze upgrades or pause guardian admin actions.")}</div>
                        <div className="flex-between-premium" style={{ flexWrap: 'wrap', gap: '8px' }}>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianFreeze(true)} disabled={txStatus.loading}>{adminT("ui.line1626.freezeUpgrades", "Freeze upgrades")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianFreeze(false)} disabled={txStatus.loading}>{adminT("ui.line1627.unfreezeUpgrades", "Unfreeze upgrades")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianPauseAdmin(true)} disabled={txStatus.loading}>{adminT("ui.line1628.pauseGuardian", "Pause guardian")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleGuardianPauseAdmin(false)} disabled={txStatus.loading}>{adminT("ui.line1629.unpauseGuardian", "Unpause guardian")}</button>
                        </div>
                      </div>

                      <div className="action-card-premium">
                        <div className="small-label-premium">{adminT("ui.line1634.queueRefresh", "Queue refresh")}</div>
                        <div className="admin-subtitle mb-3">{adminT("ui.line1635.reloadMultisigQueueChainTimeApprovals", "Reload multisig queue, chain time, approvals, and system states.")}</div>
                        <button className="btn-premium w-100" onClick={refreshGovernanceData} disabled={txStatus.loading}>
                          <RefreshCw size={14} />{adminT("ui.line1637.refreshCockpit", "Refresh cockpit")}
                      </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </section>
        }

        {/* VIEW: TX QUEUE */}
        {activeTab === 'queue' &&
        <section className="fade-in">
            <Row className="g-3">
              <Col xl={7}>
                <div className="admin-card-premium" style={{ padding: '10px' }}>
                  <div className="admin-header-premium">
                    <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line1655.recentMultisigTransactions", "Recent Multisig Transactions")}</div>
                  </div>
                  <div className="admin-body-premium">
                    <div className="admin-subtitle mb-3">{adminT("ui.line1658.everyProposalAppearsHereWithStatus", "Every proposal appears here with status, votes, countdown, and quick actions.")}</div>
                    <div className="flex-between-premium mb-3" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      <div className="admin-subtitle">
                        Showing active proposals and executed history from the last 7 days.
                      </div>
                      <div className="flex-between-premium" style={{ gap: '6px', flexWrap: 'wrap' }}>
                        <button className="btn-premium btn-premium-sm" onClick={() => setShowExecutedTxs((value) => !value)}>
                          {showExecutedTxs ? 'Hide old executed' : 'Show all executed'}
                        </button>
                        <button className="btn-premium btn-premium-sm" onClick={() => setShowHiddenTxs((value) => !value)}>
                          {showHiddenTxs ? 'Hide hidden' : `Show hidden (${hiddenTxIds.length})`}
                        </button>
                        <button className="btn-premium btn-premium-sm" onClick={handleHideExecutedTxs} disabled={!recentTxs.some((tx) => tx.executed)}>
                          Hide executed
                        </button>
                      </div>
                    </div>
                    <div className="table-responsive admin-queue-table-wrap">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>{adminT("ui.line1663.iD", "ID")}</th>
                            <th>{adminT("ui.line1664.action", "Action")}</th>
                            <th>{adminT("ui.line1665.category", "Category")}</th>
                            <th>{adminT("ui.line1666.stage", "Stage")}</th>
                            <th>{adminT("ui.line1667.votes", "Votes")}</th>
                            <th>{adminT("ui.line1668.timelock", "Timelock")}</th>
                            <th>{adminT("ui.line1669.actions", "Actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRecentTxs.length === 0 &&
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>{adminT("ui.line1674.noTransactionsFound", "No transactions found.")}</td></tr>
                        }
                          {visibleRecentTxs.map((tx) => {
                          const stage = getStageFromTx(tx);
                          const secs = Math.max(Number(tx.executeAfter || 0) - Number(multisigStats.currentTimestamp || 0), 0);
                          const currentOwnerApproval = tx.approvals?.find((a) => a.owner.toLowerCase() === account?.toLowerCase());
                          const hidden = hiddenTxIds.includes(String(tx.txId));
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
                                <td>{tx.executed ? adminT("ui.status.completed", "Completed") : formatCountdown(secs)}</td>
                                <td>
                                  <div className="flex-between-premium" style={{ gap: '6px', flexWrap: 'wrap' }}>
                                    <button className="btn-premium btn-premium-sm" onClick={() => loadMultisigTx(tx.txId)}>{adminT("ui.actions.view", "View")}</button>
                                    <button className="btn-premium btn-premium-sm" onClick={() => handleApproveTx(tx.txId)} disabled={tx.executed || currentOwnerApproval?.approved}>{adminT("ui.actions.approve", "Approve")}</button>
                                    <button className="btn-premium btn-premium-sm" onClick={() => handleRevokeTx(tx.txId)} disabled={tx.executed || !currentOwnerApproval?.approved}>{adminT("ui.actions.revoke", "Revoke")}</button>
                                    <button className="btn-premium btn-premium-sm" onClick={() => handleExecuteTx(tx.txId)} disabled={tx.executed || stage.variant !== 'primary'}>{adminT("ui.actions.execute", "Execute")}</button>
                                    {hidden ?
                                    <button className="btn-premium btn-premium-sm" onClick={() => handleUnhideTx(tx.txId)}>Unhide</button> :
                                    <button className="btn-premium btn-premium-sm" onClick={() => handleHideTx(tx.txId)}>Hide</button>
                                    }
                                  </div>
                                </td>
                              </tr>);

                        })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xl={5}>
                <div className="admin-card-premium">
                  <div className="admin-header-premium" style={{ padding: '10px' }}>
                    <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line1711.selectedTransactionDetails", "Selected Transaction Details")}</div>
                  </div>
                  <div className="admin-body-premium">
                    <div className="admin-subtitle mb-3">{adminT("ui.line1714.loadAnyTransactionToInspectAction", "Load any transaction to inspect action, approvals, target, timelock, and upgrade/guardian checks.")}</div>

                    <Row className="g-2 align-items-end mb-3">
                      <Col md={6}>
                        <Form.Label className="small-label-premium">{adminT("ui.line1718.transactionID", "Transaction ID")}</Form.Label>
                        <Form.Control
                        className="input-premium"
                        type="number"
                        value={txIdInput}
                        onChange={(e) => setTxIdInput(e.target.value)}
                        placeholder={adminT("ui.line1724.eG0", "e.g. 0")} />

                      </Col>
                      <Col md={6}>
                        <div className="flex-between-premium" style={{ gap: '6px' }}>
                          <button className="btn-premium btn-premium-sm" onClick={() => loadMultisigTx()}>{adminT("ui.line1729.load", "Load")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleApproveTx()} disabled={!txIdInput}>{adminT("ui.line1730.approve", "Approve")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleRevokeTx()} disabled={!txIdInput}>{adminT("ui.line1731.revoke", "Revoke")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleExecuteTx()} disabled={!txIdInput}>{adminT("ui.line1732.execute", "Execute")}</button>
                        </div>
                      </Col>
                    </Row>

                    {!multisigTx &&
                  <div className="soft-panel-premium" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>{adminT("ui.line1738.noTransactionSelectedYet", "No transaction selected yet.")}

                  </div>
                  }

                    {multisigTx &&
                  <>
                        <Row className="g-2 mb-3">
                          <Col md={6}>
                            <div className="metric-box-premium">
                              <div className="metric-label-premium">{adminT("ui.line1748.stage", "Stage")}</div>
                              <div className="metric-value-premium">
                                <span className={`premium-badge premium-badge-${txStage.variant === 'success' ? 'success' : txStage.variant === 'warning' ? 'warning' : txStage.variant === 'info' ? 'info' : 'dark'}`}>{txStage.label}</span>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="metric-box-premium">
                              <div className="metric-label-premium">{adminT("ui.line1756.timelockRemaining", "Timelock remaining")}</div>
                              <div className="metric-value-premium">{formatCountdown(remainingSeconds)}</div>
                            </div>
                          </Col>
                        </Row>

                        <div className="mb-3">
                          <div className="small-label-premium mb-2">{adminT("ui.line1763.approvalProgress", "Approval progress")}</div>
                          <div className="premium-progress">
                            <div className="premium-progress-fill" style={{ width: `${approvalPercent}%` }} />
                          </div>
                          <div className="admin-subtitle mt-1">{Math.round(approvalPercent)}%</div>
                        </div>

                        <div className="table-responsive mb-3">
                          <table className="premium-table">
                            <tbody>
                              <tr><th style={{ width: '40%' }}>{adminT("ui.line1773.transactionID", "Transaction ID")}</th><td>{multisigTx.txId}</td></tr>
                              <tr><th>{adminT("ui.line1774.action", "Action")}</th><td>{multisigTx.label}</td></tr>
                              <tr><th>{adminT("ui.line1775.details", "Details")}</th><td>{multisigTx.details}</td></tr>
                              <tr><th>{adminT("ui.line1776.category", "Category")}</th><td>{multisigTx.category}</td></tr>
                              <tr><th>{adminT("ui.line1777.targetLabel", "Target label")}</th><td>{multisigTx.targetLabel}</td></tr>
                              <tr><th>{adminT("ui.line1778.targetAddress", "Target address")}</th><td className="mono">{multisigTx.to}</td></tr>
                              <tr><th>{adminT("ui.line1779.confirmations", "Confirmations")}</th><td>{multisigTx.confirmations} / {multisigStats.requiredConfirmations}</td></tr>
                              <tr><th>{adminT("ui.line1780.executed", "Executed")}</th><td>{String(multisigTx.executed)}</td></tr>
                              <tr><th>{adminT("ui.line1781.submittedAt", "Submitted at")}</th><td>{formatUnix(multisigTx.submittedAt)}</td></tr>
                              <tr><th>{adminT("ui.line1782.executeAfter", "Execute after")}</th><td>{formatUnix(multisigTx.executeAfter)}</td></tr>
                              <tr><th>{adminT("ui.line1783.currentChainTime", "Current chain time")}</th><td>{formatUnix(multisigStats.currentTimestamp)}</td></tr>
                              <tr><th>{adminT("ui.line1784.nativeValue", "Native value")}</th><td>{multisigTx.value}</td></tr>
                              <tr><th>{adminT("ui.line1785.calldata", "Calldata")}</th><td className="mono" style={{ wordBreak: 'break-all', maxWidth: '300px' }}>{multisigTx.data}</td></tr>
                            </tbody>
                          </table>
                        </div>

                        {(multisigTx.implementationAddress || multisigTx.proxyAddress) &&
                    <div className="soft-panel-premium mb-3">
                            <div className="small-label-premium mb-2">{adminT("ui.line1792.upgradeGuardianChecks", "Upgrade / guardian checks")}</div>
                            <div>{adminT("ui.line1793.proxyApproved", "Proxy approved:")}<span className={`premium-badge ${guardianChecks.proxyApproved ? 'premium-badge-success' : 'premium-badge-danger'}`}>{guardianChecks.proxyApproved === null ? adminT("ui.line1793.unknown", "Unknown") : boolLabel(guardianChecks.proxyApproved)}</span></div>
                            <div className="mt-2">{adminT("ui.line1794.implementationApproved", "Implementation approved:")}<span className={`premium-badge ${guardianChecks.implementationApproved ? 'premium-badge-success' : 'premium-badge-danger'}`}>{guardianChecks.implementationApproved === null ? adminT("ui.line1794.unknown", "Unknown") : boolLabel(guardianChecks.implementationApproved)}</span></div>
                          </div>
                    }

                        <div>
                          <div className="small-label-premium mb-2">{adminT("ui.line1799.whoApproved", "Approvers")}</div>
                          <div>
                            {selectedTxApprovals.map((item) =>
                        <span key={item.owner} className="owner-sign-pill-premium">
                                <span className="mono">{shortAddress(item.owner)}</span>
                                <span className={`premium-badge ${item.approved ? 'premium-badge-success' : 'premium-badge-dark'}`}>
                                  {item.approved ? adminT("ui.status.signed", "Signed") : adminT("ui.status.pending", "Pending")}
                                </span>
                              </span>
                        )}
                          </div>
                        </div>
                      </>
                  }
                  </div>
                </div>
              </Col>
            </Row>
          </section>
        }

        {/* VIEW: SECURITY / GUARDIAN */}
        {activeTab === 'security' &&
        <section className="fade-in">
            <div className="admin-card-premium" style={{ padding: '10px' }}>
              <div className="admin-header-premium">
                <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line1825.guardianApprovalsAndUpgradeFlow", "Guardian Approvals and Upgrade Flow")}</div>
              </div>
              <div className="admin-body-premium">
                <Row className="g-3">
                  <Col xl={4}>
                    <div className="action-card-premium">
                      <div className="small-label-premium">{adminT("ui.line1831.approveProxy", "Approve proxy")}</div>
                      <div className="admin-subtitle mb-3">{adminT("ui.line1832.allowOrRevokeAProxyAddress", "Allow or revoke a proxy address in Guardian.")}</div>
                      <Form.Control className="input-premium mb-3" placeholder={adminT("ui.line1833.proxyAddress", "Proxy address")} value={guardianProxyInput} onChange={(e) => setGuardianProxyInput(e.target.value)} />
                      <div className="flex-between-premium" style={{ gap: '8px' }}>
                        <button className="btn-premium w-100" onClick={() => handleGuardianApproveProxy(true)} disabled={txStatus.loading}>{adminT("ui.line1835.approveProxy", "Approve proxy")}</button>
                        <button className="btn-premium w-100" onClick={() => handleGuardianApproveProxy(false)} disabled={txStatus.loading}>{adminT("ui.line1836.revokeProxy", "Revoke proxy")}</button>
                      </div>
                    </div>
                  </Col>
                  <Col xl={4}>
                    <div className="action-card-premium">
                      <div className="small-label-premium">{adminT("ui.line1842.approveImplementation", "Approve implementation")}</div>
                      <div className="admin-subtitle mb-3">{adminT("ui.line1843.allowOrRevokeAnImplementationFor", "Allow or revoke an implementation for a specific proxy.")}</div>
                      <Form.Control className="input-premium mb-2" placeholder={adminT("ui.line1844.proxyAddress", "Proxy address")} value={guardianImplProxyInput} onChange={(e) => setGuardianImplProxyInput(e.target.value)} />
                      <Form.Control className="input-premium mb-3" placeholder={adminT("ui.line1845.implementationAddress", "Implementation address")} value={guardianImplInput} onChange={(e) => setGuardianImplInput(e.target.value)} />
                      <div className="flex-between-premium" style={{ gap: '8px' }}>
                        <button className="btn-premium w-100" onClick={() => handleGuardianApproveImplementation(true)} disabled={txStatus.loading}>{adminT("ui.line1847.approveImpl", "Approve impl")}</button>
                        <button className="btn-premium w-100" onClick={() => handleGuardianApproveImplementation(false)} disabled={txStatus.loading}>{adminT("ui.line1848.revokeImpl", "Revoke impl")}</button>
                      </div>
                    </div>
                  </Col>
                  <Col xl={4}>
                    <div className="action-card-premium">
                      <div className="small-label-premium">{adminT("ui.line1854.submitUpgradeProposal", "Submit upgrade proposal")}</div>
                      <div className="admin-subtitle mb-3">{adminT("ui.line1855.createTheMultisigUpgradeTransactionFor", "Create the multisig upgrade transaction for a proxy after implementation approval.")}</div>
                      <Form.Control className="input-premium mb-2" placeholder={adminT("ui.line1856.proxyAddress", "Proxy address")} value={upgradeProxyInput} onChange={(e) => setUpgradeProxyInput(e.target.value)} />
                      <Form.Control className="input-premium mb-3" placeholder={adminT("ui.line1857.newImplementationAddress", "New implementation address")} value={upgradeImplementationInput} onChange={(e) => setUpgradeImplementationInput(e.target.value)} />
                      <button className="btn-premium w-100" onClick={handleSubmitUpgradeProposal} disabled={txStatus.loading}>{adminT("ui.line1858.submitUpgradeProposal", "Submit upgrade proposal")}</button>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </section>
        }

        {/* VIEW: FOUNDERS */}
        {activeTab === 'founders' &&
        <section className="fade-in">
            <div className="admin-card-premium" style={{ padding: '10px' }}>
              <div className="admin-header-premium">
                <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line1872.founderManagement", "Founder Management")}</div>
                <button className="btn-premium btn-premium-sm" onClick={() => setShowChargeModal(true)}>{adminT("ui.line1873.chargeRouting", "Charge Routing")}</button>
              </div>
              <div className="admin-body-premium">
                <Accordion defaultActiveKey={['0']} alwaysOpen className="premium-accordion">

                  {/* Founder Vault Distribution Viewer */}
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>{adminT("ui.line1880.founderVaultDistribution", "Founder Vault Distribution")}</Accordion.Header>
                    <Accordion.Body>
                      <div className="flex-between-premium mb-3">
                        <div>
                          <div className="small-label-premium">{adminT("ui.line1884.iD1Wallet", "ID1 Wallet")}</div>
                          <div className="mono" style={{ fontSize: '12px' }}>{shortAddress(id1Wallet)}</div>
                        </div>
                        <div>
                          <span className={`premium-badge ${isID1Downline ? 'premium-badge-success' : 'premium-badge-warning'}`}>
                            {isID1Downline ? <Check size={10} /> : <X size={10} />} {isID1Downline ? adminT("ui.line1889.downlineSynced", "Downline Synced") : adminT("ui.line1889.nonID1Node", "Non-ID1 Node")}
                          </span>
                        </div>
                        <button className="btn-premium btn-premium-sm" onClick={fetchFounderPayouts} disabled={founderRefreshing}>
                          <RefreshCw size={12} className={founderRefreshing ? 'spin' : ''} />{adminT("ui.line1893.refresh", "Refresh")}
                      </button>
                      </div>

                      <div className="founder-summary-card">
                        <Row>
                          <Col md={6}>
                            <div className="small-label-premium">{adminT("ui.line1900.totalFounderPayouts", "Total Founder Payouts")}</div>
                            <div className="metric-value-premium" style={{ fontSize: '20px' }}>{totalFounderPayout}{adminT("ui.line1901.uSDT", "USDT")}</div>
                          </Col>
                          <Col md={6}>
                            <div className="small-label-premium">{adminT("ui.line1904.distributionRule", "Distribution Rule")}</div>
                            <div className="admin-subtitle">{adminT("ui.line1905.ratiosDetermineFounderPayoutSplits", "Ratios determine founder payout splits")}</div>
                          </Col>
                        </Row>
                      </div>

                      <div className="table-responsive">
                        <table className="premium-table">
                          <thead>
                            <tr>
                              <th>{adminT("ui.line1914.walletAddress", "Wallet Address")}</th>
                              <th>{adminT("ui.line1915.ratio", "Ratio")}</th>
                              <th>{adminT("ui.line1916.totalPaid", "Total Paid")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {founderWallets.length === 0 ?
                          <tr><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>{adminT("ui.line1921.noFounderWalletsConfigured", "No founder wallets configured.")}</td></tr> :

                          founderWallets.map((wallet, index) =>
                          <tr key={index}>
                                  <td>
                                    <a href={`${NETWORK_CONFIG.blockExplorerUrls[0]}address/${wallet}`} target="_blank" rel="noopener noreferrer" className="text-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span className="mono">{wallet.slice(0, 10)}...{wallet.slice(-8)}</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  </td>
                                  <td>
                                    <span className="premium-badge premium-badge-info">
                                      {(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="fw-bold text-glow">{founderPayouts[wallet] || '0.00'} USDT</td>
                                </tr>
                          )
                          }
                          </tbody>
                        </table>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>

                  {/* Founder wallets and representatives */}
                  <Accordion.Item eventKey="1">
                    <Accordion.Header>{adminT("ui.line1948.updateProportionsRepresentatives", "Update Proportions & Representatives")}</Accordion.Header>
                    <Accordion.Body>
                      <Row className="g-3">
                        <Col xl={6}>
                          <div className="admin-subtitle mb-3">{adminT("ui.line1952.thisCreatesAMultisigProposalTo", "This creates a multisig proposal to update all 8 founder wallets and their ratios.")}</div>
                          <div className="soft-panel-premium mb-3">
                            <div className="small-label-premium mb-2">{adminT("ui.line1954.currentFounderDistribution", "Current founder distribution")}</div>
                            <div className="table-responsive">
                              <table className="premium-table mb-0">
                                <thead>
                                  <tr><th>{adminT("ui.line1958.walletAddress", "Wallet Address")}</th><th>{adminT("ui.line1958.weight", "Weight")}</th></tr>
                                </thead>
                                <tbody>
                                  {founderWallets.map((wallet, index) =>
                                <tr key={index}>
                                      <td className="mono">{wallet.slice(0, 10)}...{wallet.slice(-8)}</td>
                                      <td>{(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%</td>
                                    </tr>
                                )}
                                  {founderWallets.length === 0 &&
                                <tr><td colSpan={2} style={{ color: 'rgba(255,255,255,0.4)' }}>{adminT("ui.line1968.noFounderWalletsConfiguredYet", "No founder wallets configured yet.")}</td></tr>
                                }
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="small-label-premium mb-2">{adminT("ui.line1975.setAllFounderWallets", "Set All Founder Wallets")}</div>
                          <button className="btn-premium btn-premium-sm mb-3" onClick={applyEqualFounderRatios} disabled={txStatus.loading}>Apply Equal Ratios</button>

                          {walletInputs.map((wallet, index) =>
                        <div key={index} className="wallet-grid-premium mb-2">
                              <Form.Control className="input-premium" type="text" placeholder={`Founder ${index + 1} Address`} value={wallet} onChange={(e) => handleWalletInputChange(index, e.target.value)} disabled={txStatus.loading} />
                              <Form.Control className="input-premium" type="number" placeholder={adminT("ui.placeholders.ratio", "Ratio")} value={ratioInputs[index]} onChange={(e) => handleRatioInputChange(index, e.target.value)} disabled={txStatus.loading} />
                            </div>
                        )}

                          <div className="flex-between-premium mt-3">
                            <span className={totalRatio === 10000 ? 'text-glow' : 'text-danger'}>{adminT("ui.line1986.totalRatio", "Total Ratio:")}{totalRatio} / 10000</span>
                            <button className="btn-premium" onClick={handleSetFounderWallets} disabled={txStatus.loading}>{adminT("ui.line1987.submitFounderWalletProposal", "Submit founder wallet proposal")}</button>
                          </div>
                        </Col>

                        <Col xl={6}>
                          <div className="action-card-premium mb-3">
                            <div className="small-label-premium">{adminT("ui.line1993.founderRepresentativeProposal", "Founder representative proposal")}</div>
                            <div className="admin-subtitle mb-3">{adminT("ui.line1994.submitAMultisigProposalToAdd", "Submit a multisig proposal to add a founder representative.")}</div>
                            <div className="flex-between-premium mb-3" style={{ gap: '8px' }}>
                              <Form.Control className="input-premium" placeholder={adminT("ui.line1996.representativeAddress0x", "Representative address (0x...)")} value={repAddress} onChange={(e) => setRepAddress(e.target.value)} />
                            </div>
                            <button className="btn-premium w-100" onClick={handleAddFounderRep} disabled={txStatus.loading || !repAddress}>{adminT("ui.line1999.submitRepresentativeProposal", "Submit representative proposal")}</button>
                          </div>
                        </Col>
                      </Row>
                    </Accordion.Body>
                  </Accordion.Item>

                </Accordion>
              </div>
            </div>
          </section>
        }

        {/* VIEW: COMMUNITY CONTENT */}
        {/* {activeTab === 'community' && (
           <section className="fade-in">
             <div className="admin-card-premium">
               <div className="admin-header-premium">
                 <div className="header-title">Community Content Management</div>
                 <button className="btn-premium btn-premium-sm" onClick={openCreateModal}>
                   <Plus size={12} /> Create New
                 </button>
               </div>
               <div className="admin-body-premium">
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
                         <td><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No items found.</td></tr>
                       ) : (
                         getContentList().map((item) => (
                           <tr key={item._id}>
                             <td>
                               <div className="fw-bold">{item.title || item.label || item.platform || item.key}</div>
                               <div className="admin-subtitle">{item.content?.slice(0, 30) || item.href || item.route}</div>
                             </td>
                             <td>
                               <span className={`premium-badge ${item.isActive ? 'premium-badge-success' : 'premium-badge-dark'}`}>
                                 {item.isActive ? <Eye size={10} /> : <EyeOff size={10} />} {item.isActive ? adminT("ui.status.active", "Active") : adminT("ui.status.inactive", "Inactive")}
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
               </div>
             </div>
           </section>
          )} */

        }

      {/* VIEW: COMMUNITY CONTENT */}
        {activeTab === 'community' &&
        <section className="fade-in">
            <div className="admin-card-premium">
              <div className="admin-header-premium" style={{ padding: '10px' }}>
                <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line2096.communityContentManagement", "Community Content Management")}</div>
                <button className="btn-premium btn-premium-sm" onClick={openCreateModal}>
                  <Plus size={12} />{adminT("ui.line2098.createNew", "Create New")}
              </button>
              </div>
              <div className="admin-body-premium">
                <div className="content-tabs-premium">
                  <button className={`content-tab-premium ${activeContentTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveContentTab('announcements')}>
                    <Megaphone size={12} />{adminT("ui.line2104.announcements", "Announcements")}
                </button>
                  <button className={`content-tab-premium ${activeContentTab === 'events' ? 'active' : ''}`} onClick={() => setActiveContentTab('events')}>
                    <Calendar size={12} />{adminT("ui.line2107.events", "Events")}
                </button>
                  <button className={`content-tab-premium ${activeContentTab === 'socialLinks' ? 'active' : ''}`} onClick={() => setActiveContentTab('socialLinks')}>
                    <Link2 size={12} />{adminT("ui.line2110.socialLinks", "Social Links")}
                </button>
                  <button className={`content-tab-premium ${activeContentTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveContentTab('resources')}>
                    <FileText size={12} />{adminT("ui.line2113.resources", "Resources")}
                </button>
                </div>

                <div className="flex-between-premium mb-3">
                  <div className="admin-subtitle">
                    {contentLoading ? adminT("ui.line2119.loading", "Loading...") : adminT("ui.content.itemsCount", "{{count}} items", { count: getContentList().length })}
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>{adminT("ui.line2127.titleLabel", "Title/Label")}</th>
                        <th>{adminT("ui.line2128.status", "Status")}</th>
                        <th>{adminT("ui.line2129.actions", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentLoading ?
                    <tr>
                          <td colSpan={3} style={{ textAlign: 'center' }}>
                            <Spinner size="sm" />
                          </td>
                        </tr> :
                    getContentList().length === 0 ?
                    <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>{adminT("ui.line2141.noItemsFound", "No items found.")}

                      </td>
                        </tr> :

                    getContentList().map((item) =>
                    <tr key={item._id}>
                            <td>
                              <div className="fw-bold">{item.title || item.label || item.platform || item.key}</div>
                              <div className="admin-subtitle">{item.content?.slice(0, 30) || item.href || item.route}</div>
                            </td>
                            <td>
                              <span className={`premium-badge ${item.isActive ? 'premium-badge-success' : 'premium-badge-dark'}`}>
                                {item.isActive ? <Eye size={10} /> : <EyeOff size={10} />} {item.isActive ? adminT("ui.status.active", "Active") : adminT("ui.status.inactive", "Inactive")}
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
                    )
                    }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        }

        {/* VIEW: MULTISIG SETTINGS */}
        {activeTab === 'multisig' &&
        <section className="fade-in">
            <div className="admin-card-premium" style={{ padding: '10px' }}>
              <div className="admin-header-premium">
                <div className="header-title" style={{ textAlign: 'center' }}>{adminT("ui.line2183.multisigOwnerManagement", "Multisig Owner Management")}</div>
              </div>
              <div className="admin-body-premium">
                <Row className="g-3 mb-4">
                  <Col xl={3}>
                    <div className="action-card-premium">
                      <div className="small-label-premium">{adminT("ui.line2189.addOwner", "Add owner")}</div>
                      <Form.Control className="input-premium mb-3" placeholder={adminT("ui.line2190.newOwnerAddress", "New owner address")} value={addOwnerInput} onChange={(e) => setAddOwnerInput(e.target.value)} />
                      <button className="btn-premium w-100" onClick={handleAddOwnerProposal} disabled={txStatus.loading}>{adminT("ui.line2191.submitAddOwner", "Submit add owner")}</button>
                    </div>
                  </Col>
                  <Col xl={3}>
                    <div className="action-card-premium">
                      <div className="small-label-premium">{adminT("ui.line2196.removeOwner", "Remove owner")}</div>
                      <Form.Control className="input-premium mb-3" placeholder={adminT("ui.line2197.ownerAddress", "Owner address")} value={removeOwnerInput} onChange={(e) => setRemoveOwnerInput(e.target.value)} />
                      <button className="btn-premium w-100" onClick={handleRemoveOwnerProposal} disabled={txStatus.loading}>{adminT("ui.line2198.submitRemoveOwner", "Submit remove owner")}</button>
                    </div>
                  </Col>
                  <Col xl={3}>
                    <div className="action-card-premium">
                      <div className="small-label-premium">{adminT("ui.line2203.replaceOwner", "Replace owner")}</div>
                      <Form.Control className="input-premium mb-2" placeholder={adminT("ui.line2204.oldOwner", "Old owner")} value={replaceOwnerOldInput} onChange={(e) => setReplaceOwnerOldInput(e.target.value)} />
                      <Form.Control className="input-premium mb-3" placeholder={adminT("ui.line2205.newOwner", "New owner")} value={replaceOwnerNewInput} onChange={(e) => setReplaceOwnerNewInput(e.target.value)} />
                      <button className="btn-premium w-100" onClick={handleReplaceOwnerProposal} disabled={txStatus.loading}>{adminT("ui.line2206.submitReplaceOwner", "Submit replace owner")}</button>
                    </div>
                  </Col>
                  <Col xl={3}>
                    <div className="action-card-premium">
                      <div className="small-label-premium">{adminT("ui.line2211.changeRequirement", "Change requirement")}</div>
                      <Form.Control className="input-premium mb-3" type="number" placeholder={adminT("ui.line2212.requiredConfirmations", "Required confirmations")} value={changeRequirementInput} onChange={(e) => setChangeRequirementInput(e.target.value)} />
                      <button className="btn-premium w-100" onClick={handleChangeRequirementProposal} disabled={txStatus.loading}>{adminT("ui.line2213.submitRequirementChange", "Submit requirement change")}</button>
                    </div>
                  </Col>
                </Row>

                <div className="soft-panel-premium">
                  <div className="small-label-premium mb-2">{adminT("ui.line2219.currentMultisigOwners", "Current multisig owners")}</div>
                  <div>
                    {ownerList.map((owner) =>
                  <span key={owner} className="owner-sign-pill-premium">
                        <span className="mono">{shortAddress(owner)}</span>
                        <span className="premium-badge premium-badge-info">{adminT("ui.labels.owner", "Owner")}</span>
                      </span>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        }

      </main>

      {/* Content Modal */}
      {/* <Modal show={showContentModal} onHide={() => setShowContentModal(false)} centered className="premium-modal">
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
                   <option value="">{adminT("ui.actions.select", "Select...")}</option>
                   {field.options.map((opt) => (
                     <option key={opt} value={opt}>{opt}</option>
                   ))}
                 </Form.Select>
               ) : field.type === 'checkbox' ? (
                 <Form.Check
                   type="checkbox"
                   label={adminT("ui.labels.active", "Active")}
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
        </Modal> */}

      {/* Content Modal - IMPROVED VERSION */}
      {/* <Modal
         show={showContentModal}
         onHide={() => setShowContentModal(false)}
         centered
         className="premium-modal"
         backdrop="static"
         keyboard={true}
         enforceFocus={true}
         container={document.body}
        >
         <Modal.Header closeButton>
           <Modal.Title>
             {editingItem ? 'Edit' : 'Create'} {activeContentTab.slice(0, -1)}
           </Modal.Title>
         </Modal.Header>
         <Modal.Body>
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
                   <option value="">{adminT("ui.actions.select", "Select...")}</option>
                   {field.options.map((opt) => (
                     <option key={opt} value={opt}>{opt}</option>
                   ))}
                 </Form.Select>
               ) : field.type === 'checkbox' ? (
                 <Form.Check
                   type="checkbox"
                   label={adminT("ui.labels.active", "Active")}
                   checked={formData[field.name] || false}
                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                   style={{ color: 'var(--text-primary)' }}
                 />
               ) : (
                 <Form.Control
                   type={field.type}
                   className="input-premium"
                   value={formData[field.name] || ''}
                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                   required={field.required}
                   placeholder={field.placeholder}
                 />
               )}
             </Form.Group>
           ))}
         </Modal.Body>
         <Modal.Footer>
           <button className="btn-premium-secondary" onClick={() => setShowContentModal(false)}>
             Cancel
           </button>
           <button className="btn-premium" onClick={editingItem ? handleUpdateContent : handleCreateContent}>
             {editingItem ? 'Update' : 'Create'}
           </button>
         </Modal.Footer>
        </Modal> */}

      {/* Content Modal - SIMPLIFIED WORKING VERSION */}
      {/* <Modal
         show={showContentModal}
         onHide={() => setShowContentModal(false)}
         centered
         size="lg"
        >
         <Modal.Header closeButton>
           <Modal.Title>
             {editingItem ? 'Edit' : 'Create'} {activeContentTab.slice(0, -1)}
           </Modal.Title>
         </Modal.Header>
         <Modal.Body>
           {getContentFields().map((field) => (
             <Form.Group key={field.name} className="mb-3">
               <Form.Label>{field.label}</Form.Label>
               {field.type === 'textarea' ? (
                 <Form.Control
                   as="textarea"
                   rows={3}
                   value={formData[field.name] || ''}
                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                   required={field.required}
                 />
               ) : field.type === 'select' ? (
                 <Form.Select
                   value={formData[field.name] || ''}
                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                 >
                   <option value="">{adminT("ui.actions.select", "Select...")}</option>
                   {field.options.map((opt) => (
                     <option key={opt} value={opt}>{opt}</option>
                   ))}
                 </Form.Select>
               ) : field.type === 'checkbox' ? (
                 <Form.Check
                   type="checkbox"
                   label={adminT("ui.labels.active", "Active")}
                   checked={formData[field.name] || false}
                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                 />
               ) : (
                 <Form.Control
                   type={field.type}
                   value={formData[field.name] || ''}
                   onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                   required={field.required}
                   placeholder={field.placeholder}
                 />
               )}
             </Form.Group>
           ))}
         </Modal.Body>
         <Modal.Footer>
           <Button variant="secondary" onClick={() => setShowContentModal(false)}>
             Cancel
           </Button>
           <Button variant="primary" onClick={editingItem ? handleUpdateContent : handleCreateContent}>
             {editingItem ? 'Update' : 'Create'}
           </Button>
         </Modal.Footer>
        </Modal> */}

          {/* Content Modal - Using same working pattern as Charge Modal */}
      {showContentModal &&
      <div className="custom-modal-overlay" onClick={() => setShowContentModal(false)}>
          <div className="custom-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-header">
              {editingItem ? <Edit size={18} /> : <Plus size={18} />}
              <span>{editingItem ? adminT("ui.line2435.edit", "Edit") : adminT("ui.line2435.create", "Create")} {activeContentTab.slice(0, -1)}</span>
              <button
              className="custom-modal-close"
              onClick={() => setShowContentModal(false)}>

                ×
              </button>
            </div>

            <div className="custom-modal-body">
              {getContentFields().map((field) =>
            <Form.Group key={field.name} className="mb-3">
                  <Form.Label className="small-label-premium">{field.label}</Form.Label>
                  {field.type === 'textarea' ?
              <Form.Control
                as="textarea"
                rows={3}
                className="input-premium"
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                required={field.required} /> :

              field.type === 'select' ?
              <Form.Select
                className="input-premium"
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}>

                      <option value="">{adminT("ui.actions.select", "Select...")}</option>
                      {field.options.map((opt) =>
                <option key={opt} value={opt}>{opt}</option>
                )}
                    </Form.Select> :
              field.type === 'checkbox' ?
              <Form.Check
                type="checkbox"
                label={adminT("ui.labels.active", "Active")}
                checked={formData[field.name] || false}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })} /> :


              <Form.Control
                type={field.type}
                className="input-premium"
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                required={field.required}
                placeholder={field.placeholder} />

              }
                </Form.Group>
            )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                className="btn-premium-secondary"
                onClick={() => setShowContentModal(false)}>{adminT("ui.line2492.cancel", "Cancel")}


              </button>
                <button
                className="btn-premium"
                onClick={editingItem ? handleUpdateContent : handleCreateContent}>

                  {editingItem ? adminT("ui.line2499.update", "Update") : adminT("ui.line2499.create", "Create")}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      {/* CUSTOM CHARGE ROUTING MODAL */}
      {showChargeModal &&
      <div className="custom-modal-overlay" onClick={() => {
        setShowChargeModal(false);
        setTxStatus({ loading: false, hash: null, error: null, note: null });
      }}>
          <div className="custom-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-header">
              <Wallet size={18} style={{ marginRight: '8px', display: 'inline' }} />
              <span>{adminT("ui.line2516.configureNFTOperationsWallets", "Configure NFT & Operations Wallets")}</span>
              <button
              className="custom-modal-close"
              onClick={() => {
                setShowChargeModal(false);
                setTxStatus({ loading: false, hash: null, error: null, note: null });
              }}>

                ×
              </button>
            </div>

            <div className="custom-modal-body">
              <div className="admin-subtitle" style={{ marginBottom: '20px' }}>{adminT("ui.line2529.submitAGovernanceProposalToUpdate", "Submit a governance proposal to update the charge recipients for the LevelManager contract. This will require multisig approval and timelock execution.")}


            </div>

              <Form.Group className="mb-4">
                <Form.Label className="small-label-premium">{adminT("ui.line2535.nFTPoolAddress", "NFT Pool Address")}</Form.Label>
                <Form.Control
                className="input-premium"
                type="text"
                placeholder="0x..."
                value={nftPool}
                onChange={(e) => setNftPool(e.target.value)} />

                <div className="admin-subtitle mt-1">{adminT("ui.line2543.addressThatReceivesNFTRelatedFunds", "Address that receives NFT-related funds")}</div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small-label-premium">{adminT("ui.line2547.operationsWalletAddress", "Operations Wallet Address")}</Form.Label>
                <Form.Control
                className="input-premium"
                type="text"
                placeholder="0x..."
                value={opsWallet}
                onChange={(e) => setOpsWallet(e.target.value)} />

                <div className="admin-subtitle mt-1">{adminT("ui.line2555.addressThatReceivesOperationalFunds", "Address that receives operational funds")}</div>
              </Form.Group>

              <div className="soft-panel-premium" style={{ marginBottom: '20px' }}>
                <div className="small-label-premium mb-2">{adminT("ui.line2559.currentConfiguration", "Current Configuration")}</div>
                <div className="mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  <div>{adminT("ui.line2561.nFTPool", "NFT Pool:")}{nftPool ? shortAddress(nftPool) : adminT("ui.line2561.notSet", "Not set")}</div>
                  <div className="mt-1">{adminT("ui.line2562.operations", "Operations:")}{opsWallet ? shortAddress(opsWallet) : adminT("ui.line2562.notSet", "Not set")}</div>
                  <div className="mt-1">NFT Vault: {nftPoolVaultAddress ? shortAddress(nftPoolVaultAddress) : 'Missing env'}</div>
                  <div className="mt-1">Operations Vault: {operationsVaultAddress ? shortAddress(operationsVaultAddress) : 'Missing env'}</div>
                </div>
              </div>

              <div className="soft-panel-premium" style={{ marginBottom: '20px' }}>
                <div className="small-label-premium mb-2">Operations Vault Disbursement</div>
                <Row className="g-2">
                  <Col md={5}>
                    <Form.Control className="input-premium" placeholder="Recipient wallet" value={opsDisbursement.recipient} onChange={(e) => setOpsDisbursement((current) => ({ ...current, recipient: e.target.value }))} />
                  </Col>
                  <Col md={3}>
                    <Form.Control className="input-premium" placeholder="USDT amount" value={opsDisbursement.amount} onChange={(e) => setOpsDisbursement((current) => ({ ...current, amount: e.target.value }))} />
                  </Col>
                  <Col md={4}>
                    <Form.Control className="input-premium" placeholder="Reason" value={opsDisbursement.reason} onChange={(e) => setOpsDisbursement((current) => ({ ...current, reason: e.target.value }))} />
                  </Col>
                </Row>
                <button className="btn-premium mt-3" onClick={handleOperationsDisbursementProposal} disabled={txStatus.loading || !operationsVaultAddress}>
                  Submit Operations Proposal
                </button>
              </div>

              <div className="soft-panel-premium" style={{ marginBottom: '20px' }}>
                <div className="small-label-premium mb-2">NFT Pool Future Distribution</div>
                <Row className="g-2">
                  <Col md={4}>
                    <Form.Control className="input-premium" placeholder="Distribution ID or label" value={nftDistribution.distributionId} onChange={(e) => setNftDistribution((current) => ({ ...current, distributionId: e.target.value }))} />
                  </Col>
                  <Col md={4}>
                    <Form.Control className="input-premium" placeholder="Merkle root" value={nftDistribution.merkleRoot} onChange={(e) => setNftDistribution((current) => ({ ...current, merkleRoot: e.target.value }))} />
                  </Col>
                  <Col md={4}>
                    <Form.Control className="input-premium" placeholder="Metadata URI" value={nftDistribution.metadataURI} onChange={(e) => setNftDistribution((current) => ({ ...current, metadataURI: e.target.value }))} />
                  </Col>
                  <Col md={4}>
                    <Form.Control className="input-premium" placeholder="Recipient wallet" value={nftDistribution.recipient} onChange={(e) => setNftDistribution((current) => ({ ...current, recipient: e.target.value }))} />
                  </Col>
                  <Col md={3}>
                    <Form.Control className="input-premium" placeholder="USDT amount" value={nftDistribution.amount} onChange={(e) => setNftDistribution((current) => ({ ...current, amount: e.target.value }))} />
                  </Col>
                  <Col md={5}>
                    <Form.Control className="input-premium" placeholder="Reason" value={nftDistribution.reason} onChange={(e) => setNftDistribution((current) => ({ ...current, reason: e.target.value }))} />
                  </Col>
                </Row>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button className="btn-premium-secondary" onClick={handleNFTDistributionRootProposal} disabled={txStatus.loading || !nftPoolVaultAddress}>
                    Submit Root Proposal
                  </button>
                  <button className="btn-premium" onClick={handleNFTDistributionProposal} disabled={txStatus.loading || !nftPoolVaultAddress}>
                    Submit Distribution Proposal
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                className="btn-premium-secondary"
                onClick={() => {
                  setNftPool(nftPoolVaultAddress);
                  setOpsWallet(operationsVaultAddress);
                }}
                disabled={txStatus.loading || !nftPoolVaultAddress || !operationsVaultAddress}>

                  <RefreshCw size={14} />Use Env Vaults
              </button>
                <button
                className="btn-premium"
                onClick={async () => {
                  await handleUpdateChargeRecipients();
                  if (!txStatus.error) {
                    setShowChargeModal(false);
                  }
                }}
                disabled={txStatus.loading || !nftPool || !opsWallet}>{adminT("ui.line2589.submitChargeRoutingProposal", "Submit Charge Routing Proposal")}


              </button>
              </div>

              {txStatus.loading &&
            <div className="mt-3 text-center">
                  <Spinner size="sm" />{adminT("ui.line2596.submittingProposal", "Submitting proposal...")}
            </div>
            }
            </div>
          </div>
        </div>
      }

      {/* Floating Action Button */}
      <button
        type="button"
        className="fab-premium"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowChargeModal(true);
        }}
        aria-label={adminT("ui.line2613.configureNFTAndOperationsWallets", "Configure NFT and Operations Wallets")}
        title={adminT("ui.line2614.configureNFTOperationsWallets", "Configure NFT & Operations Wallets")}>

        <Wallet size={24} />
      </button>
            {/* Guided Tour System */}
      <TourManager
        isOwner={isOwner}
        activeTab={activeTab}
        setActiveTab={setActiveTab} />

    </Container>);

};

export default AdminPanel;
