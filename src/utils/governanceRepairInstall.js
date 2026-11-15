import { Interface, getAddress } from 'ethers';
import { REPAIR224_RELAY as relay } from '../constants/repair224Relay.js';
import { REPAIR225_RELEASE } from '../constants/repair225Release.js';
import { REPAIR_INSTALL_RELEASE as release } from '../constants/repairInstallRelease.js';
import { matchedRepairAction } from './governanceMaintenance.js';

const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const iface = new Interface(['function upgradeToAndCall(address,bytes)', 'function setSettlementRouter(address)',
  'function setApprovedImplementation(address,address,bool)', 'function settlementRouter() view returns(address)',
  'function approvedImplementations(address,address) view returns(bool)', 'function paused() view returns(bool)']);

export async function verifyFinalRepairBindings(provider, manifest) {
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  const read = async (to, name, args = []) => iface.decodeFunctionResult(name,
    await provider.call({ to, data: iface.encodeFunctionData(name, args) }))[0];
  for (let id = 226; id <= 236; id++) {
    const action = manifest.actions.find(row => row.index === id - 190);
    if (!action || action.phase !== 'INSTALL') throw new Error('Final implementation manifest is incomplete.');
    const parsed = iface.parseTransaction({ data: action.data });
    if (!parsed || !['upgradeToAndCall', 'setSettlementRouter'].includes(parsed.name)) throw new Error('Unexpected final implementation instruction.');
    const expected = parsed.args[0];
    const actual = parsed.name === 'upgradeToAndCall'
      ? getAddress('0x' + (await provider.getStorage(action.target, implSlot)).slice(-40))
      : await read(action.target, 'settlementRouter');
    if (!same(actual, expected) || (await provider.getCode(expected)) === '0x') {
      throw new Error(`Final contract binding from proposal ${id} is not installed. Reopening blocked.`);
    }
  }
  for (let id = 237; id <= 244; id++) {
    const action = manifest.actions.find(row => row.index === id - 190);
    if (!action || action.phase !== 'REVOKE') throw new Error('Temporary permission removal manifest is incomplete.');
    const parsed = iface.parseTransaction({ data: action.data });
    if (parsed?.name !== 'setApprovedImplementation' || parsed.args[2] !== false ||
      await read(action.target, 'approvedImplementations', [parsed.args[0], parsed.args[1]])) {
      throw new Error(`Temporary permission from proposal ${id} remains active. Reopening blocked.`);
    }
  }
  const paused = [...new Set(manifest.actions.filter(row => row.phase === 'PAUSE').map(row => row.target.toLowerCase()))];
  if (paused.length !== 12) throw new Error('The maintenance pause manifest is incomplete.');
  for (const address of paused) {
    if (!await read(address, 'paused')) throw new Error('A contract was reopened out of sequence. Stop for review.');
  }
}

export async function prepareRepairInstallExecution(multisig, txId, manifest) {
  const id = Number(txId);
  if (!release.released || !Number.isInteger(id) || id < release.firstId || id > release.lastId) {
    throw new Error('Only proposals 226-256 are released in this maintenance sequence.');
  }
  // Check every prerequisite, including execution performed outside this panel.
  for (const previous of [224, 258, ...Array.from({ length: id - 225 }, (_, i) => 225 + i)]) {
    const tx = await multisig.transactions(previous);
    if (!tx.executed || tx.cancelled) throw new Error(`Execute proposal ${previous} successfully before ${id}. Do not skip proposals.`);
  }
  if (await multisig.isOwner(relay.address)) throw new Error('The temporary repair helper must remain removed.');
  const sorted = values => Array.from(values, value => value.toLowerCase()).sort().join(',');
  if (sorted(await multisig.getOwners()) !== sorted(REPAIR225_RELEASE.owners) ||
    BigInt(await multisig.requiredConfirmations()) !== 3n) {
    throw new Error('The original four-founder, three-confirmation configuration has changed. Stop for review.');
  }
  const tx = await multisig.transactions(id);
  if (tx.executed || tx.cancelled) throw new Error(`Proposal ${id} is already executed or cancelled. Refresh its status.`);
  const action = matchedRepairAction({ chainId: relay.chainId, multisig: relay.governance,
    to: tx.to, value: tx.value, data: tx.data }, manifest);
  if (!action || action.index !== id - 190 || action.phase !== (id <= 236 ? 'INSTALL' : id <= 244 ? 'REVOKE' : 'REOPEN') || BigInt(tx.value) !== 0n) {
    throw new Error(`Proposal ${id} does not match the verified maintenance manifest.`);
  }
  if (BigInt(tx.confirmations) < 3n) throw new Error(`Proposal ${id} needs three current founder confirmations.`);
  const latest = await multisig.runner.provider.getBlock('latest');
  if (!latest || BigInt(latest.timestamp) < BigInt(tx.executeAfter)) throw new Error(`Proposal ${id} is still timelocked.`);
  if (id === release.firstReopenId) await verifyFinalRepairBindings(multisig.runner.provider, manifest);
  const estimate = BigInt(await multisig.executeTransaction.estimateGas(id));
  const gasLimit = estimate * 12000n / 10000n;
  if (estimate <= 0n || gasLimit >= 32_000_000n) throw new Error(`Proposal ${id} gas estimate is outside the execution bound.`);
  await multisig.executeTransaction.staticCall(id, { gasLimit });
  return { gasLimit };
}
