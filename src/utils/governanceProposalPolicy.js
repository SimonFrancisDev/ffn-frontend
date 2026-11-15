import { relay224ExecutionHold } from './governanceRelay224.js';
import { REPAIR225_RELEASE } from '../constants/repair225Release.js';

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

// 224 and helper removal 258 are verified. Release 225 only; no automatic reopening.
export function repairExecutionHold(chainId, multisig, txId) {
  const relayHold = relay224ExecutionHold(chainId, multisig, txId);
  if (relayHold) return relayHold;
  const id = Number(txId);
  return Number(chainId) === 137 &&
    String(multisig).toLowerCase() === WITHDRAWN_ID1_PACKAGE.multisig &&
    Number.isInteger(id) && id >= 224 && id <= 256 && !(id === 225 && REPAIR225_RELEASE.released)
    ? 'Repair execution on hold: 224 and helper removal 258 are verified. Execute proposal 225 only, then stop for verification before later upgrades or reopening. Do not retry 224.'
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
