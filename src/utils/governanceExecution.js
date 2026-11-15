import { repairExecutionHold, WITHDRAWN_ID1_PACKAGE } from './governanceProposalPolicy.js';
import { executeSignedRepair224 } from './governanceRepairSigned.js';

export async function prepareGovernanceExecution(multisig, txId, manifest, readProvider) {
  if (Number(txId) >= 224 && Number(txId) <= 256) {
    const provider = multisig.runner?.provider;
    if (!provider) throw new Error('Connect a founder wallet before executing a governance proposal.');
    const address = await multisig.getAddress();
    const network = await provider.getNetwork();
    const readNetwork = readProvider ? await readProvider.getNetwork() : network;
    if (network.chainId !== readNetwork.chainId) throw new Error('Wallet and read network do not match.');
    if (Number(txId) === 224 && Number(network.chainId) === 137 &&
      address.toLowerCase() === WITHDRAWN_ID1_PACKAGE.multisig) {
      throw new Error('Repair 224 requires verification of the signed transaction before broadcast. Direct wallet submission is disabled.');
    }
    const hold = repairExecutionHold(network.chainId, address, txId);
    if (hold) throw new Error(hold);
  }
  // Other proposals retain their original estimation path.
  const estimate = await multisig.executeTransaction.estimateGas(txId);
  return { gasLimit: (BigInt(estimate) * 12000n) / 10000n };
}

export async function executeGovernanceTransaction(multisig, txId, manifest, readProvider, onBroadcastAttempt) {
  if (Number(txId) === 224 &&
    (await multisig.getAddress()).toLowerCase() === WITHDRAWN_ID1_PACKAGE.multisig &&
    Number((await multisig.runner.provider.getNetwork()).chainId) === 137) {
    return executeSignedRepair224(multisig, manifest, readProvider, onBroadcastAttempt);
  }
  const options = await prepareGovernanceExecution(multisig, txId, manifest, readProvider);
  return multisig.executeTransaction(txId, options);
}
