const KNOWN_ERROR_PATTERNS = [
  {
    test: /endpoint not found|endpoint.*unavailable|ssl protocol|failed to fetch|network detection|could not detect network/i,
    title: 'Blockchain connection unavailable',
    message: 'The configured blockchain connection could not submit or verify this request.',
    action: 'Do not submit again until the connection recovers. Refresh once and check your wallet activity for a pending transaction.',
  },
  {
    test: /PermanentSponsorMismatch|permanent sponsor/i,
    title: 'Permanent sponsor mismatch',
    message: 'The sponsor does not match the permanent sponsor inherited from F-Freedom.',
    action: 'Refresh your FFN identity and retry without changing the sponsor.',
  },
  {
    test: /AlreadyRegistered/i,
    title: 'Already registered',
    message: 'This wallet is already registered in Freedom-Plus.',
    action: 'Refresh the page to load the confirmed registration and active levels.',
  },
  {
    test: /NotRegistered|FFreedomLevelOneInactive|FFreedomGatewayNotConfigured/i,
    title: 'F-Freedom gateway required',
    message: 'This wallet must be registered with F-Freedom Level 1 active before joining Freedom-Plus.',
    action: 'Complete or refresh the F-Freedom Level 1 gateway state, then retry.',
  },
  {
    test: /user rejected|user denied|rejected transaction/i,
    title: 'Action cancelled',
    message: 'The wallet request was cancelled before it was submitted.',
    action: 'Open the wallet request again when you are ready.',
  },
  {
    test: /insufficient funds|insufficient balance/i,
    title: 'Insufficient balance',
    message: 'The wallet does not have enough funds for this action.',
    action: 'Add the required token balance and try again.',
  },
  {
    test: /allowance|token approval|erc-?20.*approve/i,
    title: 'Approval required',
    message: 'The contract needs token approval before this action can continue.',
    action: 'Approve the required amount, then submit the action again.',
  },
  {
    test: /wrong network|switch.*network|chain/i,
    title: 'Wrong network',
    message: 'Your wallet is connected to a different network.',
    action: 'Switch to the required network and refresh the status.',
  },
  {
    test: /previous level|prev.*inactive/i,
    title: 'Previous level required',
    message: 'The previous level must be active before this level can be activated.',
    action: 'Activate the earlier level first.',
  },
  {
    test: /PreviousLevelInactive/i,
    title: 'Previous level required',
    message: 'The previous level must be active before this level can be activated.',
    action: 'Activate the earlier level first.',
  },
  {
    test: /LevelAlreadyActivated/i,
    title: 'Already active',
    message: 'This level is already active for the selected wallet.',
    action: 'Refresh the page to view the latest account state.',
  },
  {
    test: /UserNotRegistered/i,
    title: 'Registration required',
    message: 'This wallet is not registered yet.',
    action: 'Complete registration before activating higher levels.',
  },
  {
    test: /InvalidLevel|UnsupportedP39Level/i,
    title: 'Invalid level',
    message: 'The selected level is not supported by this contract.',
    action: 'Refresh and choose an available level.',
  },
  {
    test: /InvalidAddress|InvalidContract/i,
    title: 'Invalid address',
    message: 'One of the configured addresses is invalid.',
    action: 'Check deployment configuration and try again.',
  },
  {
    test: /OrbitFull|ReentryTargetNotEmpty/i,
    title: 'Orbit position unavailable',
    message: 'The selected orbit position cannot accept this activation.',
    action: 'Refresh orbit data and try again.',
  },
  {
    test: /InvalidLinePayment|0x039a7cf2/i,
    title: 'Founder representative activation needs upgrade',
    message: 'This free activation reached an older orbit rule that cannot process the founder representative placement.',
    action: 'Use the staged contract upgrade flow before retrying this activation.',
  },
  {
    test: /Tx failed/i,
    title: 'Governance target rejected execution',
    message: 'The multisig was ready, but the target contract rejected the call.',
    action: 'Check Guardian approval, timelock, proxy, implementation, and target contract state before executing again.',
  },
  {
    test: /SettlementRouterCallFailed|TokenRewardFailed/i,
    title: 'Settlement failed',
    message: 'The contract could not complete settlement for this transaction.',
    action: 'Check the transaction status and contact support if it persists.',
  },
  {
    test: /UplineSearchTooDeep/i,
    title: 'Referral path needs review',
    message: 'This activation path is too deep to process safely in one transaction.',
    action: 'Contact support before retrying this activation.',
  },
  {
    test: /-32007|request limit reached|rate limit|too many requests|125\/second|eth_getBlockByNumber/i,
    title: 'RPC provider is busy',
    message: 'The blockchain provider is receiving too many requests. No transaction was submitted unless your wallet shows a pending transaction.',
    action: 'Wait a few seconds, refresh only the selected item, and retry once.',
  },
  {
    test: /could not coalesce|coalesce/i,
    title: 'Wallet response needs retry',
    message: 'The wallet or RPC returned an incomplete transaction response. The transaction may not have been submitted.',
    action: 'Wait a few seconds, refresh account data, and retry only if no transaction is pending in your wallet.',
  },
  {
    test: /gas price below minimum|tip.*minimum|transaction underpriced|replacement fee too low|max fee per gas less than block base fee/i,
    title: 'Network gas price changed',
    message: 'The network required a higher gas fee than the wallet submitted.',
    action: 'Retry the transaction. The app will request a stronger network fee.',
  },
  {
    test: /nonce too low|already known|replacement transaction underpriced/i,
    title: 'Wallet transaction already pending',
    message: 'Your wallet may already have a pending transaction for this action.',
    action: 'Open your wallet activity, wait for the pending transaction to finish, then refresh.',
  },
  {
    test: /gas required exceeds allowance|gas exceeds configured limit|exceeds the configured limit|gas limit|intrinsic gas too low|exceeds block gas limit/i,
    title: 'Gas limit blocked',
    message: 'The wallet or RPC rejected the requested gas limit before the transaction could run.',
    action: 'Refresh account data and retry. If this repeats, contact support with your wallet address and level.',
  },
  {
    test: /cannot estimate gas|UNPREDICTABLE_GAS_LIMIT|CALL_EXCEPTION|missing revert data/i,
    title: 'Transaction preflight failed',
    message: 'The wallet could not confirm this transaction is safe to submit.',
    action: 'Refresh account data and try again. If this repeats, contact support with your wallet address and level.',
  },
  {
    test: /already active|already activated/i,
    title: 'Already active',
    message: 'This level is already active for the selected wallet.',
    action: 'Refresh the page to view the latest account state.',
  },
  {
    test: /read-only|own space|another member/i,
    title: 'Read-only view',
    message: 'Wallet actions are disabled while viewing another account.',
    action: 'Return to your own wallet view to continue.',
  },
]

export function normalizeError(error, fallback = 'Something went wrong. Please try again.') {
  const raw =
    error?.shortMessage ||
    error?.reason ||
    error?.data?.message ||
    error?.message ||
    String(error || fallback)

  const matched = KNOWN_ERROR_PATTERNS.find((item) => item.test.test(raw))
  if (matched) {
    return {
      ...matched,
      raw,
      code: error?.code || error?.data?.code || '',
    }
  }

  return {
    title: 'Request failed',
    message: raw || fallback,
    action: 'Check the details and try again.',
    raw,
    code: error?.code || error?.data?.code || '',
  }
}

export function getErrorMessage(error, fallback) {
  return normalizeError(error, fallback).message
}
