import { keccak256 } from 'ethers';
import { REPAIR224_RELAY as relay } from '../constants/repair224Relay.js';
import { REPAIR225_RELEASE as release } from '../constants/repair225Release.js';
import { matchedRepairAction } from './governanceMaintenance.js';

export async function prepareRepair225Execution(multisig, manifest) {
  for (const id of [224, 258]) {
    const tx = await multisig.transactions(id);
    if (!tx.executed || tx.cancelled) throw new Error(`Proposal ${id} must be successfully executed before 225.`);
  }
  if (await multisig.isOwner(relay.address)) throw new Error('The temporary helper must be removed before proposal 225.');
  const lowerSorted = values => Array.from(values, value => value.toLowerCase()).sort().join(',');
  if (lowerSorted(await multisig.getOwners()) !== lowerSorted(release.owners) ||
    BigInt(await multisig.requiredConfirmations()) !== 3n) {
    throw new Error('The original four-owner, three-confirmation configuration must be restored before 225.');
  }
  const tx = await multisig.transactions(225);
  if (tx.executed || tx.cancelled) throw new Error('Proposal 225 is already executed or cancelled. Refresh its status.');
  if (BigInt(tx.confirmations) < 3n) throw new Error('Proposal 225 needs three current founder confirmations.');
  const action = matchedRepairAction({ chainId: relay.chainId, multisig: relay.governance,
    to: tx.to, value: tx.value, data: tx.data }, manifest);
  if (!action || action.index !== 35 || action.phase !== 'REPAIR' ||
    tx.to.toLowerCase() !== release.target.toLowerCase() || BigInt(tx.value) !== 0n ||
    keccak256(tx.data) !== release.payloadHash) {
    throw new Error('Proposal 225 does not match the verified Freedom Plus repair instructions.');
  }
  const provider = multisig.runner.provider;
  const latest = await provider.getBlock('latest');
  if (!latest || BigInt(latest.timestamp) < BigInt(tx.executeAfter)) throw new Error('Proposal 225 is still timelocked.');
  const deployment = manifest.deployments?.find(row => row.address.toLowerCase() === release.target.toLowerCase());
  if (!deployment || keccak256(await provider.getCode(tx.to)) !== deployment.runtimeHash) {
    throw new Error('Proposal 225 executor code does not match its verified deployment.');
  }
  // The repair itself checks pauses, immutable plans and exact pre-repair state.
  // Simulate the actual founder path with its estimated, bounded gas budget.
  const estimate = BigInt(await multisig.executeTransaction.estimateGas(225));
  const gasLimit = estimate * 12000n / 10000n;
  if (estimate <= 0n || gasLimit >= 32_000_000n) throw new Error('Proposal 225 gas estimate is outside its normal execution bound.');
  await multisig.executeTransaction.staticCall(225, { gasLimit });
  return { gasLimit };
}
