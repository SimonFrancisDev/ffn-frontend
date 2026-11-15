import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BrowserProvider, Interface, Transaction, Wallet } from 'ethers';
import { verifySignedRepairTransaction } from '../src/utils/governanceRepairSigned.js';
import { executeGovernanceTransaction } from '../src/utils/governanceExecution.js';

const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const manifest = read('../src/constants/repairProposalManifest.json');
const runtime = read('./fixtures/governance224-runtime.json');
// Local test signer only; never connected to a live network or funded account.
const wallet = Wallet.createRandom();
const other = Wallet.createRandom();
const abi = new Interface(['function executeTransaction(uint256)']);
const accessList = [{ address: manifest.governance, storageKeys: ['0x' + '0'.repeat(64)] }];
const expected = { chainId: 137, type: 2, nonce: 42, to: manifest.governance,
  data: abi.encodeFunctionData('executeTransaction', [224]), value: 0n,
  gasLimit: 31800000n, maxFeePerGas: 500000000000n, maxPriorityFeePerGas: 25000000000n, accessList };

function fixture(change = {}) {
  const calls = { signed: 0, broadcast: 0, simulated: 0, attempts: [] };
  const proposal = { to: manifest.actions[34].target, value: 0n, data: manifest.actions[34].data,
    confirmations: 3n, executeAfter: 1n, executed: false, cancelled: false };
  proposal.toObject = () => proposal;
  const provider = {
    getNetwork: async () => ({ chainId: calls.signed && change.changedNetwork ? 80002n : 137n }),
    getBlock: async () => ({ number: 123, timestamp: 1000, gasLimit: 160000000n }),
    getCode: async a => a.toLowerCase() === manifest.governance.toLowerCase() ? runtime.governance.code : runtime.executor.code,
    getFeeData: async () => ({ maxFeePerGas: expected.maxFeePerGas, maxPriorityFeePerGas: expected.maxPriorityFeePerGas }),
    getBalance: async () => calls.signed && change.changedBalance ? 1n : 100n * 10n ** 18n,
    getTransactionCount: async (a, tag) => (change.pending && tag === 'pending') || (calls.signed && change.changedNonce) ? 43 : 42,
    send: async method => {
      if (method === 'eth_createAccessList') return { accessList };
      assert.equal(method, 'eth_estimateGas'); return '0x1d2fba0';
    },
    call: async () => { calls.simulated++; if (calls.signed && change.reverted) throw new Error('Tx failed'); return '0x'; },
    broadcastTransaction: async raw => {
      calls.broadcast++; const signed = verifySignedRepairTransaction(raw, expected, wallet.address);
      if (change.broadcastError) throw new Error('Connection lost');
      return { hash: change.wrongHash ? '0x' + '1'.repeat(64) : signed.hash };
    },
  };
  const c = {
    runner: { provider, getAddress: async () => calls.signed && change.changedAccount ? other.address : wallet.address,
      signTransaction: async tx => { calls.signed++; if (change.unsupported) throw new Error('Method not supported');
        if (change.rejected) throw Object.assign(new Error('Rejected'), { code: 4001 });
        const { from, ...unsigned } = tx;
        return wallet.signTransaction({ ...unsigned, ...(change.droppedList ? { accessList: [] } : {}) }); },
    },
    getAddress: async () => manifest.governance, interface: abi, connect: () => c,
    transactions: async () => proposal, isOwner: async () => true, requiredConfirmations: async () => 3n,
  };
  return { calls, run: () => executeGovernanceTransaction(c, 224, manifest, provider, hash => calls.attempts.push(hash)) };
}

test('verify every signed field and sender before broadcast', async () => {
  const raw = await wallet.signTransaction(expected);
  assert.equal(verifySignedRepairTransaction(raw, expected, wallet.address).from, wallet.address);
  for (const altered of [{ accessList: [] }, { nonce: 43 }, { gasLimit: 33000000n }, { value: 1n },
    { chainId: 80002 }, { to: other.address }, { maxFeePerGas: 600000000000n },
    { data: abi.encodeFunctionData('executeTransaction', [225]) },
    { accessList: [{ address: other.address, storageKeys: accessList[0].storageKeys }] }]) {
    assert.throws(() => verifySignedRepairTransaction(raw, { ...expected, ...altered }, wallet.address), /Wallet changed/);
  }
  assert.throws(() => verifySignedRepairTransaction(raw, expected, other.address), /Wallet changed/);
  for (const malformed of ['0x12', '0x' + 'ab'.repeat(131072), { raw }, 'not raw']) {
    assert.throws(() => verifySignedRepairTransaction(malformed, expected, wallet.address));
  }
  assert.throws(() => verifySignedRepairTransaction(Transaction.from(expected).unsignedSerialized, expected, wallet.address));
});

test('verified sign-only request is re-simulated and broadcast once with known hash', async () => {
  const f = fixture(); const tx = await f.run();
  assert.equal(f.calls.signed, 1); assert.equal(f.calls.broadcast, 1);
  assert.equal(f.calls.simulated, 2); assert.deepEqual(f.calls.attempts, [tx.hash]);
});

for (const [name, change] of Object.entries({
  'wallet drops access list': { droppedList: true }, 'unsupported signing': { unsupported: true },
  'signature rejected': { rejected: true }, 'pending transaction': { pending: true },
  'nonce changes': { changedNonce: true }, 'network changes': { changedNetwork: true },
  'account changes': { changedAccount: true }, 'balance changes': { changedBalance: true },
  'state reverts after signature': { reverted: true },
})) test(`${name}: nothing is broadcast`, async () => {
  const f = fixture(change); await assert.rejects(f.run());
  assert.equal(f.calls.broadcast, 0); assert.equal(f.calls.attempts.length, 0);
});

test('ambiguous broadcast is not retried and exposes the exact hash for investigation', async () => {
  for (const change of [{ broadcastError: true }, { wrongHash: true }]) {
    const f = fixture(change); await assert.rejects(f.run(), /submission is unconfirmed.*0x[0-9a-f]{64}/);
    assert.equal(f.calls.broadcast, 1); assert.equal(f.calls.attempts.length, 1);
  }
});

test('ethers sign-only wallet boundary retains fields and never calls eth_sendTransaction', async () => {
  const methods = [];
  const provider = new BrowserProvider({ request: async ({ method, params }) => {
    methods.push(method);
    if (method === 'eth_chainId') return '0x89';
    if (method === 'eth_accounts') return [wallet.address];
    assert.equal(method, 'eth_signTransaction');
    const tx = params[0]; assert.equal(tx.accessList[0].storageKeys.length, 1);
    const { from, gas, ...unsigned } = tx;
    return wallet.signTransaction({ ...unsigned, gasLimit: gas });
  } });
  try {
    const signer = await provider.getSigner();
    const raw = await signer.signTransaction(expected);
    verifySignedRepairTransaction(raw, expected, wallet.address);
    assert(!methods.includes('eth_sendTransaction'));
  } finally { provider.destroy(); }
});
