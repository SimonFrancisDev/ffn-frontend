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

// Mined retries omitted the required access list. Simulating a prepared request
// cannot prove a wallet will preserve it when signing/broadcasting.
export function repairExecutionHold(chainId, multisig, txId) {
  const id = Number(txId);
  return Number(chainId) === 137 &&
    String(multisig).toLowerCase() === WITHDRAWN_ID1_PACKAGE.multisig &&
    Number.isInteger(id) && id >= 224 && id <= 256
    ? 'Repair execution on hold: mined attempts omitted the required access list and reverted. Do not retry 224 or execute later repair/reopening proposals until a verified submission path is released.'
    : '';
}

export function proposalActionBlock(tx, action) {
  if (!tx) return 'Proposal is unavailable.';
  if (tx.executed) return 'Proposal has already been executed.';
  if (tx.cancelled) return 'Proposal has been cancelled on chain.';
  if (tx.withdrawn && action !== 'revoke') return WITHDRAWN_ID1_PACKAGE.reason;
  if (action !== 'revoke') {
    const hold = repairExecutionHold(tx.chainId, tx.multisig, tx.txId);
    if (hold) return hold;
  }
  if (tx.reviewRequired && action !== 'revoke') return 'This maintenance proposal has not matched a verified target and repair manifest. Review it before approval or execution.';
  return '';
}

export function isArchivedProposal(tx) {
  return Boolean(tx?.cancelled || tx?.withdrawn);
}
