import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Interface } from 'ethers';
import { REPAIR224_RELAY as relay } from '../src/constants/repair224Relay.js';
import { describeRepair224Relay, relay224ExecutionHold } from '../src/utils/governanceRelay224.js';
import { describeGovernanceMaintenance } from '../src/utils/governanceMaintenance.js';
import { proposalActionBlock } from '../src/utils/governanceProposalPolicy.js';
import { executeGovernanceTransaction } from '../src/utils/governanceExecution.js';
const abi = new Interface(['function addOwner(address)', 'function removeOwner(address)']);
const proposal = (id = 257) => ({ chainId: 137, multisig: relay.governance, txId: id,
  to: relay.governance, value: '0', data: abi.encodeFunctionData(id === 257 ? 'addOwner' : 'removeOwner', [relay.address]) });

test('only verified helper proposals receive their specific governance description', () => {
  for (const id of [257, 258]) {
    const tx = proposal(id), description = describeGovernanceMaintenance(tx);
    assert.equal(description.reviewRequired, false);
    assert.match(description.details, new RegExp(relay.address));
    assert.match(description.label, /helper/);
    for (const change of [{ to: relay.address }, { value: '1' }, { data: '0x1234' },
      { data: abi.encodeFunctionData('addOwner', [relay.governance]) }]) {
      assert.equal(describeRepair224Relay({ ...tx, ...change }).reviewRequired, true);
    }
    for (const change of [{ chainId: 80002 }, { multisig: relay.address }, { txId: 259 }]) {
      assert.equal(describeRepair224Relay({ ...tx, ...change }), null);
    }
  }
});

test('removal release is tied to the verified mined repair; later repair steps stay held', () => {
  assert.equal(relay.removalReleased, true);
  assert.equal(relay.repairExecutionBlock, 97368395);
  assert.equal(relay.repairExecutionTx, '0xf60d906cc61369abb59881abf3ebb98cf37dbf1b999e8812347ad7af5d0ceff4');
  for (const action of ['approve', 'execute']) {
    assert.equal(proposalActionBlock(proposal(258), action), '');
    assert.match(proposalActionBlock({ ...proposal(258), txId: 226 }, action), /on hold/);
    assert.match(proposalActionBlock({ ...proposal(257), executed: true }, action), /already been executed/);
  }
  assert.equal(proposalActionBlock(proposal(258), 'revoke'), '');
  assert.equal(relay224ExecutionHold(80002, relay.governance, 258), '');
  assert.equal(relay224ExecutionHold(137, relay.address, 258), '');
});

test('live repair completion and active helper authorization are checked before removal estimation', async () => {
  const provider = { getNetwork: async () => ({ chainId: 137n }) };
  let executed = false, owner = true, estimates = 0;
  const c = { getAddress: async () => relay.governance, runner: { provider },
    transactions: async id => { assert.equal(id, 224); return { executed, cancelled: false }; },
    isOwner: async address => { assert.equal(address, relay.address); return owner; },
    executeTransaction: Object.assign(async (id, options) => ({ id, options }), {
      estimateGas: async () => { estimates++; return 100000n; },
    }),
  };
  await assert.rejects(executeGovernanceTransaction(c, 258, {}, provider), /must be successfully executed/);
  executed = true; owner = false;
  await assert.rejects(executeGovernanceTransaction(c, 258, {}, provider), /no longer an owner/);
  assert.equal(estimates, 0);
  owner = true;
  assert.deepEqual(await executeGovernanceTransaction(c, 258, {}, provider), { id: 258, options: { gasLimit: 120000n } });
  assert.equal(estimates, 1);
});
