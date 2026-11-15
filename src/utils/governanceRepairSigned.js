import { getBytes, isHexString, Transaction } from 'ethers';
import { MAX_PACKET_BYTES, prepareRepair224 } from './governanceRepairAccessList.js';

export function verifySignedRepairTransaction(raw, expected, from) {
  if (!isHexString(raw) || getBytes(raw).length >= MAX_PACKET_BYTES) {
    throw new Error('Wallet did not return a size-bounded signed transaction. Nothing was broadcast.');
  }
  let signed;
  try { signed = Transaction.from(raw); } catch {
    throw new Error('Wallet returned an invalid signed transaction. Nothing was broadcast.');
  }
  const prepared = Transaction.from(expected);
  if (!signed.isSigned() || signed.from.toLowerCase() !== from.toLowerCase() ||
    signed.unsignedHash !== prepared.unsignedHash) {
    throw new Error('Wallet changed the repair transaction, including its required access list. Nothing was broadcast.');
  }
  return signed;
}

// No eth_sendTransaction fallback: that method broadcasts before we can check
// whether the wallet preserved the access list (the two mined failure cases).
export async function executeSignedRepair224(multisig, manifest, readProvider, onBroadcastAttempt = () => {}) {
  const signer = multisig.runner;
  if (!signer?.signTransaction || !readProvider?.broadcastTransaction) {
    throw new Error('This repair requires sign-only wallet support and a verified read provider. Nothing was broadcast.');
  }
  const options = await prepareRepair224(multisig, manifest, readProvider);
  const from = await signer.getAddress();
  const nonce = await readProvider.getTransactionCount(from, 'latest');
  if (nonce !== await readProvider.getTransactionCount(from, 'pending')) {
    throw new Error('This founder wallet has a pending transaction. Resolve it before preparing the repair. Nothing was broadcast.');
  }
  const expected = {
    ...options, chainId: 137, nonce, to: await multisig.getAddress(), value: 0n,
    data: multisig.interface.encodeFunctionData('executeTransaction', [224]),
  };
  let raw;
  try { raw = await signer.signTransaction({ ...expected, from }); } catch (error) {
    if ([4001, 'ACTION_REJECTED'].includes(error?.code) || error?.info?.error?.code === 4001) {
      throw new Error('Repair signature declined. Nothing was broadcast.');
    }
    throw new Error('The wallet could not return a sign-only transaction for verification. Nothing was broadcast. Do not use the old execution path or disable wallet protections.');
  }
  const signed = verifySignedRepairTransaction(raw, expected, from);
  if (Number((await readProvider.getNetwork()).chainId) !== 137 ||
    Number((await signer.provider.getNetwork()).chainId) !== 137 ||
    (await signer.getAddress()).toLowerCase() !== from.toLowerCase()) {
    throw new Error('Wallet or network changed while signing. Nothing was broadcast.');
  }
  if (nonce !== await readProvider.getTransactionCount(from, 'latest') ||
    nonce !== await readProvider.getTransactionCount(from, 'pending')) {
    throw new Error('Wallet nonce changed while signing. Nothing was broadcast.');
  }
  if (await readProvider.getBalance(from) < expected.gasLimit * expected.maxFeePerGas) {
    throw new Error('Founder POL balance changed while signing. Nothing was broadcast.');
  }
  // Recheck the exact signed request against current state after wallet approval.
  const result = await readProvider.call({ ...expected, from });
  if (result !== '0x') throw new Error('Unexpected signed-repair simulation result. Nothing was broadcast.');
  onBroadcastAttempt(signed.hash);
  try {
    const response = await readProvider.broadcastTransaction(raw);
    if (response.hash.toLowerCase() !== signed.hash.toLowerCase()) throw new Error('Transaction hash mismatch');
    return response;
  } catch {
    // The request may have reached the node. Do not automatically rebroadcast.
    throw new Error(`Repair submission is unconfirmed. Check transaction ${signed.hash} before any retry.`);
  }
}
