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

test('authorize is available; premature removal is held; revocation stays available', () => {
  for (const action of ['approve', 'execute']) {
    assert.equal(proposalActionBlock(proposal(), action), '');
    assert.match(proposalActionBlock(proposal(258), action), /until proposal 224 succeeds/);
  }
  assert.equal(proposalActionBlock(proposal(258), 'revoke'), '');
  assert.equal(relay224ExecutionHold(80002, relay.governance, 258), '');
  assert.equal(relay224ExecutionHold(137, relay.address, 258), '');
});

test('public execution also blocks removal before gas estimation or submission', async () => {
  const provider = { getNetwork: async () => ({ chainId: 137n }) };
  const c = { getAddress: async () => relay.governance, runner: { provider },
    executeTransaction: Object.assign(async () => assert.fail('Unexpected submission'), {
      estimateGas: async () => assert.fail('Unexpected estimate'),
    }),
  };
  await assert.rejects(executeGovernanceTransaction(c, 258, {}, provider), /until proposal 224 succeeds/);
});
