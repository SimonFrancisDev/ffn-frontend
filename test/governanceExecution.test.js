import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeGovernanceTransaction, prepareGovernanceExecution } from '../src/utils/governanceExecution.js';
import { repairExecutionHold, proposalActionBlock, WITHDRAWN_ID1_PACKAGE } from '../src/utils/governanceProposalPolicy.js';

function fixture(chainId = 137n, address = WITHDRAWN_ID1_PACKAGE.multisig) {
  const calls = { estimates: 0, simulations: 0, sends: 0 };
  const provider = { getNetwork: async () => ({ chainId }) };
  const contract = {
    runner: { provider }, getAddress: async () => address,
    executeTransaction: Object.assign(async () => { calls.sends++; }, {
      estimateGas: async () => { calls.estimates++; return 100_000n; },
      staticCall: async () => { calls.simulations++; return '0x'; },
    }),
  };
  return { calls, contract, provider };
}

test('all remaining proposals are available for approval under the single-release policy', () => {
  for (let id = 226; id <= 256; id++) {
    assert.equal(proposalActionBlock({ txId: id, chainId: 137, multisig: WITHDRAWN_ID1_PACKAGE.multisig }, 'approve'), '');
  }
});

test('even a successful unrelated simulation cannot release dependent proposals', async () => {
  const f = fixture();
  assert.equal(await f.contract.executeTransaction.staticCall(), '0x');
  await assert.rejects(prepareGovernanceExecution(f.contract, 224, {}, f.provider), /on hold/);
  assert.equal(f.calls.sends, 0);
});

test('held proposals cannot be approved or executed in the UI; revocation remains available', () => {
  for (let id = 224; id <= 256; id++) {
    if (id >= 225) continue;
    const tx = { txId: String(id), chainId: 137, multisig: WITHDRAWN_ID1_PACKAGE.multisig };
    assert.match(proposalActionBlock(tx, 'approve'), /on hold/);
    assert.match(proposalActionBlock(tx, 'execute'), /on hold/);
    assert.equal(proposalActionBlock(tx, 'revoke'), '');
  }
});

test('224 cannot fall back to ordinary wallet submission even with valid simulation', async () => {
  const f = fixture();
  await assert.rejects(prepareGovernanceExecution(f.contract, 224, {}, f.provider), /Do not retry 224/);
  assert.deepEqual(f.calls, { estimates: 0, simulations: 0, sends: 0 });
});

test('public execution entry point holds 224 before sign-only or ordinary submission', async () => {
  const f = fixture();
  f.contract.runner.signTransaction = async () => assert.fail('Must not request a signature');
  await assert.rejects(executeGovernanceTransaction(f.contract, 224, {}, f.provider), /on hold/);
  assert.deepEqual(f.calls, { estimates: 0, simulations: 0, sends: 0 });
});

test('hold is restricted to this mainnet governance package', async () => {
  for (const [chain, address, id] of [[80002n, WITHDRAWN_ID1_PACKAGE.multisig, 224],
    [137n, '0x0000000000000000000000000000000000000001', 224],
    [137n, WITHDRAWN_ID1_PACKAGE.multisig, 223], [137n, WITHDRAWN_ID1_PACKAGE.multisig, 257]]) {
    const f = fixture(chain, address);
    assert.equal(repairExecutionHold(chain, address, id), '');
    assert.deepEqual(await prepareGovernanceExecution(f.contract, id, {}, f.provider), { gasLimit: 120_000n });
    assert.equal(f.calls.estimates, 1);
    assert.equal(f.calls.sends, 0);
  }
});

test('mismatched wallet and read networks cannot bypass the hold', async () => {
  const f = fixture(80002n);
  await assert.rejects(prepareGovernanceExecution(f.contract, 224, {}, fixture().provider), /do not match/);
  assert.equal(f.calls.estimates, 0);
});

test('ordinary estimation errors are preserved without an explicit-gas fallback', async () => {
  const f = fixture();
  f.contract.executeTransaction.estimateGas = async () => { throw new Error('Tx failed'); };
  await assert.rejects(prepareGovernanceExecution(f.contract, 257, {}, f.provider), /Tx failed/);
  assert.equal(f.calls.sends, 0);
});
