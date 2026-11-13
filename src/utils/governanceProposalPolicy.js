// Proposal IDs are immutable within this exact mainnet multisig.
export const WITHDRAWN_ID1_PACKAGE = Object.freeze({
  chainId: 137,
  multisig: '0x785cc854ce9e13ce1140cbfd7c08620713e1711d',
  firstId: 130,
  lastId: 159,
  reason: 'Withdrawn: superseded ID1 repair. Do not approve or execute. On-chain cancellation is required.',
});

export function isWithdrawnProposal(chainId, multisig, txId) {
  const id = Number(txId);
  return Number(chainId) === WITHDRAWN_ID1_PACKAGE.chainId &&
    String(multisig).toLowerCase() === WITHDRAWN_ID1_PACKAGE.multisig &&
    txId !== null && txId !== '' && Number.isInteger(id) &&
    id >= WITHDRAWN_ID1_PACKAGE.firstId && id <= WITHDRAWN_ID1_PACKAGE.lastId;
}

export function proposalActionBlock(tx, action) {
  if (!tx) return 'Proposal is unavailable.';
  if (tx.executed) return 'Proposal has already been executed.';
  if (tx.cancelled) return 'Proposal has been cancelled on chain.';
  if (tx.withdrawn && action !== 'revoke') return WITHDRAWN_ID1_PACKAGE.reason;
  return '';
}

export function isArchivedProposal(tx) {
  return Boolean(tx?.cancelled || tx?.withdrawn);
}
