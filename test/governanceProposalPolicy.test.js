import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWithdrawnProposal, proposalActionBlock, isArchivedProposal, WITHDRAWN_ID1_PACKAGE as P } from '../src/utils/governanceProposalPolicy.js';

test('Withdraw only the exact mainnet multisig package, not Amoy or other IDs', () => {
  for (let id = 130; id <= 159; id += 1) assert(isWithdrawnProposal(137n, P.multisig.toUpperCase(), id));
  for (const id of [129, 160, null, '', undefined, 130.1]) assert(!isWithdrawnProposal(137, P.multisig, id));
  assert(!isWithdrawnProposal(80002, P.multisig, 144));
  assert(!isWithdrawnProposal(137, '0x0000000000000000000000000000000000000001', 144));
});

test('Withdrawn proposals cannot be approved/executed, but approvals can be revoked', () => {
  const tx = { withdrawn: true, cancelled: false, executed: false };
  assert.match(proposalActionBlock(tx, 'approve'), /Withdrawn/);
  assert.match(proposalActionBlock(tx, 'execute'), /cancellation is required/);
  assert.equal(proposalActionBlock(tx, 'revoke'), '');
  assert(isArchivedProposal(tx));
});

test('On-chain cancellation and execution block every mutation independently of withdrawal', () => {
  for (const tx of [{ cancelled: true }, { executed: true }]) {
    for (const action of ['approve', 'execute', 'revoke']) assert(proposalActionBlock(tx, action));
  }
  assert(isArchivedProposal({ cancelled: true }));
  assert(!isArchivedProposal({ executed: false, withdrawn: false, cancelled: false }));
  assert.equal(proposalActionBlock({}, 'approve'), '');
});
