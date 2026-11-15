import { Interface } from 'ethers';
import { REPAIR224_RELAY as relay } from '../constants/repair224Relay.js';

const abi = new Interface(['function addOwner(address)', 'function removeOwner(address)']);
const lower = value => String(value || '').toLowerCase();
const sameGovernance = (chainId, multisig) => Number(chainId) === relay.chainId && lower(multisig) === lower(relay.governance);

export function relay224ExecutionHold(chainId, multisig, txId) {
  return sameGovernance(chainId, multisig) && Number(txId) === relay.removeId && !relay.removalReleased
    ? 'Proposal 258 is on hold until proposal 224 succeeds and its repair records are verified. Execute 257 only, then stop for verification.'
    : '';
}

export function describeRepair224Relay(tx) {
  if (!sameGovernance(tx.chainId, tx.multisig) || ![relay.authorizeId, relay.removeId].includes(Number(tx.txId))) return null;
  const adding = Number(tx.txId) === relay.authorizeId;
  const expected = abi.encodeFunctionData(adding ? 'addOwner' : 'removeOwner', [relay.address]);
  const matched = lower(tx.to) === lower(relay.governance) && String(tx.value) === '0' && lower(tx.data) === lower(expected);
  if (!matched) return { category: 'Governance', targetLabel: 'SimpleMultiSig',
    label: 'Repair helper proposal: verification required', details: 'Target, value or calldata does not match the verified helper proposal.', reviewRequired: true };
  return { category: 'Governance', targetLabel: 'SimpleMultiSig', reviewRequired: false,
    label: adding ? 'Authorize restricted helper for proposal 224' : 'Remove proposal 224 helper permission',
    details: adding
      ? `Temporarily add contract ${relay.address} as an owner. It can execute only the already-approved proposal 224; it cannot approve proposals or manage owners. The three-founder confirmation threshold stays unchanged. This action does not execute the repair. Execute 257, then stop.`
      : `Remove contract ${relay.address} from the owner list after proposal 224 succeeds and its repair is verified. Do not execute this before the repair, or the helper will lose permission to execute it.`,
  };
}
