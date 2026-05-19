const KNOWN_ERROR_PATTERNS = [
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
    test: /allowance|approve/i,
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
    test: /SettlementRouterCallFailed|TokenRewardFailed/i,
    title: 'Settlement failed',
    message: 'The contract could not complete settlement for this transaction.',
    action: 'Check the transaction status and contact support if it persists.',
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
