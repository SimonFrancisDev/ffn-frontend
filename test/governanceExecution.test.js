import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Interface } from 'ethers';
import { prepareGovernanceExecution, REPAIR_224_GAS_LIMIT } from '../src/utils/governanceExecution.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = readJson('../src/constants/repairProposalManifest.json');
const runtime = readJson('./fixtures/governance224-runtime.json');
const action = manifest.actions[34];
const owner = '0x04eaa54e7896C24aF2622b804Bf35E4C662bf12f';
const abi = new Interface(['function executeTransaction(uint256)']);

function fixture(change = {}) {
  const calls = { estimates: 0, simulations: [], sends: 0 };
  const proposal = { to: action.target, value: 0n, data: action.data,
    executed: false, cancelled: false, confirmations: 3n, executeAfter: 1n,
    ...change.proposal };
  proposal.toObject = () => ({ ...proposal });
  const provider = {
    getNetwork: async () => ({ chainId: change.chainId ?? 137n }),
    getBlock: async () => change.block === null ? null : ({ number: 123, timestamp: 1000,
      gasLimit: 160_000_000n, ...change.block }),
    getCode: async address => address.toLowerCase() === manifest.governance.toLowerCase()
      ? (change.governanceCode ?? runtime.governance.code) : (change.targetCode ?? runtime.executor.code),
    getFeeData: async () => ({ maxFeePerGas: 500_000_000_000n, maxPriorityFeePerGas: 35_000_000_000n, ...change.fees }),
    getBalance: async () => change.balance ?? 100n * 10n ** 18n,
    call: async tx => {
      calls.simulations.push(tx);
      if (change.simulationError) throw change.simulationError;
      return change.simulationResult ?? '0x';
    },
  };
  const walletProvider = { getNetwork: async () => ({ chainId: change.walletChainId ?? 137n }) };
  const contract = {
    runner: { provider: walletProvider, getAddress: async () => owner },
    getAddress: async () => change.governance ?? manifest.governance,
    connect: p => { assert.equal(p, provider); return contract; },
    interface: abi,
    transactions: async (id, overrides) => {
      assert.equal(id, 224); assert.equal(overrides.blockTag, 123); return proposal;
    },
    isOwner: async account => { assert.equal(account, owner); return change.isOwner ?? true; },
    requiredConfirmations: async () => change.required ?? 3n,
    executeTransaction: Object.assign(async () => { calls.sends++; }, {
      estimateGas: async () => { calls.estimates++; if (change.estimateError) throw change.estimateError; return 100_000n; },
    }),
  };
  return { calls, provider, contract, run: (id = 224, m = manifest) => prepareGovernanceExecution(contract, id, m, provider) };
}

test('exact mainnet 224 skips broken estimation but simulates the outer call as the real owner', async () => {
  const f = fixture({ estimateError: new Error('Tx failed') });
  const options = await f.run();
  assert.equal(options.gasLimit, REPAIR_224_GAS_LIMIT);
  assert.equal(options.maxFeePerGas, 500_000_000_000n);
  assert.equal(options.maxPriorityFeePerGas, 35_000_000_000n);
  assert.equal(f.calls.estimates, 0);
  assert.equal(f.calls.sends, 0);
  assert.deepEqual(f.calls.simulations, [{ to: manifest.governance, from: owner, value: 0n,
    data: abi.encodeFunctionData('executeTransaction', [224]), ...options }]);
});

test('all other proposals retain normal estimation and the existing 20% buffer', async () => {
  for (const id of [130, 223, 225, 226, 245]) {
    const f = fixture();
    assert.deepEqual(await f.run(id), { gasLimit: 120_000n });
    assert.equal(f.calls.estimates, 1);
    assert.equal(f.calls.simulations.length, 0);
    assert.equal(f.calls.sends, 0);
  }
  const failure = new Error('ordinary estimate failed');
  await assert.rejects(fixture({ estimateError: failure }).run(225), failure);
});

for (const [name, change, error] of [
  ['Amoy read RPC', { chainId: 80002n }, /mainnet/],
  ['Amoy signing wallet', { walletChainId: 80002n }, /mainnet/],
  ['different governance', { governance: owner }, /mainnet/],
  ['different repair target', { proposal: { to: owner } }, /reviewed repair/],
  ['different calldata', { proposal: { data: '0x1234' } }, /reviewed repair/],
  ['attached native funds', { proposal: { value: 1n } }, /reviewed repair/],
  ['already executed', { proposal: { executed: true } }, /already/],
  ['cancelled', { proposal: { cancelled: true } }, /already/],
  ['non-owner', { isOwner: false }, /not a founder/],
  ['missing quorum', { proposal: { confirmations: 2n } }, /not ready/],
  ['unexpired timelock', { proposal: { executeAfter: 2000n } }, /not ready/],
  ['invalid quorum', { required: 0n }, /not ready/],
  ['missing block', { block: null }, /latest block/],
  ['insufficient block gas', { block: { gasLimit: 49_999_999n } }, /latest block/],
  ['wrong governance code', { governanceCode: '0x00' }, /live governance/],
  ['wrong executor code', { targetCode: '0x00' }, /live governance/],
  ['missing fee data', { fees: { maxFeePerGas: null } }, /fees/],
  ['invalid fee data', { fees: { maxFeePerGas: 1n } }, /fees/],
  ['underfunded signer', { balance: 5n * 10n ** 18n }, /needs up to 25.0 POL/],
]) {
  test(`224 fails closed for ${name}`, async () => {
    const f = fixture(change);
    await assert.rejects(f.run(), error);
    assert.equal(f.calls.simulations.length, 0);
    assert.equal(f.calls.sends, 0);
  });
}

test('absent or altered manifest cannot authorize the special gas path', async () => {
  for (const m of [{}, { ...manifest, status: 'unverified' }, { ...manifest, chainId: 80002 },
    { ...manifest, actions: [] }, { ...manifest, deployments: [] }]) {
    const f = fixture();
    await assert.rejects(f.run(224, m), /reviewed repair|live governance/);
    assert.equal(f.calls.sends, 0);
  }
});

test('failed or malformed simulation never returns signing options', async () => {
  for (const change of [{ simulationError: new Error('Tx failed') },
    { simulationError: new Error('RPC timeout') }, { simulationResult: '0x00' }]) {
    const f = fixture(change);
    await assert.rejects(f.run(), /simulation did not pass/);
    assert.equal(f.calls.simulations.length, 1);
    assert.equal(f.calls.sends, 0);
  }
});

test('wallet network change during simulation blocks signing', async () => {
  const f = fixture();
  let reads = 0;
  f.contract.runner.provider.getNetwork = async () => ({ chainId: ++reads === 1 ? 137n : 80002n });
  await assert.rejects(f.run(), /wallet changed/);
});

test('signer change during simulation blocks signing', async () => {
  const f = fixture();
  let reads = 0;
  f.contract.runner.getAddress = async () => ++reads === 1 ? owner : action.target;
  await assert.rejects(f.run(), /wallet changed/);
});
