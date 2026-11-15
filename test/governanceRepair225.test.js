import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { keccak256 } from 'ethers';
import { REPAIR225_RELEASE as release } from '../src/constants/repair225Release.js';
import { REPAIR224_RELAY as relay } from '../src/constants/repair224Relay.js';
import { executeGovernanceTransaction, prepareGovernanceExecution } from '../src/utils/governanceExecution.js';
import { proposalActionBlock } from '../src/utils/governanceProposalPolicy.js';
const liveManifest = JSON.parse(fs.readFileSync(new URL('../src/constants/repairProposalManifest.json', import.meta.url)));

function fixture() {
  const manifest = structuredClone(liveManifest);
  const action = manifest.actions.find(row => row.index === 35);
  manifest.deployments.find(row => row.address === release.target).runtimeHash = keccak256('0x6000');
  const state = { helperOwner: false, owners: [...release.owners], threshold: 3n, estimate: 9_500_000n,
    code: '0x6000', timestamp: 1800000000, estimates: 0, simulations: 0, sends: 0,
    transactions: { 224: { executed: true, cancelled: false }, 258: { executed: true, cancelled: false },
      225: { to: action.target, value: 0n, data: action.data, executed: false, cancelled: false,
        confirmations: 3n, executeAfter: 1790000000n } } };
  const provider = { getNetwork: async () => ({ chainId: 137n }), getCode: async () => state.code,
    getBlock: async () => ({ timestamp: state.timestamp }) };
  const contract = { runner: { provider }, getAddress: async () => relay.governance,
    transactions: async id => state.transactions[id],
    isOwner: async address => { assert.equal(address, relay.address); return state.helperOwner; },
    getOwners: async () => state.owners, requiredConfirmations: async () => state.threshold,
    executeTransaction: Object.assign(async (id, options) => { state.sends++; return { id, options }; }, {
      estimateGas: async id => { assert.equal(id, 225); state.estimates++; return state.estimate; },
      staticCall: async (id, options) => {
        assert.equal(id, 225); assert.deepEqual(options, { gasLimit: state.estimate * 12000n / 10000n });
        state.simulations++; if (state.revert) throw new Error('RepairStateChanged');
      },
    }),
  };
  return { state, manifest, contract, provider };
}

test('225 release is pinned to the actual approved mainnet proposal and removal receipt', () => {
  const action = liveManifest.actions.find(row => row.index === 35);
  assert.equal(action.target, release.target);
  assert.equal(keccak256(action.data), release.payloadHash);
  assert.equal(release.verifiedBlock, 97378141);
  assert.equal(release.removalTransaction, '0x36762ab1aa374d949b25170b0a54e1ae8d6f544a2446fbed7a7ae3952ba6e0a4');
  const tx = { chainId: 137, multisig: relay.governance, txId: 225 };
  assert.equal(proposalActionBlock(tx, 'approve'), '');
  assert.equal(proposalActionBlock(tx, 'execute'), '');
  assert.match(proposalActionBlock({ ...tx, executed: true }, 'execute'), /already been executed/);
  for (let id = 226; id <= 256; id++) assert.equal(proposalActionBlock({ ...tx, txId: id }, 'approve'), '');
});

test('225 executes through the ordinary founder path only after bounded simulation', async () => {
  const f = fixture();
  assert.deepEqual(await executeGovernanceTransaction(f.contract, 225, f.manifest, f.provider),
    { id: 225, options: { gasLimit: 11_400_000n } });
  assert.equal(f.state.estimates, 1); assert.equal(f.state.simulations, 1); assert.equal(f.state.sends, 1);
});

for (const id of [224, 258]) {
  test(`225 is blocked when prerequisite ${id} is not executed`, async () => {
    const f = fixture(); f.state.transactions[id].executed = false;
    await assert.rejects(executeGovernanceTransaction(f.contract, 225, f.manifest, f.provider), /must be successfully executed/);
    assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
  });
}

test('225 fails closed for any helper or founder governance configuration change', async () => {
  for (const change of [{ helperOwner: true }, { owners: [...release.owners, relay.address] },
    { owners: release.owners.slice(1) }, { threshold: 2n }]) {
    const f = fixture(); Object.assign(f.state, change);
    await assert.rejects(prepareGovernanceExecution(f.contract, 225, f.manifest, f.provider), /helper|four-owner/);
    assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
  }
});

test('225 checks live status, approvals, timelock, exact target, value and payload', async () => {
  for (const change of [{ executed: true }, { cancelled: true }, { confirmations: 2n },
    { executeAfter: 1900000000n }, { to: relay.address }, { value: 1n }, { data: '0x1234' }]) {
    const f = fixture(); Object.assign(f.state.transactions[225], change);
    await assert.rejects(executeGovernanceTransaction(f.contract, 225, f.manifest, f.provider));
    assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
  }
});

test('225 rejects missing/mismatched manifest and executor runtime', async () => {
  for (const mode of ['manifest', 'actionIndex', 'runtime', 'deployment']) {
    const f = fixture();
    if (mode === 'manifest') f.manifest.status = 'unverified';
    if (mode === 'actionIndex') f.manifest.actions[35].index = 34;
    if (mode === 'runtime') f.state.code = '0x6001';
    if (mode === 'deployment') f.manifest.deployments = [];
    await assert.rejects(executeGovernanceTransaction(f.contract, 225, f.manifest, f.provider), /does not match/);
    assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
  }
});

test('225 never broadcasts on out-of-bound gas or failed simulation', async () => {
  for (const change of [{ estimate: 0n }, { estimate: 30_000_000n }, { revert: true }]) {
    const f = fixture(); Object.assign(f.state, change);
    await assert.rejects(executeGovernanceTransaction(f.contract, 225, f.manifest, f.provider), /gas estimate|RepairStateChanged/);
    assert.equal(f.state.sends, 0);
  }
});

test('225 checks wallet/read network agreement before any execution preparation', async () => {
  const f = fixture();
  await assert.rejects(executeGovernanceTransaction(f.contract, 225, f.manifest,
    { getNetwork: async () => ({ chainId: 80002n }) }), /do not match/);
  assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
});
