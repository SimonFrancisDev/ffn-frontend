import { formatEther, getBytes, isAddress, isHexString, keccak256, toQuantity, Transaction } from 'ethers';
import { matchedRepairAction } from './governanceMaintenance.js';

const GOVERNANCE = '0x785cc854ce9e13ce1140cbfd7c08620713e1711d';
const GOVERNANCE_HASH = '0x39381be5a244f93beb7d4f297de0f4cd7a211cb0676d67f5e4decefba4fcc0fa';
const EXECUTOR = '0xd952d21b114f54c1259470b1693893f4d0dd50ed';
const PAYLOAD_HASH = '0x9d90c584451bdbc4214260b02891790175ec2e2a64e26fb08f86278b2abd0b9b';
export const REPAIR_GAS_LIMIT = 31_800_000n;
export const MAX_ACCESS_KEYS = 3900;
export const MAX_PACKET_BYTES = 128 * 1024;

export function boundedRepairAccessList(list) {
  if (!Array.isArray(list) || list.length === 0 || list.length > 32) throw new Error('Invalid repair access list.');
  const accounts = new Set();
  let count = 0;
  const normalized = list.map(entry => {
    if (!isAddress(entry.address) || !Array.isArray(entry.storageKeys)) throw new Error('Invalid repair access-list entry.');
    const address = entry.address.toLowerCase();
    if (accounts.has(address)) throw new Error('Duplicate repair access-list account.');
    accounts.add(address);
    const keys = new Set();
    for (const key of entry.storageKeys) {
      if (!isHexString(key, 32) || keys.has(key.toLowerCase())) throw new Error('Invalid or duplicate repair storage key.');
      keys.add(key.toLowerCase());
    }
    count += keys.size;
    if (count > 10000) throw new Error('Repair access list exceeds the reviewed bound.');
    return { address, storageKeys: [...keys].sort() };
  });
  normalized.sort((a, b) => a.address === GOVERNANCE ? -1 : b.address === GOVERNANCE ? 1 : a.address.localeCompare(b.address));
  let remaining = MAX_ACCESS_KEYS;
  return normalized.map(entry => {
    const storageKeys = entry.storageKeys.slice(0, remaining);
    remaining -= storageKeys.length;
    return { address: entry.address, storageKeys };
  }).filter(entry => entry.storageKeys.length);
}

export async function prepareRepair224(multisig, manifest, readProvider) {
  const signer = multisig.runner;
  const provider = readProvider || signer?.provider;
  if (!provider?.send || !signer?.getAddress || !signer.provider) throw new Error('A founder signing wallet and access-list-capable read RPC are required.');
  const address = await multisig.getAddress();
  const network = await provider.getNetwork();
  const walletNetwork = await signer.provider.getNetwork();
  if (Number(network.chainId) !== 137 || Number(walletNetwork.chainId) !== 137 || address.toLowerCase() !== GOVERNANCE) {
    throw new Error('Repair 224 is restricted to the verified Polygon mainnet governance wallet.');
  }
  const from = await signer.getAddress();
  const block = await provider.getBlock('latest');
  if (!block || BigInt(block.gasLimit) < REPAIR_GAS_LIMIT) throw new Error('Current block gas capacity could not be verified.');
  const at = { blockTag: block.number };
  const reader = multisig.connect(provider);
  const proposal = await reader.transactions(224, at);
  if (!matchedRepairAction({ ...proposal.toObject(), chainId: 137, multisig: address }, manifest) ||
    proposal.to.toLowerCase() !== EXECUTOR || proposal.value !== 0n || keccak256(proposal.data) !== PAYLOAD_HASH) {
    throw new Error('Proposal 224 does not match the exact reviewed repair.');
  }
  if (proposal.executed || proposal.cancelled) throw new Error('Proposal 224 has already executed or been cancelled. Do not retry.');
  if (!await reader.isOwner(from, at)) throw new Error('The connected wallet is not a governance owner.');
  const required = BigInt(await reader.requiredConfirmations(at));
  if (required < 1n || proposal.confirmations < required || BigInt(block.timestamp) < proposal.executeAfter) {
    throw new Error('Proposal 224 still requires approvals or timelock expiry.');
  }
  const executor = manifest.deployments?.find(item => item.address.toLowerCase() === EXECUTOR);
  if (keccak256(await provider.getCode(address, block.number)) !== GOVERNANCE_HASH || !executor ||
    keccak256(await provider.getCode(proposal.to, block.number)) !== executor.runtimeHash) {
    throw new Error('The live repair or governance bytecode does not match the verified deployment.');
  }
  const fees = await provider.getFeeData();
  if (fees.maxFeePerGas == null || fees.maxPriorityFeePerGas == null || fees.maxFeePerGas <= 0n ||
    fees.maxPriorityFeePerGas < 0n || fees.maxFeePerGas < fees.maxPriorityFeePerGas) throw new Error('Current Polygon fees could not be verified.');
  const maximumFee = REPAIR_GAS_LIMIT * fees.maxFeePerGas;
  if (await provider.getBalance(from, block.number) < maximumFee) {
    throw new Error(`This founder wallet needs up to ${formatEther(maximumFee)} POL available for the current gas reservation. Actual fees depend on gas used.`);
  }
  const data = multisig.interface.encodeFunctionData('executeTransaction', [224]);
  const base = { from, to: address, data, value: '0x0' };
  // This oversized call only discovers storage accesses. It is never submitted.
  // The resulting list is size-bounded, then independently estimated/simulated
  // with the actual 31.8-million signing ceiling, below the conservative 32M cap.
  const discovered = await provider.send('eth_createAccessList', [{ ...base, gas: toQuantity(50_000_000) }, toQuantity(block.number)]);
  if (discovered.error) throw new Error('Repair access-list discovery failed. No transaction was requested.');
  const accessList = boundedRepairAccessList(discovered.accessList);
  if (!accessList.length) throw new Error('Repair access list is empty. No transaction was requested.');
  const options = { type: 2, gasLimit: REPAIR_GAS_LIMIT, maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas, accessList };
  const unsigned = Transaction.from({ chainId: 137, to: address, data, value: 0n, ...options });
  if (getBytes(unsigned.unsignedSerialized).length + 128 >= MAX_PACKET_BYTES) {
    throw new Error('Repair transaction exceeds the conservative packet-size limit.');
  }
  const request = { ...base, type: '0x2', gas: toQuantity(options.gasLimit), accessList,
    maxFeePerGas: toQuantity(options.maxFeePerGas), maxPriorityFeePerGas: toQuantity(options.maxPriorityFeePerGas) };
  const estimated = BigInt(await provider.send('eth_estimateGas', [request, toQuantity(block.number)]));
  if (estimated <= 0n || estimated > REPAIR_GAS_LIMIT) throw new Error('Repair gas estimate exceeds the validated ceiling. No transaction was requested.');
  const result = await provider.call({ from, to: address, data, value: 0n, ...options });
  if (result !== '0x') throw new Error('Unexpected repair simulation response. No transaction was requested.');
  if (Number((await signer.provider.getNetwork()).chainId) !== 137 ||
    (await signer.getAddress()).toLowerCase() !== from.toLowerCase()) throw new Error('Wallet changed during repair validation. Refresh before continuing.');
  return options;
}

export function governanceExecutionFailure(error, fallback) {
  if (!/coalesce/i.test(error?.shortMessage || error?.message || '')) return fallback;
  const nested = error?.info?.error?.message || error?.error?.message || error?.data?.originalError?.message;
  if (typeof nested !== 'string' || !nested.trim()) return fallback;
  const detail = nested.replace(/https?:\/\/\S+/g, '[RPC endpoint]').replace(/0x[0-9a-f]{64,}/gi, '[transaction data]').slice(0, 500);
  return `Wallet/RPC response: ${detail}. Check wallet activity before retrying; submission status is not confirmed.`;
}
