import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Interface, zeroPadValue } from 'ethers';
import { REPAIR_INSTALL_RELEASE as release } from '../src/constants/repairInstallRelease.js';
import { REPAIR225_RELEASE } from '../src/constants/repair225Release.js';
import { REPAIR224_RELAY as relay } from '../src/constants/repair224Relay.js';
import { executeGovernanceTransaction } from '../src/utils/governanceExecution.js';
import { proposalActionBlock } from '../src/utils/governanceProposalPolicy.js';
const manifest = JSON.parse(fs.readFileSync(new URL('../src/constants/repairProposalManifest.json', import.meta.url)));
const iface = new Interface(['function upgradeToAndCall(address,bytes)', 'function setSettlementRouter(address)',
  'function settlementRouter() view returns(address)', 'function approvedImplementations(address,address) view returns(bool)',
  'function paused() view returns(bool)']);

function fixture(id = 226) {
  const action = manifest.actions.find(a => a.index === id - 190);
  const state = { transactions: {}, owners: [...REPAIR225_RELEASE.owners], helper: false, threshold: 3n,
    now: 1800000000, estimate: 200000n, estimates: 0, simulations: 0, sends: 0 };
  for (const previous of [224, 258, ...Array.from({ length: id - 225 }, (_, i) => 225 + i)]) {
    state.transactions[previous] = { executed: true, cancelled: false };
  }
  state.transactions[id] = { to: action.target, data: action.data, value: 0n, executed: false,
    cancelled: false, confirmations: 3n, executeAfter: 1790000000n };
  const provider = { getNetwork: async () => ({ chainId: 137n }), getBlock: async () => ({ timestamp: state.now }),
    getCode: async () => state.noCode ? '0x' : '0x6000',
    getStorage: async address => {
      const action = manifest.actions.find(a => a.phase === 'INSTALL' && a.target.toLowerCase() === address.toLowerCase() && a.data.startsWith('0x4f1ef286'));
      return zeroPadValue(state.badBinding ? relay.address : iface.parseTransaction({ data: action.data }).args[0], 32);
    },
    call: async request => {
      const call = iface.parseTransaction({ data: request.data });
      if (call.name === 'settlementRouter') return iface.encodeFunctionResult(call.name,
        [state.badRouter ? relay.address : iface.parseTransaction({ data: manifest.actions[41].data }).args[0]]);
      if (call.name === 'approvedImplementations') return iface.encodeFunctionResult(call.name, [Boolean(state.temporaryAllowed)]);
      if (call.name === 'paused') return iface.encodeFunctionResult(call.name, [!state.unpaused]);
      throw new Error('Unexpected read');
    },
  };
  const contract = { getAddress: async () => relay.governance, runner: { provider },
    transactions: async key => state.transactions[key], isOwner: async () => state.helper,
    getOwners: async () => state.owners, requiredConfirmations: async () => state.threshold,
    executeTransaction: Object.assign(async (key, options) => {
      assert.equal(key, id); state.sends++; return { key, options };
    }, { estimateGas: async key => { assert.equal(key, id); state.estimates++; return state.estimate; },
      staticCall: async (key, options) => {
        assert.equal(key, id); assert.equal(options.gasLimit, state.estimate * 12000n / 10000n);
        state.simulations++; if (state.revert) throw new Error('Execution reverted');
      },
    }),
  };
  return { id, state, provider, contract };
}
const execute = f => executeGovernanceTransaction(f.contract, f.id, manifest, f.provider);

test('single release is tied to verified 225 and includes every remaining proposal', () => {
  assert.equal(release.repair225Block, 97379940);
  assert.equal(release.repair225Transaction, '0x457ca9cfa5a6c02ab642e8862719384128c81bab81d817868d4eccd8047af4d8');
  for (let id = 226; id <= 256; id++) {
    const tx = { chainId: 137, multisig: relay.governance, txId: id };
    for (const action of ['approve', 'execute']) {
      assert.equal(proposalActionBlock(tx, action), '');
    }
    assert.equal(manifest.actions[id - 190].phase, id <= 236 ? 'INSTALL' : id <= 244 ? 'REVOKE' : 'REOPEN');
  }
});

test('every released proposal uses estimate, bounded simulation, then one founder send', async () => {
  for (let id = 226; id <= 256; id++) {
    const f = fixture(id);
    assert.deepEqual(await execute(f), { key: id, options: { gasLimit: 240000n } });
    assert.equal(f.state.estimates, 1); assert.equal(f.state.simulations, 1); assert.equal(f.state.sends, 1);
  }
});

test('any missing earlier execution prevents skipping ahead, including gaps before immediate predecessor', async () => {
  for (const missing of [224, 225, 226, 230, 236, 243, 245, 255, 258]) {
    const f = fixture(256); f.state.transactions[missing].executed = false;
    await assert.rejects(execute(f), new RegExp(`Execute proposal ${missing} successfully`));
    assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
  }
});

test('first reopening is blocked unless every final binding, revocation and pause is correct', async () => {
  for (const change of [{ badBinding: true }, { badRouter: true }, { noCode: true }, { temporaryAllowed: true }, { unpaused: true }]) {
    const f = fixture(245); Object.assign(f.state, change);
    await assert.rejects(execute(f), /not installed|remains active|out of sequence/);
    assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
  }
});

test('helper authorization, owner changes and threshold changes block execution', async () => {
  for (const change of [{ helper: true }, { owners: REPAIR225_RELEASE.owners.slice(1) }, { threshold: 2n }]) {
    const f = fixture(); Object.assign(f.state, change);
    await assert.rejects(execute(f), /helper|configuration has changed/);
    assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
  }
});

test('exact proposal payload and live quorum/timelock/status are required', async () => {
  for (const change of [{ executed: true }, { cancelled: true }, { confirmations: 2n },
    { executeAfter: 1900000000n }, { value: 1n }, { data: '0x1234' }, { to: relay.address }]) {
    const f = fixture(237); Object.assign(f.state.transactions[237], change);
    await assert.rejects(execute(f)); assert.equal(f.state.estimates, 0); assert.equal(f.state.sends, 0);
  }
});

test('failed simulation and unsafe estimates never reach signing or broadcast', async () => {
  for (const change of [{ revert: true }, { estimate: 0n }, { estimate: 30000000n }]) {
    const f = fixture(); Object.assign(f.state, change);
    await assert.rejects(execute(f), /reverted|gas estimate/); assert.equal(f.state.sends, 0);
  }
});

test('changed manifest, index or phase fails closed', async () => {
  for (const mutation of [m => { m.status = 'unverified'; }, m => { m.actions[36].index = 37; },
    m => { m.actions[36].phase = 'REOPEN'; }]) {
    const f = fixture(), changed = structuredClone(manifest); mutation(changed);
    await assert.rejects(executeGovernanceTransaction(f.contract, f.id, changed, f.provider), /does not match/);
    assert.equal(f.state.sends, 0);
  }
});
