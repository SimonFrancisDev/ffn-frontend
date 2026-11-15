import { repairExecutionHold } from './governanceProposalPolicy.js';

export async function prepareGovernanceExecution(multisig, txId, manifest, readProvider) {
  if (Number(txId) >= 224 && Number(txId) <= 258) {
    const provider = multisig.runner?.provider;
    if (!provider) throw new Error('Connect a founder wallet before executing a governance proposal.');
    const address = await multisig.getAddress();
    const network = await provider.getNetwork();
    const readNetwork = readProvider ? await readProvider.getNetwork() : network;
    if (network.chainId !== readNetwork.chainId) throw new Error('Wallet and read network do not match.');
    const hold = repairExecutionHold(network.chainId, address, txId);
    if (hold) throw new Error(hold);
  }
  // Other proposals retain their original estimation path.
  const estimate = await multisig.executeTransaction.estimateGas(txId);
  return { gasLimit: (BigInt(estimate) * 12000n) / 10000n };
}

export async function executeGovernanceTransaction(multisig, txId, manifest, readProvider) {
  const options = await prepareGovernanceExecution(multisig, txId, manifest, readProvider);
  return multisig.executeTransaction(txId, options);
}
