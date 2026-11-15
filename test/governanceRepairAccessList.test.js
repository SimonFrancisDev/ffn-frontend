import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BrowserProvider, Interface, getBytes, toQuantity, Transaction } from 'ethers';
import { prepareGovernanceExecution } from '../src/utils/governanceExecution.js';
import { boundedRepairAccessList, prepareRepair224, governanceExecutionFailure, REPAIR_GAS_LIMIT, MAX_ACCESS_KEYS, MAX_PACKET_BYTES } from '../src/utils/governanceRepairAccessList.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const manifest = read('../src/constants/repairProposalManifest.json');
const runtime = read('./fixtures/governance224-runtime.json');
const action = manifest.actions[34];
const owner = '0x04eaa54e7896C24aF2622b804Bf35E4C662bf12f';
const abi = new Interface(['function executeTransaction(uint256)']);
const key = i => '0x' + i.toString(16).padStart(64, '0');
const fullList = [{ address: action.target, storageKeys: Array.from({ length: 2000 }, (_, i) => key(i)) },
  { address: manifest.governance, storageKeys: Array.from({ length: 3940 }, (_, i) => key(i)) }];

function fixture(change = {}) {
  const calls = { discovery: [], estimates: [], simulations: [], sends: 0 };
  const proposal = { to: action.target, value: 0n, data: action.data, confirmations: 3n,
    executeAfter: 1n, executed: false, cancelled: false, ...change.proposal };
  proposal.toObject = () => ({ ...proposal });
  const provider = {
    getNetwork: async () => ({ chainId: change.chainId ?? 137n }),
    getBlock: async () => ({ number: 123, timestamp: 1000, gasLimit: change.blockGas ?? 160_000_000n }),
    getCode: async address => address.toLowerCase() === manifest.governance.toLowerCase()
      ? change.govCode ?? runtime.governance.code : change.code ?? runtime.executor.code,
    getFeeData: async () => ({ maxFeePerGas: 500_000_000_000n, maxPriorityFeePerGas: 25_000_000_000n, ...change.fees }),
    getBalance: async () => change.balance ?? 100n * 10n ** 18n,
    send: async (method, args) => {
      assert.equal(args[1], '0x7b');
      if (method === 'eth_createAccessList') {
        calls.discovery.push(args[0]);
        if (change.discoveryError) throw change.discoveryError;
        return change.discovery ?? { accessList: fullList };
      }
      assert.equal(method, 'eth_estimateGas'); calls.estimates.push(args[0]);
      if (change.estimateError) throw change.estimateError;
      return toQuantity(change.estimate ?? 31_000_000n);
    },
    call: async tx => {
      calls.simulations.push(tx);
      if (change.simulationError) throw change.simulationError;
      return change.simulationResult ?? '0x';
    },
  };
  const c = { runner: { provider: { getNetwork: async () => ({ chainId: change.walletChain ?? 137n }) }, getAddress: async () => owner },
    getAddress: async () => change.governance ?? manifest.governance, interface: abi,
    connect: p => { assert.equal(p, provider); return c; },
    transactions: async (id, options) => { assert.equal(id, 224); assert.equal(options.blockTag, 123); return proposal; },
    isOwner: async () => change.isOwner ?? true, requiredConfirmations: async () => change.required ?? 3n,
    executeTransaction: async () => { calls.sends++; },
  };
  return { calls, provider, c, run: () => prepareRepair224(c, change.manifest ?? manifest, provider) };
}

test('full public entry point prepares unchanged 224 with gas and packet bounded below both limits', async () => {
  const f = fixture();
  const options = await prepareGovernanceExecution(f.c, 224, manifest, f.provider);
  assert.equal(options.type, 2);
  assert.equal(options.gasLimit, REPAIR_GAS_LIMIT);
  assert(options.gasLimit < 32_000_000n);
  assert.equal(options.accessList.reduce((n, a) => n + a.storageKeys.length, 0), MAX_ACCESS_KEYS);
  assert.equal(f.calls.discovery[0].gas, toQuantity(50_000_000));
  assert.equal(f.calls.estimates[0].gas, toQuantity(REPAIR_GAS_LIMIT));
  assert.deepEqual(f.calls.estimates[0].accessList, options.accessList);
  assert.equal(f.calls.simulations[0].from, owner);
  assert.equal(f.calls.simulations[0].to, manifest.governance);
  assert.equal(f.calls.simulations[0].data, abi.encodeFunctionData('executeTransaction', [224]));
  assert.equal(f.calls.simulations[0].value, 0n);
  assert.equal(f.calls.simulations[0].gasLimit, REPAIR_GAS_LIMIT);
  assert.equal(f.calls.sends, 0);
  const packet = Transaction.from({ chainId: 137, to: manifest.governance,
    data: f.calls.simulations[0].data, value: 0n, ...options });
  assert(getBytes(packet.unsignedSerialized).length + 128 < MAX_PACKET_BYTES);
  // Verify ethers keeps the access list in the actual EIP-1193 wallet payload.
  const wallet = new BrowserProvider({ request: async () => { throw new Error('No live wallet calls permitted'); } });
  const rpc = wallet.getRpcTransaction({ ...f.calls.simulations[0] });
  assert.deepEqual(rpc.accessList.map(entry => ({ ...entry, address: entry.address.toLowerCase() })), options.accessList);
  assert.equal(rpc.gas, toQuantity(REPAIR_GAS_LIMIT));
  assert.equal(rpc.type, '0x2'); wallet.destroy();
});

test('bounded list is deterministic, governance first, and does not mutate its input', () => {
  const input = JSON.stringify(fullList);
  const bounded = boundedRepairAccessList(fullList);
  assert.equal(bounded[0].address, manifest.governance.toLowerCase());
  assert.deepEqual(bounded, boundedRepairAccessList([...fullList].reverse()));
  assert.equal(JSON.stringify(fullList), input);
});

test('malformed, duplicate or excessive access lists are rejected', () => {
  for (const list of [null, [], [{ address: owner, storageKeys: ['0x01'] }],
    [{ address: owner, storageKeys: [key(1), key(1)] }],
    [{ address: owner, storageKeys: [] }, { address: owner, storageKeys: [] }],
    [{ address: 'invalid', storageKeys: [] }],
    [{ address: owner, storageKeys: Array.from({ length: 10001 }, (_, i) => key(i)) }]]) {
    assert.throws(() => boundedRepairAccessList(list));
  }
});

for (const [name, change, error] of [
  ['wrong read network', { chainId: 80002n }, /mainnet/],
  ['wrong signing network', { walletChain: 80002n }, /mainnet/],
  ['wrong governance', { governance: owner }, /mainnet/],
  ['wrong target', { proposal: { to: owner } }, /exact reviewed/],
  ['wrong data', { proposal: { data: '0x1234' } }, /exact reviewed/],
  ['nonzero native value', { proposal: { value: 1n } }, /exact reviewed/],
  ['missing manifest', { manifest: {} }, /exact reviewed/],
  ['executed', { proposal: { executed: true } }, /already/],
  ['cancelled', { proposal: { cancelled: true } }, /already/],
  ['not owner', { isOwner: false }, /not a governance owner/],
  ['quorum missing', { proposal: { confirmations: 2n } }, /approvals/],
  ['timelocked', { proposal: { executeAfter: 2000n } }, /timelock/],
  ['invalid threshold', { required: 0n }, /approvals/],
  ['wrong governance runtime', { govCode: '0x' }, /bytecode/],
  ['wrong executor runtime', { code: '0x' }, /bytecode/],
  ['insufficient block gas', { blockGas: 30_000_000n }, /block gas/],
  ['missing fee', { fees: { maxFeePerGas: null } }, /fees/],
  ['invalid fee', { fees: { maxFeePerGas: 1n } }, /fees/],
  ['underfunded wallet', { balance: 1n }, /POL available/],
  ['failed discovery', { discovery: { error: 'execution reverted' } }, /discovery failed/],
  ['unsupported discovery', { discoveryError: new Error('method unsupported') }, /unsupported/],
  ['empty list', { discovery: { accessList: [{ address: owner, storageKeys: [] }] } }, /empty/],
  ['oversized estimate', { estimate: 32_000_000n }, /estimate exceeds/],
  ['zero estimate', { estimate: 0n }, /estimate exceeds/],
  ['failed estimate', { estimateError: new Error('RPC estimate failed') }, /estimate failed/],
  ['failed final simulation', { simulationError: new Error('Tx failed') }, /Tx failed/],
  ['malformed simulation', { simulationResult: '0x01' }, /Unexpected/],
]) {
  test(`no signing options returned for ${name}`, async () => {
    const f = fixture(change); await assert.rejects(f.run(), error); assert.equal(f.calls.sends, 0);
  });
}

test('changed account or chain during preflight stops execution', async () => {
  for (const field of ['account', 'network']) {
    const f = fixture(); let reads = 0;
    if (field === 'account') f.c.runner.getAddress = async () => ++reads === 1 ? owner : action.target;
    else f.c.runner.provider.getNetwork = async () => ({ chainId: ++reads === 1 ? 137n : 80002n });
    await assert.rejects(f.run(), /Wallet changed/);
  }
});

test('nested RPC error is visible instead of the unhelpful coalescing wrapper', () => {
  const msg = governanceExecutionFailure({ shortMessage: 'could not coalesce error', info: { error: { message: 'transaction gas limit exceeds maximum' } } }, 'fallback');
  assert.match(msg, /transaction gas limit exceeds maximum/);
  assert.match(msg, /submission status is not confirmed/);
  assert.equal(governanceExecutionFailure({ message: 'User rejected' }, 'fallback'), 'fallback');
  const scrubbed = governanceExecutionFailure({ message: 'could not coalesce', error: { message: `error https://private.rpc/key ${key(1)}` } }, 'fallback');
  assert(!scrubbed.includes('private.rpc') && !scrubbed.includes(key(1)));
});
