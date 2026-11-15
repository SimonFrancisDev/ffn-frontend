import { formatEther, keccak256 } from 'ethers';
import { matchedRepairAction } from './governanceMaintenance.js';

const MAINNET_GOVERNANCE = '0x785cc854ce9e13ce1140cbfd7c08620713e1711d';
const GOVERNANCE_CODE_HASH = '0x39381be5a244f93beb7d4f297de0f4cd7a211cb0676d67f5e4decefba4fcc0fa';
const REPAIR_TARGET = '0xd952d21b114f54c1259470b1693893f4d0dd50ed';
const REPAIR_DATA_HASH = '0x9d90c584451bdbc4214260b02891790175ec2e2a64e26fb08f86278b2abd0b9b';
export const REPAIR_224_GAS_LIMIT = 50_000_000n;

// Live mainnet execution succeeds at this ceiling while eth_estimateGas fails.
// This exception is bound to one immutable proposal, not to arbitrary repairs.
export async function prepareGovernanceExecution(multisig, txId, manifest, readProvider) {
  if (Number(txId) !== 224) {
    const estimate = await multisig.executeTransaction.estimateGas(txId);
    return { gasLimit: (BigInt(estimate) * 12000n) / 10000n };
  }

  const signer = multisig.runner;
  const walletProvider = signer?.provider;
  const provider = readProvider || walletProvider;
  if (!provider || !walletProvider || !signer?.getAddress) {
    throw new Error('Connect a founder signing wallet before executing proposal 224.');
  }
  const network = await provider.getNetwork();
  const walletNetwork = await walletProvider.getNetwork();
  const governance = await multisig.getAddress();
  if (Number(network.chainId) !== 137 || Number(walletNetwork.chainId) !== 137 ||
    governance.toLowerCase() !== MAINNET_GOVERNANCE) {
    throw new Error('Proposal 224 execution is restricted to the verified Polygon mainnet governance wallet.');
  }

  const account = await signer.getAddress();
  const block = await provider.getBlock('latest');
  if (!block || BigInt(block.gasLimit) < REPAIR_224_GAS_LIMIT) {
    throw new Error('The latest block cannot support the verified gas limit. Keep proposal 224 on hold.');
  }
  const readMultisig = multisig.connect(provider);
  const atBlock = { blockTag: block.number };
  const proposal = await readMultisig.transactions(224, atBlock);
  const action = matchedRepairAction({ ...proposal.toObject(), chainId: 137, multisig: governance }, manifest);
  if (!action || proposal.to.toLowerCase() !== REPAIR_TARGET || BigInt(proposal.value) !== 0n ||
    keccak256(proposal.data) !== REPAIR_DATA_HASH) {
    throw new Error('Proposal 224 does not match the reviewed repair. Do not execute it.');
  }
  if (proposal.executed || proposal.cancelled) {
    throw new Error('Proposal 224 has already been executed or cancelled. Do not retry.');
  }
  if (!await readMultisig.isOwner(account, atBlock)) {
    throw new Error('The connected wallet is not a founder governance owner.');
  }
  const required = BigInt(await readMultisig.requiredConfirmations(atBlock));
  if (required < 1n || BigInt(proposal.confirmations) < required ||
    BigInt(block.timestamp) < BigInt(proposal.executeAfter)) {
    throw new Error('Proposal 224 is not ready: check founder approvals and the execution timelock.');
  }
  const governanceCode = await provider.getCode(governance, block.number);
  const targetCode = await provider.getCode(proposal.to, block.number);
  const deployment = manifest.deployments?.find(item => item.address.toLowerCase() === REPAIR_TARGET);
  if (keccak256(governanceCode) !== GOVERNANCE_CODE_HASH || !deployment ||
    keccak256(targetCode) !== deployment.runtimeHash) {
    throw new Error('The live governance or repair code does not match the verified deployment. Keep execution on hold.');
  }

  const fees = await provider.getFeeData();
  if (fees.maxFeePerGas == null || fees.maxPriorityFeePerGas == null ||
    fees.maxFeePerGas <= 0n || fees.maxPriorityFeePerGas < 0n ||
    fees.maxFeePerGas < fees.maxPriorityFeePerGas) {
    throw new Error('Current Polygon transaction fees could not be verified. Keep execution on hold.');
  }
  const options = { gasLimit: REPAIR_224_GAS_LIMIT, maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas };
  const maximumCost = options.gasLimit * options.maxFeePerGas;
  const balance = await provider.getBalance(account, block.number);
  if (balance < maximumCost) {
    throw new Error(`Proposal 224 needs up to ${formatEther(maximumCost)} POL available for the current gas ceiling. This wallet has ${formatEther(balance)} POL. Use a funded founder wallet; actual cost depends on gas used.`);
  }

  // Simulate the exact outer multisig call as the actual signing owner. The repair
  // itself enforces paused targets, bound state/plan hashes and one-time execution.
  try {
    const result = await provider.call({ to: governance, from: account, value: 0n,
      data: multisig.interface.encodeFunctionData('executeTransaction', [224]),
      ...options });
    if (result !== '0x') throw new Error('Unexpected execution return data.');
  } catch {
    throw new Error('Proposal 224 simulation did not pass at the verified gas limit. Nothing was submitted. Keep 224 and 225 on hold and contact support.');
  }
  if (Number((await walletProvider.getNetwork()).chainId) !== 137 ||
    (await signer.getAddress()).toLowerCase() !== account.toLowerCase()) {
    throw new Error('The wallet changed during the check. Refresh before trying again.');
  }
  return options;
}
