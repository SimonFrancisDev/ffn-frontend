import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
const MULTISIG_DEFAULT_SCAN_LIMIT = 15;
const GAS_BUFFER_BPS = 12000n;
const GAS_BUFFER_DENOMINATOR = 10000n;

const withGasBuffer = (estimate) => {
  try {
    return (BigInt(estimate) * GAS_BUFFER_BPS) / GAS_BUFFER_DENOMINATOR;
  } catch {
    return estimate;
  }
};

const sameAddress = (a, b) => Boolean(a && b && String(a).toLowerCase() === String(b).toLowerCase());

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
'function changeRequirement(uint256 _requiredConfirmations)',
'function setProposalSubmitter(address submitter,bool allowed)']
);

const operationsVaultIface = new ethers.Interface([
'function disburse(address recipient,uint256 amount,string reason)']
);

const nftPoolVaultIface = new ethers.Interface([
'function setDistributionRoot(bytes32 distributionId,bytes32 merkleRoot,string metadataURI,string reason)',
'function distribute(address recipient,uint256 amount,bytes32 distributionId,string reason)']
);

const migrationOwnableIface = new ethers.Interface([
'function transferOwnership(address newOwner)',
'function acceptOwnership()',
'function owner() view returns (address)',
'function pendingOwner() view returns (address)']
);

const migrationMultisigAbi = [
'function isOwner(address account) view returns (bool)',
'function getOwners() view returns (address[])',
'function requiredConfirmations() view returns (uint256)',
'function approved(uint256 txId,address owner) view returns (bool)',
'function transactions(uint256 txId) view returns (address to,uint256 value,bytes data,bool executed,bool cancelled,uint256 confirmations,uint256 submittedAt,uint256 executeAfter)',
'function approveTransaction(uint256 txId)',
'function executeTransaction(uint256 txId)',
'function submitTransaction(address to,uint256 value,bytes data) returns (uint256)',
'event Submit(uint256 indexed txId)'
];

const PRODUCTION_OLD_MULTISIG = '0xCE38722a72c9099D9237897E18B0cfb6D51c4470';
const PRODUCTION_NEW_MULTISIG = '0x785cC854ce9e13CE1140cbFD7C08620713E1711d';
const PRODUCTION_ID1_WALLET = PRODUCTION_OLD_MULTISIG;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const GOVERNANCE_MIGRATION_CONTRACTS = [
  { key: 'guardian', name: 'Guardian', address: '0x290c2300296379BD0048aFe9099Ed6Fc81BF75fC', twoStep: false },
  { key: 'levelManager', name: 'LevelManager', address: '0x0E9De0F24eB4774834A2c4A63eaBa8356A4A4B53', twoStep: false },
  { key: 'registration', name: 'Registration', address: '0x02ECA97e944Ac66b0444fd5F61A716917E83CfF5', twoStep: false },
  { key: 'escrow', name: 'Escrow', address: '0x8b3db2AC7e30749479f2dbad14105C8eD4a377d4', twoStep: false },
  { key: 'p4', name: 'P4Orbit', address: '0x1ED0b443c880Ba88F732c3F5915561A07B21F6B4', twoStep: false },
  { key: 'p12', name: 'P12Orbit', address: '0xCF998d8f7E9DD4f3FacFbA45e656dE07142f824b', twoStep: false },
  { key: 'p39', name: 'P39Orbit', address: '0xEaD39819B8C4DBb0669320542B6B847D4c31b8Fb', twoStep: false },
  { key: 'fgt', name: 'FGTToken', address: '0x615201edaddB5CFD839Cc4eE693Dc464F6E2B5E4', twoStep: false },
  { key: 'fgtr', name: 'FGTrToken', address: '0xAaD41296b6Ec358b9C16dD7161C555fD3a464Bc3', twoStep: false },
  { key: 'controller', name: 'FreedomTokenController', address: '0x2Ee32EDfE1990408FE70bcADBDBDA8c2f9AdBb62', twoStep: false },
  { key: 'nftVault', name: 'NFTPoolVault', address: '0xf8F60Da42681b73DFeCa7731E78b29C8707C184b', twoStep: true },
  { key: 'opsVault', name: 'OperationsVault', address: '0x3ee9B4913e175c15B2Ef76Ac352B6737210248Fb', twoStep: true },
];

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
  description: "This sidebar gives you access to all 7 sections of the admin panel. Click any button to switch between Dashboard, Queue, Security, Founders, Community, Multisig controls, and Migration.",
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
  const [isProposalSubmitter, setIsProposalSubmitter] = useState(false);
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
  const [migrationRows, setMigrationRows] = useState({});
  const [migrationAuthority, setMigrationAuthority] = useState({
    oldMultisigOwner: false,
    newMultisigOwner: false
  });
  const [migrationId1State, setMigrationId1State] = useState({
    levelManager: '',
    registration: '',
    safe: false
  });
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationTxIds, setMigrationTxIds] = useState({});
  const [migrationAcceptTxIdInput, setMigrationAcceptTxIdInput] = useState('');
  const [migrationAcceptTx, setMigrationAcceptTx] = useState(null);
  const [migrationAcceptApprovals, setMigrationAcceptApprovals] = useState([]);
  const txActionInFlightRef = useRef(false);

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
    return recentTxs.filter((tx) => {
      const txId = String(tx.txId);
      const hidden = hiddenTxIds.includes(txId);
      if (hidden && !showHiddenTxs) return false;

      const executed = Boolean(tx.executed);
      if (executed && !showExecutedTxs) return false;

      return true;
    });
  }, [hiddenTxIds, recentTxs, showExecutedTxs, showHiddenTxs]);

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
    { iface: nftPoolVaultIface, name: 'NFTPoolVault' },
    { iface: migrationOwnableIface, name: 'Ownable' }];


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
              return { label: 'Batch implementation approvals', details: `Proxy ${shortAddress(args[0])} • ${args[1]?.length || 0} implementation(s) • ${boolLabel(args[2])}`, category: 'Guardian', targetLabel: 'Guardian', proxyAddress: args[0], implementationAddresses: Array.from(args[1] || []) };
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

        if (entry.name === 'Ownable') {
          switch (name) {
            case 'transferOwnership':
              return { label: 'Transfer ownership', details: `New owner ${shortAddress(args[0])}`, category: 'Governance Migration', targetLabel: 'Ownable Contract' };
            case 'acceptOwnership':
              return { label: 'Accept ownership', details: 'Finalize two-step ownership transfer', category: 'Governance Migration', targetLabel: 'Ownable Contract' };
            default:
              return { label: name, details: JSON.stringify(args), category: 'Governance Migration', targetLabel: 'Ownable Contract' };
          }
        }
      } catch {

        // continue
      }}

    return { label: 'Unknown action', details: tx.data, category: 'Unknown', targetLabel: shortAddress(tx.to) };
  }, []);

  const readTransaction = useCallback(async (txId, options = {}) => {
    if (!contracts?.simpleMultiSig) return null;
    const {
      approvalMode = 'current',
      ownersOverride = ownerList
    } = options;
    const tx = await contracts.simpleMultiSig.transactions(Number(txId));

    let approvals = [];
    if (approvalMode === 'all' && ownersOverride.length > 0) {
      approvals = await Promise.all(ownersOverride.map(async (owner) => ({
        owner,
        approved: await contracts.simpleMultiSig.approved(Number(txId), owner)
      })));
    } else if (approvalMode === 'current' && account) {
      approvals = [{
        owner: account,
        approved: await contracts.simpleMultiSig.approved(Number(txId), account)
      }];
    }

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
  }, [contracts, ownerList, account, decodeTransactionAction]);

  const readMigrationAcceptTransaction = useCallback(async (txId) => {
    if (txId === null || txId === undefined || txId === '') return null;

    const provider = contracts?.levelManager?.runner?.provider || web3Service.getReadProvider();
    const multisig = new ethers.Contract(PRODUCTION_NEW_MULTISIG, migrationMultisigAbi, provider);
    const [tx, owners] = await Promise.all([
      multisig.transactions(Number(txId)),
      multisig.getOwners()
    ]);

    const approvals = await Promise.all(owners.map(async (owner) => ({
      owner,
      approved: await multisig.approved(Number(txId), owner).catch(() => false)
    })));

    const raw = {
      txId: Number(txId),
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data,
      executed: tx.executed,
      cancelled: tx.cancelled,
      confirmations: tx.confirmations.toString(),
      submittedAt: tx.submittedAt.toString(),
      executeAfter: tx.executeAfter.toString(),
      approvals
    };

    return {
      ...raw,
      ...decodeTransactionAction(raw)
    };
  }, [contracts, decodeTransactionAction]);

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
      const submitterMatch = contracts.simpleMultiSig?.isProposalSubmitter
        ? await contracts.simpleMultiSig.isProposalSubmitter(account).catch(() => false)
        : false;
      setIsOwner(ownerMatch);
      setIsProposalSubmitter(submitterMatch);

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

      if ((ownerMatch || submitterMatch) && contracts.levelManager) {
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
      const start = Math.max(0, count - MULTISIG_DEFAULT_SCAN_LIMIT);
      const ids = [];
      for (let i = count - 1; i >= start; i -= 1) ids.push(i);

      const txs = await Promise.all(ids.map((id) => readTransaction(id, {
        approvalMode: 'current',
        ownersOverride: owners
      })));
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
        const fresh = await readTransaction(multisigTx.txId, {
          approvalMode: 'all',
          ownersOverride: owners
        });
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
    const interval = setInterval(() => {
      setMultisigStats((prev) => ({
        ...prev,
        currentTimestamp: Number(prev.currentTimestamp || Math.floor(Date.now() / 1000)) + 1
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getWriteContracts = async () => {
    const { writeContracts } = await web3Service.initWallet({ requestAccounts: false });
    return writeContracts;
  };

  const setLoadingTx = (hash = null, note = null) => {
    setTxStatus({ loading: true, hash, error: null, note });
    if (hash) toast.info(note || adminT('toast.transactionSubmitted', 'Transaction submitted.'), { dedupeKey: `admin-tx-submitted-${hash}` });
  };
  const setCheckingTx = (note = 'Checking transaction...') => {
    setTxStatus({ loading: true, hash: null, error: null, note });
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
      ensureActionIdle();
      setCheckingTx(`Checking proposal: ${note}`);
      if (!isOwner) {
        if (!isProposalSubmitter) {
          throw new Error('This wallet is not authorized to submit governance proposals.');
        }

        const selector = String(data || '').slice(0, 10).toLowerCase();
        const allowedGuardianSelectors = [
          guardianIface.getFunction('setApprovedProxy').selector.toLowerCase(),
          guardianIface.getFunction('setApprovedImplementation').selector.toLowerCase(),
          guardianIface.getFunction('batchSetApprovedImplementations').selector.toLowerCase(),
        ];
        const allowedUpgradeSelectors = [
          levelManagerAdminIface.getFunction('upgradeToAndCall').selector.toLowerCase(),
          levelManagerAdminIface.getFunction('upgradeTo').selector.toLowerCase(),
        ];
        const isGuardianUpgradeProposal =
          guardianAddress &&
          target?.toLowerCase?.() === guardianAddress.toLowerCase() &&
          allowedGuardianSelectors.includes(selector);
        const isProxyUpgradeProposal =
          target &&
          ethers.isAddress(target) &&
          allowedUpgradeSelectors.includes(selector);

        if (!isGuardianUpgradeProposal && !isProxyUpgradeProposal) {
          throw new Error('Proposal submitters can submit upgrade-related proposals only.');
        }
      }
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
    } finally {
      releaseActionLock();
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

  const parseSubmitTxId = (receipt, contract) => {
    for (const log of receipt?.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'Submit') return parsed.args?.txId?.toString?.() || String(parsed.args?.[0]);
      } catch {
        // Ignore logs emitted by target contracts.
      }
    }
    return '';
  };

  const refreshMigrationStatus = useCallback(async () => {
    if (!contracts?.levelManager || !account) return;

    setMigrationLoading(true);
    try {
      const provider = contracts.levelManager.runner?.provider || web3Service.getReadProvider();
      const oldMultisig = new ethers.Contract(PRODUCTION_OLD_MULTISIG, migrationMultisigAbi, provider);
      const newMultisig = new ethers.Contract(PRODUCTION_NEW_MULTISIG, migrationMultisigAbi, provider);

      const [
        oldMultisigOwner,
        newMultisigOwner,
        levelManagerId1,
        registrationId1
      ] = await Promise.all([
        oldMultisig.isOwner(account).catch(() => false),
        newMultisig.isOwner(account).catch(() => false),
        contracts.levelManager.id1Wallet().catch(() => ''),
        contracts.registration?.id1Wallet ? contracts.registration.id1Wallet().catch(() => '') : Promise.resolve('')
      ]);

      const id1Safe =
        sameAddress(levelManagerId1, PRODUCTION_ID1_WALLET) &&
        (!registrationId1 || sameAddress(registrationId1, PRODUCTION_ID1_WALLET));

      setMigrationAuthority({ oldMultisigOwner, newMultisigOwner });
      setMigrationId1State({
        levelManager: levelManagerId1,
        registration: registrationId1,
        safe: id1Safe
      });

      const rows = {};
      await Promise.all(GOVERNANCE_MIGRATION_CONTRACTS.map(async (item) => {
        const ownable = new ethers.Contract(item.address, migrationOwnableIface, provider);
        try {
          const [owner, pendingOwner] = await Promise.all([
            ownable.owner(),
            ownable.pendingOwner().catch(() => ZERO_ADDRESS)
          ]);
          rows[item.key] = { owner, pendingOwner, error: '' };
        } catch (err) {
          rows[item.key] = { owner: '', pendingOwner: '', error: err?.shortMessage || err?.message || 'Read failed' };
        }
      }));

      setMigrationRows(rows);
    } finally {
      setMigrationLoading(false);
    }
  }, [contracts, account]);

  const getMigrationRowState = useCallback((item) => {
    const row = migrationRows[item.key] || {};
    if (row.error) {
      return { label: 'Read failed', variant: 'danger', canTransfer: false, canAccept: false };
    }

    const owner = row.owner || '';
    const pendingOwner = row.pendingOwner || ZERO_ADDRESS;
    const ownerIsOld = sameAddress(owner, PRODUCTION_OLD_MULTISIG);
    const ownerIsNew = sameAddress(owner, PRODUCTION_NEW_MULTISIG);
    const pendingIsEmpty = !pendingOwner || sameAddress(pendingOwner, ZERO_ADDRESS);
    const pendingIsNew = sameAddress(pendingOwner, PRODUCTION_NEW_MULTISIG);
    const id1Safe = migrationId1State.safe;

    if (!owner) {
      return { label: 'Not loaded', variant: 'secondary', canTransfer: false, canAccept: false };
    }
    if (ownerIsNew) {
      return { label: 'Migrated', variant: 'success', canTransfer: false, canAccept: false };
    }
    if (!ownerIsOld) {
      return { label: 'Unexpected owner', variant: 'danger', canTransfer: false, canAccept: false };
    }
    if (!id1Safe) {
      return { label: 'Blocked: ID1 check failed', variant: 'danger', canTransfer: false, canAccept: false };
    }
    if (item.twoStep && pendingIsNew) {
      return {
        label: 'Accept required',
        variant: 'warning',
        canTransfer: false,
        canAccept: migrationAuthority.newMultisigOwner
      };
    }
    if (item.twoStep && !pendingIsEmpty) {
      return { label: 'Unexpected pending owner', variant: 'danger', canTransfer: false, canAccept: false };
    }

    return {
      label: 'Ready for transfer proposal',
      variant: 'primary',
      canTransfer: migrationAuthority.oldMultisigOwner,
      canAccept: false
    };
  }, [migrationAuthority.newMultisigOwner, migrationAuthority.oldMultisigOwner, migrationId1State.safe, migrationRows]);

  const submitMigrationProposal = async (item, mode) => {
    const state = getMigrationRowState(item);
    const row = migrationRows[item.key] || {};
    const isAccept = mode === 'accept';
    const note = isAccept ? `Submit ${item.name} accept-ownership proposal` : `Submit ${item.name} ownership-transfer proposal`;

    try {
      ensureActionIdle();
      setCheckingTx(`Checking migration: ${item.name}`);

      if (!migrationId1State.safe) {
        throw new Error('Migration is blocked because the ID1 wallet check failed. This tool will not run while ID1 is unsafe.');
      }
      if (isAccept && !state.canAccept) {
        throw new Error('Connect a new multisig owner wallet to submit this accept-ownership proposal.');
      }
      if (!isAccept && !state.canTransfer) {
        throw new Error('Connect a current multisig owner wallet to submit this ownership-transfer proposal.');
      }

      await web3Service.initWallet({ requestAccounts: false });
      const signer = web3Service.getSigner();
      if (!signer) throw new Error('Wallet signer is unavailable.');

      const multisigAddressForMode = isAccept ? PRODUCTION_NEW_MULTISIG : PRODUCTION_OLD_MULTISIG;
      const multisig = new ethers.Contract(multisigAddressForMode, migrationMultisigAbi, signer);
      const signerAddress = await signer.getAddress();
      const signerIsOwner = await multisig.isOwner(signerAddress);
      if (!signerIsOwner) {
        throw new Error(isAccept ? 'This wallet is not an owner of the new multisig.' : 'This wallet is not an owner of the current multisig.');
      }

      if (isAccept) {
        if (!item.twoStep || !sameAddress(row.owner, PRODUCTION_OLD_MULTISIG) || !sameAddress(row.pendingOwner, PRODUCTION_NEW_MULTISIG)) {
          throw new Error(`${item.name} is not ready for acceptOwnership.`);
        }
      } else if (!sameAddress(row.owner, PRODUCTION_OLD_MULTISIG)) {
        throw new Error(`${item.name} is not owned by the current production multisig.`);
      }

      const data = isAccept
        ? migrationOwnableIface.encodeFunctionData('acceptOwnership', [])
        : migrationOwnableIface.encodeFunctionData('transferOwnership', [PRODUCTION_NEW_MULTISIG]);

      const gasEstimate = await multisig.submitTransaction.estimateGas(item.address, 0, data);
      const tx = await multisig.submitTransaction(item.address, 0, data, {
        gasLimit: withGasBuffer(gasEstimate)
      });
      setLoadingTx(tx.hash, note);
      const receipt = await tx.wait();
      const txId = parseSubmitTxId(receipt, multisig);
      setMigrationTxIds((current) => ({
        ...current,
        [item.key]: {
          ...(current[item.key] || {}),
          [isAccept ? 'accept' : 'transfer']: txId
        }
      }));
      if (isAccept && txId !== null && txId !== undefined && txId !== '') {
        setMigrationAcceptTxIdInput(String(txId));
      }
      setDoneTx(tx.hash, txId ? `${note}. Multisig tx #${txId}` : note);
      await Promise.all([
        refreshMigrationStatus(),
        refreshGovernanceData()
      ]);
      return tx;
    } catch (err) {
      setNormalizedErrorTx(err, `${note} failed`);
      throw err;
    } finally {
      releaseActionLock();
    }
  };

  useEffect(() => {
    if (contracts && account && activeTab === 'migration') {
      refreshMigrationStatus().catch(console.error);
    }
  }, [contracts, account, activeTab, refreshMigrationStatus]);

  const refreshTransactionOnly = useCallback(async (txId, options = {}) => {
    if (txId === null || txId === undefined || txId === '') return null;
    const mode = options.approvalMode || 'current';
    const fresh = await readTransaction(Number(txId), { approvalMode: mode });
    if (!fresh) return null;

    setRecentTxs((current) => {
      const exists = current.some((item) => Number(item.txId) === Number(txId));
      const next = exists
        ? current.map((item) => Number(item.txId) === Number(txId) ? { ...item, ...fresh } : item)
        : [fresh, ...current];
      return next
        .sort((a, b) => Number(b.txId || 0) - Number(a.txId || 0))
        .slice(0, MULTISIG_DEFAULT_SCAN_LIMIT);
    });

    if (multisigTx?.txId !== undefined && Number(multisigTx.txId) === Number(txId)) {
      const detailed = mode === 'all' ? fresh : await readTransaction(Number(txId), { approvalMode: 'all' });
      setMultisigTx(detailed);
      setSelectedTxApprovals(detailed?.approvals || []);
      if (detailed?.proxyAddress || detailed?.implementationAddress) {
        await loadGuardianChecks(detailed.proxyAddress || levelManagerAddress, detailed.implementationAddress || '');
      }
      return detailed;
    }

    return fresh;
  }, [readTransaction, multisigTx?.txId, loadGuardianChecks, levelManagerAddress]);

  const ensureActionIdle = () => {
    if (txActionInFlightRef.current || txStatus.loading) {
      throw new Error('Another governance action is already in progress. Wait for it to finish before retrying.');
    }
    txActionInFlightRef.current = true;
  };

  const releaseActionLock = () => {
    txActionInFlightRef.current = false;
  };

  const loadMigrationAcceptTx = async (forcedId = null) => {
    const idToLoad = forcedId ?? migrationAcceptTxIdInput;
    if (idToLoad === '' || idToLoad === null || idToLoad === undefined) return;

    try {
      const latestBlock = await contracts?.levelManager?.runner?.provider?.getBlock('latest');
      setMultisigStats((prev) => ({
        ...prev,
        currentTimestamp: latestBlock?.timestamp || prev.currentTimestamp
      }));

      const tx = await readMigrationAcceptTransaction(Number(idToLoad));
      setMigrationAcceptTx(tx);
      setMigrationAcceptTxIdInput(String(idToLoad));
      setMigrationAcceptApprovals(tx?.approvals || []);
    } catch (err) {
      console.error(err);
      setMigrationAcceptTx(null);
      setMigrationAcceptApprovals([]);
      setErrorTx(err?.reason || err?.message || 'Failed to load new multisig accept transaction');
    }
  };

  const getMigrationWriteMultisig = async () => {
    await web3Service.initWallet({ requestAccounts: false });
    const signer = web3Service.getSigner();
    if (!signer) throw new Error('Wallet signer is unavailable.');
    return new ethers.Contract(PRODUCTION_NEW_MULTISIG, migrationMultisigAbi, signer);
  };

  const preflightMigrationAcceptAction = async (txId, action) => {
    if (!account) throw new Error('Connect a new multisig owner wallet first.');
    if (!Number.isInteger(Number(txId)) || Number(txId) < 0) throw new Error('Enter a valid new multisig transaction ID.');

    const provider = contracts?.levelManager?.runner?.provider || web3Service.getReadProvider();
    const multisig = new ethers.Contract(PRODUCTION_NEW_MULTISIG, migrationMultisigAbi, provider);
    const [ownerMatch, requiredConfirmations, tx] = await Promise.all([
      multisig.isOwner(account),
      multisig.requiredConfirmations(),
      readMigrationAcceptTransaction(Number(txId))
    ]);

    if (!ownerMatch) throw new Error('This wallet is not an owner of the new multisig.');
    if (!tx) throw new Error(`New multisig transaction #${txId} could not be loaded.`);
    if (tx.executed) throw new Error(`New multisig transaction #${txId} has already been executed.`);
    if (tx.cancelled) throw new Error(`New multisig transaction #${txId} has been cancelled.`);

    const actionIsAcceptOwnership =
      tx.category === 'Governance Migration' &&
      tx.label === 'Accept ownership' &&
      GOVERNANCE_MIGRATION_CONTRACTS.some((item) => item.twoStep && sameAddress(item.address, tx.to));

    if (!actionIsAcceptOwnership) {
      throw new Error('This new multisig transaction is not a recognized vault accept-ownership migration proposal.');
    }

    const ownApproval = tx.approvals?.find((item) => sameAddress(item.owner, account));
    if (action === 'approve' && ownApproval?.approved) {
      throw new Error(`This wallet has already approved new multisig transaction #${txId}.`);
    }

    if (action === 'execute') {
      const confirmations = Number(tx.confirmations || 0);
      const required = Number(requiredConfirmations || 0);
      const executeAfter = Number(tx.executeAfter || 0);
      const latestBlock = await provider.getBlock('latest').catch(() => null);
      const now = Number(latestBlock?.timestamp || Math.floor(Date.now() / 1000));
      if (confirmations < required) throw new Error(`New multisig transaction #${txId} still needs ${required - confirmations} more approval(s).`);
      if (now < executeAfter) throw new Error(`New multisig transaction #${txId} is still timelocked for ${formatCountdown(executeAfter - now)}.`);
    }

    return tx;
  };

  const handleApproveMigrationAcceptTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? migrationAcceptTxIdInput);
    try {
      ensureActionIdle();
      setCheckingTx(`Checking new multisig approval for transaction #${idToUse}`);
      await preflightMigrationAcceptAction(idToUse, 'approve');
      const multisig = await getMigrationWriteMultisig();
      const gasEstimate = await multisig.approveTransaction.estimateGas(idToUse);
      const tx = await multisig.approveTransaction(idToUse, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, `Approving new multisig transaction #${idToUse}`);
      await tx.wait();
      setDoneTx(tx.hash, `Approved new multisig transaction #${idToUse}`);
      await loadMigrationAcceptTx(idToUse);
    } catch (err) {
      setNormalizedErrorTx(err, 'New multisig approval failed');
    } finally {
      releaseActionLock();
    }
  };

  const handleExecuteMigrationAcceptTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? migrationAcceptTxIdInput);
    try {
      ensureActionIdle();
      setCheckingTx(`Checking new multisig execution for transaction #${idToUse}`);
      await preflightMigrationAcceptAction(idToUse, 'execute');
      const multisig = await getMigrationWriteMultisig();
      const gasEstimate = await multisig.executeTransaction.estimateGas(idToUse);
      const tx = await multisig.executeTransaction(idToUse, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, `Executing new multisig transaction #${idToUse}`);
      await tx.wait();
      setDoneTx(tx.hash, `Executed new multisig transaction #${idToUse}`);
      await Promise.all([
        loadMigrationAcceptTx(idToUse),
        refreshMigrationStatus()
      ]);
    } catch (err) {
      setNormalizedErrorTx(err, 'New multisig execution failed');
    } finally {
      releaseActionLock();
    }
  };

  const preflightMultisigAction = async (txId, action) => {
    if (!contracts?.simpleMultiSig) throw new Error('Multisig contract is not available.');
    if (!account) throw new Error('Connect a multisig owner wallet first.');
    if (!Number.isInteger(Number(txId)) || Number(txId) < 0) throw new Error('Enter a valid multisig transaction ID.');

    const ownerMatch = await contracts.simpleMultiSig.isOwner(account);
    if (!ownerMatch) throw new Error('This wallet is not a multisig owner.');

    const tx = await readTransaction(Number(txId), { approvalMode: 'all' });
    if (!tx) throw new Error(`Transaction #${txId} could not be loaded.`);
    if (tx.executed) throw new Error(`Transaction #${txId} has already been executed.`);

    const ownApproval = tx.approvals?.find((item) => item.owner?.toLowerCase() === account.toLowerCase());
    if (action === 'approve' && ownApproval?.approved) {
      throw new Error(`This wallet has already approved transaction #${txId}.`);
    }
    if (action === 'revoke' && !ownApproval?.approved) {
      throw new Error(`This wallet has not approved transaction #${txId}, so there is nothing to revoke.`);
    }

    if (action === 'execute') {
      const confirmations = Number(tx.confirmations || 0);
      const required = Number(multisigStats.requiredConfirmations || 0);
      const executeAfter = Number(tx.executeAfter || 0);
      const now = Number(multisigStats.currentTimestamp || Math.floor(Date.now() / 1000));
      if (confirmations < required) throw new Error(`Transaction #${txId} still needs ${required - confirmations} more approval(s).`);
      if (now < executeAfter) throw new Error(`Transaction #${txId} is still timelocked for ${formatCountdown(executeAfter - now)}.`);

      const provider = contracts.simpleMultiSig.runner?.provider;
      if (provider && tx.to && ethers.isAddress(tx.to)) {
        const targetCode = await provider.getCode(tx.to);
        if (!targetCode || targetCode === '0x') throw new Error('The target address has no contract code.');
      }

      if (tx.implementationAddress || tx.proxyAddress || tx.implementationAddresses?.length) {
        const proxy = tx.proxyAddress || tx.to;
        const implementations = tx.implementationAddresses?.length ? tx.implementationAddresses : [tx.implementationAddress];
        if (!implementations.length || implementations.some((implementation) => !ethers.isAddress(implementation))) throw new Error('Upgrade implementation address is missing or invalid.');
        if (provider) {
          const implementationCodes = await Promise.all(implementations.map((implementation) => provider.getCode(implementation)));
          if (implementationCodes.some((code) => !code || code === '0x')) throw new Error('An implementation address has no contract code.');
        }
        if (contracts.guardian?.paused && await contracts.guardian.paused()) throw new Error('Guardian is paused. Unpause Guardian before executing upgrade proposals.');
        if (contracts.guardian?.globalUpgradeFreeze && await contracts.guardian.globalUpgradeFreeze()) throw new Error('Guardian global upgrade freeze is active.');
        const [proxyApproved, implementationApprovals] = await Promise.all([
          contracts.guardian?.approvedProxies(proxy),
          Promise.all(implementations.map((implementation) => contracts.guardian?.approvedImplementations(proxy, implementation)))
        ]);
        if (!proxyApproved) throw new Error('Guardian has not approved this proxy yet.');
        if (implementationApprovals.some((approved) => !approved)) throw new Error('Guardian has not approved every implementation for this proxy yet.');
      }
    }

    return tx;
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

      const tx = await readTransaction(Number(idToLoad), { approvalMode: 'all' });
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
      ensureActionIdle();
      setCheckingTx(`Checking approval for transaction #${idToUse}`);
      await preflightMultisigAction(idToUse, 'approve');
      const writeContracts = await getWriteContracts();
      const gasEstimate = await writeContracts.simpleMultiSig.approveTransaction.estimateGas(idToUse);
      const tx = await writeContracts.simpleMultiSig.approveTransaction(idToUse, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, `Approving transaction #${idToUse}`);
      await tx.wait();
      setDoneTx(tx.hash, `Approved transaction #${idToUse}`);
      await refreshTransactionOnly(idToUse, { approvalMode: 'all' });
    } catch (err) {
      setNormalizedErrorTx(err, 'Approval failed');
    } finally {
      releaseActionLock();
    }
  };

  const handleRevokeTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? txIdInput);
    try {
      ensureActionIdle();
      setCheckingTx(`Checking revoke for transaction #${idToUse}`);
      await preflightMultisigAction(idToUse, 'revoke');
      const writeContracts = await getWriteContracts();
      const gasEstimate = await writeContracts.simpleMultiSig.revokeConfirmation.estimateGas(idToUse);
      const tx = await writeContracts.simpleMultiSig.revokeConfirmation(idToUse, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, `Revoking approval for transaction #${idToUse}`);
      await tx.wait();
      setDoneTx(tx.hash, `Revoked approval for transaction #${idToUse}`);
      await refreshTransactionOnly(idToUse, { approvalMode: 'all' });
    } catch (err) {
      setNormalizedErrorTx(err, 'Revoke failed');
    } finally {
      releaseActionLock();
    }
  };

  const handleExecuteTx = async (forcedId = null) => {
    const idToUse = Number(forcedId ?? txIdInput);
    try {
      ensureActionIdle();
      setCheckingTx(`Checking execution for transaction #${idToUse}`);
      await preflightMultisigAction(idToUse, 'execute');
      const writeContracts = await getWriteContracts();
      const gasEstimate = await writeContracts.simpleMultiSig.executeTransaction.estimateGas(idToUse);
      const tx = await writeContracts.simpleMultiSig.executeTransaction(idToUse, {
        gasLimit: withGasBuffer(gasEstimate),
      });
      setLoadingTx(tx.hash, `Executing transaction #${idToUse}`);
      await tx.wait();
      setDoneTx(tx.hash, `Executed transaction #${idToUse}`);
      await refreshTransactionOnly(idToUse, { approvalMode: 'all' });
    } catch (err) {
      setNormalizedErrorTx(err, 'Execution failed');
    } finally {
      releaseActionLock();
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

  if (!isOwner && !isProposalSubmitter) {
    return (
      <Container className="admin-shell-premium">
        <div className="glass-panel-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <h5 className="text-glow" style={{ marginBottom: '16px' }}>{adminT("ui.line1439.accessDenied", "Access Denied")}</h5>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>{adminT("ui.line1440.thisPanelIsAvailableOnlyTo", "This panel is available only to multisig owners or approved proposal submitters.")}</p>
        </div>
      </Container>);

  }

  return (
    <Container fluid="xl" className="admin-shell-premium">

      {/* Hero Header */}
      <div className="admin-hero-premium">
        <div>
          <h1 className="admin-title-premium">{adminT("ui.line1452.adminPanel", "Admin Panel")}</h1>
          <div className="admin-subtitle">{adminT("ui.line1453.productionGovernanceCockpitForMultisigOwners", "Production governance cockpit for multisig owners and approved proposal submitters")}</div>
        </div>
        <div className="flex-between-premium" style={{ gap: '12px' }}>
          <span className="admin-badge-premium"><Key size={14} /> {shortAddress(account)}</span>
          <span className="admin-badge-premium"><Crown size={14} />{isOwner ? adminT("ui.line1457.multisigOwner", "Multisig Owner") : adminT("ui.line1457.proposalSubmitter", "Proposal Submitter")}</span>
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
        <button className={activeTab === 'migration' ? 'active' : ''} onClick={() => setActiveTab('migration')} title="Governance Migration">
          <Key size={20} />
          <span>Migration</span>
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
                            <span>{adminT("ui.financialTruth.totalAccumulated", "Total Accumulated")}: ${formatMoney(financialTruth.devOperations.totalInflow)}</span>
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
                                    <button className="btn-premium btn-premium-sm" onClick={() => handleApproveTx(tx.txId)} disabled={!isOwner || txStatus.loading || tx.executed || currentOwnerApproval?.approved}>{adminT("ui.actions.approve", "Approve")}</button>
                                    <button className="btn-premium btn-premium-sm" onClick={() => handleRevokeTx(tx.txId)} disabled={!isOwner || txStatus.loading || tx.executed || !currentOwnerApproval?.approved}>{adminT("ui.actions.revoke", "Revoke")}</button>
                                    <button className="btn-premium btn-premium-sm" onClick={() => handleExecuteTx(tx.txId)} disabled={!isOwner || txStatus.loading || tx.executed || stage.variant !== 'primary'}>{adminT("ui.actions.execute", "Execute")}</button>
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
                          <button className="btn-premium btn-premium-sm" onClick={() => loadMultisigTx()} disabled={txStatus.loading}>{adminT("ui.line1729.load", "Load")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleApproveTx()} disabled={txStatus.loading || !txIdInput}>{adminT("ui.line1730.approve", "Approve")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleRevokeTx()} disabled={txStatus.loading || !txIdInput}>{adminT("ui.line1731.revoke", "Revoke")}</button>
                          <button className="btn-premium btn-premium-sm" onClick={() => handleExecuteTx()} disabled={txStatus.loading || !txIdInput}>{adminT("ui.line1732.execute", "Execute")}</button>
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

        {/* VIEW: GOVERNANCE MIGRATION */}
        {activeTab === 'migration' &&
        <section className="fade-in">
            <div className="admin-card-premium migration-panel-premium" style={{ padding: '10px' }}>
              <div className="admin-header-premium">
                <div>
                  <div className="header-title" style={{ textAlign: 'center' }}>Governance Migration</div>
                  <div className="admin-subtitle mt-1">Submit ownership-transfer proposals from the current multisig to the new multisig. Founders still approve and execute through multisig.</div>
                </div>
                <button className="btn-premium btn-premium-sm" onClick={refreshMigrationStatus} disabled={migrationLoading || txStatus.loading}>
                  {migrationLoading ? <Spinner size="sm" /> : <RefreshCw size={14} />} Refresh
                </button>
              </div>

              <div className="admin-body-premium">
                <Alert variant="warning" className="mb-4">
                  This tool does not change ID1 and does not execute any proposal directly. It only submits prepared multisig transactions. Do not continue if the ID1 safety check is not green.
                </Alert>

                <Row className="g-3 mb-4">
                  <Col xl={3} md={6}>
                    <div className="metric-card-premium">
                      <div className="metric-label">Current multisig</div>
                      <div className="metric-value mono" style={{ fontSize: '0.95rem' }}>{shortAddress(PRODUCTION_OLD_MULTISIG)}</div>
                      <div className="metric-hint mono">{PRODUCTION_OLD_MULTISIG}</div>
                    </div>
                  </Col>
                  <Col xl={3} md={6}>
                    <div className="metric-card-premium">
                      <div className="metric-label">New multisig</div>
                      <div className="metric-value mono" style={{ fontSize: '0.95rem' }}>{shortAddress(PRODUCTION_NEW_MULTISIG)}</div>
                      <div className="metric-hint mono">{PRODUCTION_NEW_MULTISIG}</div>
                    </div>
                  </Col>
                  <Col xl={3} md={6}>
                    <div className="metric-card-premium">
                      <div className="metric-label">Connected wallet authority</div>
                      <div className="metric-value" style={{ fontSize: '0.95rem' }}>
                        <Badge bg={migrationAuthority.oldMultisigOwner ? 'success' : 'secondary'} className="me-2">Old owner</Badge>
                        <Badge bg={migrationAuthority.newMultisigOwner ? 'success' : 'secondary'}>New owner</Badge>
                      </div>
                      <div className="metric-hint">Transfer proposals need old-owner authority. Accept proposals need new-owner authority.</div>
                    </div>
                  </Col>
                  <Col xl={3} md={6}>
                    <div className="metric-card-premium">
                      <div className="metric-label">ID1 safety</div>
                      <div className="metric-value" style={{ fontSize: '0.95rem' }}>
                        <Badge bg={migrationId1State.safe ? 'success' : 'danger'}>
                          {migrationId1State.safe ? 'ID1 unchanged' : 'Blocked'}
                        </Badge>
                      </div>
                      <div className="metric-hint">
                        LevelManager: <span className="mono">{shortAddress(migrationId1State.levelManager)}</span><br />
                        Registration: <span className="mono">{shortAddress(migrationId1State.registration)}</span>
                      </div>
                    </div>
                  </Col>
                </Row>

                <div className="soft-panel-premium mb-4">
                  <div className="small-label-premium mb-2">How founders should use this</div>
                  <p className="admin-subtitle mb-2">
                    First submit transfer proposals for each contract still owned by the current multisig. NFTPoolVault and OperationsVault use two-step ownership: after founders approve and execute the transfer proposal, return here and submit the accept-ownership proposal from a new multisig owner wallet.
                  </p>
                  <p className="admin-subtitle mb-0">
                    The generated transaction IDs appear in this session after each submission. Transfer IDs are approved in the normal queue. Accept IDs are approved in the New Multisig Accept Queue below because they belong to the new multisig.
                  </p>
                </div>

                <div className="soft-panel-premium migration-accept-queue mb-4">
                  <div className="d-flex justify-content-between gap-3 flex-wrap align-items-start mb-3">
                    <div>
                      <div className="small-label-premium mb-2">New Multisig Accept Queue</div>
                      <p className="admin-subtitle mb-0">
                        Use this only for NFTPoolVault and OperationsVault accept-ownership proposals. Current known accept transaction IDs are usually <span className="mono">#0</span> and <span className="mono">#1</span> on the new multisig.
                      </p>
                    </div>
                    <Badge bg={migrationAuthority.newMultisigOwner ? 'success' : 'secondary'}>
                      {migrationAuthority.newMultisigOwner ? 'New multisig owner connected' : 'Connect new owner wallet'}
                    </Badge>
                  </div>

                  <Row className="g-3 align-items-end">
                    <Col md={4}>
                      <Form.Label className="small-label-premium">New multisig transaction ID</Form.Label>
                      <Form.Control
                        value={migrationAcceptTxIdInput}
                        onChange={(event) => setMigrationAcceptTxIdInput(event.target.value)}
                        placeholder="0 or 1"
                        className="premium-input"
                      />
                    </Col>
                    <Col md={8}>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          className="btn-premium btn-premium-sm"
                          onClick={() => loadMigrationAcceptTx()}
                          disabled={txStatus.loading || migrationAcceptTxIdInput === ''}>
                          Load new tx
                        </button>
                        <button
                          className="btn-premium btn-premium-sm"
                          onClick={() => handleApproveMigrationAcceptTx()}
                          disabled={txStatus.loading || !migrationAcceptTx || migrationAcceptTx.executed || !migrationAuthority.newMultisigOwner}>
                          Approve
                        </button>
                        <button
                          className="btn-premium btn-premium-sm"
                          onClick={() => handleExecuteMigrationAcceptTx()}
                          disabled={txStatus.loading || !migrationAcceptTx || migrationAcceptTx.executed || !migrationAuthority.newMultisigOwner}>
                          Execute
                        </button>
                      </div>
                    </Col>
                  </Row>

                  {migrationAcceptTx ? (
                    <div className="migration-accept-details mt-3">
                      <Row className="g-3">
                        <Col md={3}>
                          <div className="metric-card-premium">
                            <div className="metric-label">Action</div>
                            <div className="metric-value">{migrationAcceptTx.label}</div>
                            <div className="metric-hint mono">{shortAddress(migrationAcceptTx.to)}</div>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="metric-card-premium">
                            <div className="metric-label">Confirmations</div>
                            <div className="metric-value">{migrationAcceptTx.confirmations}</div>
                            <div className="metric-hint">Needs 3 approvals before execution.</div>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="metric-card-premium">
                            <div className="metric-label">Status</div>
                            <div className="metric-value">
                              <Badge bg={migrationAcceptTx.executed ? 'success' : 'warning'}>
                                {migrationAcceptTx.executed ? 'Executed' : 'Pending'}
                              </Badge>
                            </div>
                            <div className="metric-hint">
                              Timelock: {Number(migrationAcceptTx.executeAfter || 0)
                                ? new Date(Number(migrationAcceptTx.executeAfter) * 1000).toLocaleString()
                                : 'Unavailable'}
                            </div>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="metric-card-premium">
                            <div className="metric-label">Target check</div>
                            <div className="metric-value">
                              <Badge bg={migrationAcceptTx.category === 'Governance Migration' ? 'success' : 'danger'}>
                                {migrationAcceptTx.category}
                              </Badge>
                            </div>
                            <div className="metric-hint">{migrationAcceptTx.details}</div>
                          </div>
                        </Col>
                      </Row>

                      <div className="mt-3">
                        <div className="small-label-premium mb-2">Founder approvals</div>
                        <div className="d-flex gap-2 flex-wrap">
                          {migrationAcceptApprovals.map((approval) => (
                            <Badge key={approval.owner} bg={approval.approved ? 'success' : 'secondary'} className="mono">
                              {shortAddress(approval.owner)} {approval.approved ? 'approved' : 'pending'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="table-responsive premium-table-wrapper">
                  <Table hover className="premium-table align-middle">
                    <thead>
                      <tr>
                        <th>Contract</th>
                        <th>Owner</th>
                        <th>Pending owner</th>
                        <th>Flow</th>
                        <th>Status</th>
                        <th>Submitted IDs</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GOVERNANCE_MIGRATION_CONTRACTS.map((item) => {
                        const row = migrationRows[item.key] || {};
                        const state = getMigrationRowState(item);
                        const txIds = migrationTxIds[item.key] || {};
                        const transferDisabled = txStatus.loading || migrationLoading || !state.canTransfer || Boolean(txIds.transfer);
                        const acceptDisabled = txStatus.loading || migrationLoading || !state.canAccept || Boolean(txIds.accept);

                        return (
                          <tr key={item.key}>
                            <td>
                              <div className="fw-semibold">{item.name}</div>
                              <div className="mono small">{item.address}</div>
                            </td>
                            <td className="mono">{shortAddress(row.owner)}</td>
                            <td className="mono">{shortAddress(row.pendingOwner)}</td>
                            <td>{item.twoStep ? 'Two-step' : 'One-step'}</td>
                            <td><Badge bg={state.variant}>{state.label}</Badge>{row.error ? <div className="text-danger small mt-1">{row.error}</div> : null}</td>
                            <td>
                              {txIds.transfer ? <div>Transfer: <span className="mono">#{txIds.transfer}</span></div> : null}
                              {txIds.accept ? <div>Accept: <span className="mono">#{txIds.accept}</span></div> : null}
                              {!txIds.transfer && !txIds.accept ? <span className="text-muted">None this session</span> : null}
                            </td>
                            <td>
                              <div className="d-flex gap-2 flex-wrap">
                                <button
                                  className="btn-premium btn-premium-sm"
                                  onClick={() => submitMigrationProposal(item, 'transfer')}
                                  disabled={transferDisabled}>
                                  Submit transfer
                                </button>
                                {item.twoStep &&
                                <button
                                  className="btn-premium btn-premium-sm"
                                  onClick={() => submitMigrationProposal(item, 'accept')}
                                  disabled={acceptDisabled}>
                                    Submit accept
                                  </button>
                                }
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
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
