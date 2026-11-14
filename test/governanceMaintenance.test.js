import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Interface } from 'ethers';
import { governanceTargets, describeGovernanceMaintenance, matchedRepairAction } from '../src/utils/governanceMaintenance.js';
import { proposalActionBlock } from '../src/utils/governanceProposalPolicy.js';

const addresses = Array.from({ length: 7 }, (_, i) => `0x${String(i + 1).padStart(40, '0')}`);
const [manager, orbit, fp, guardian, multisig, executor, implementation] = addresses;
const targets = governanceTargets({ VITE_LEVEL_MANAGER_ADDRESS: manager, VITE_P39_ORBIT_ADDRESS: orbit,
  VITE_FREEDOM_PLUS_P14_ORBIT_ADDRESS: fp, VITE_GUARDIAN_ADDRESS: guardian, VITE_MULTISIG_ADDRESS: multisig });
const abi = new Interface(['function pause()', 'function unpause()', 'function upgradeToAndCall(address,bytes)',
  'function setSettlementRouter(address)', 'function execute(bytes[4])']);
const tx = (to, fn, args = []) => ({ to, chainId: 137, multisig, value: '0', data: abi.encodeFunctionData(fn, args) });

test('shared selectors identify the actual F-Freedom/Freedom Plus/Guardian target', () => {
  for (const [address, name] of [[manager, 'F-Freedom LevelManager'], [orbit, 'F-Freedom P39 Orbit'], [fp, 'Freedom Plus P14 Orbit'], [guardian, 'Guardian']]) {
    assert.equal(describeGovernanceMaintenance(tx(address, 'pause'), targets).label, `Pause ${name}`);
    assert.equal(describeGovernanceMaintenance(tx(address, 'unpause'), targets).reviewRequired, false);
  }
  const action = describeGovernanceMaintenance(tx(fp, 'upgradeToAndCall', [implementation, '0x']), targets);
  assert.equal(action.label, 'Upgrade Freedom Plus P14 Orbit');
  assert.equal(action.proxyAddress, fp);
  assert.equal(action.implementationAddress, implementation);
  assert.equal(action.category, 'Upgrade');
});

test('unknown targets, wrong contract kinds and attached value cannot masquerade as safe maintenance', () => {
  for (const proposal of [tx(executor, 'pause'), tx(multisig, 'pause'), tx(guardian, 'upgradeToAndCall', [implementation, '0x']),
    { ...tx(orbit, 'pause'), value: '1' }, tx(fp, 'setSettlementRouter', [implementation])]) {
    const action = describeGovernanceMaintenance(proposal, targets);
    assert.equal(action.reviewRequired, true);
    assert(proposalActionBlock(action, 'approve'));
    assert(proposalActionBlock(action, 'execute'));
    assert.equal(proposalActionBlock(action, 'revoke'), '');
  }
  assert.equal(describeGovernanceMaintenance(tx(manager, 'setSettlementRouter', [implementation]), targets).reviewRequired, false);
});

test('repair requires an exact verified mainnet target/value/calldata manifest, never a fork prediction', () => {
  const proposal = tx(executor, 'execute', [['0x12', '0x34', '0x56', '0x78']]);
  const action = { target: executor, value: '0', data: proposal.data, label: 'Restore reviewed placements', program: 'Freedom Plus', phase: 'REPAIR' };
  const manifest = { status: 'verified-mainnet-deployments', chainId: 137, governance: multisig, actions: [action] };
  assert.equal(describeGovernanceMaintenance(proposal, targets, manifest).label, action.label);
  assert.equal(describeGovernanceMaintenance(proposal, targets, manifest).reviewRequired, false);
  for (const change of [{ chainId: 80002 }, { multisig: manager }, { to: manager }, { value: '1' },
    { data: abi.encodeFunctionData('execute', [['0x99', '0x34', '0x56', '0x78']]) }]) {
    assert.equal(matchedRepairAction({ ...proposal, ...change }, manifest), null);
  }
  for (const status of ['unsigned-template-not-live-deployed-or-submitted', 'awaiting-verified-mainnet-deployments']) {
    assert.equal(describeGovernanceMaintenance(proposal, targets, { ...manifest, status }).reviewRequired, true);
  }
  assert.equal(describeGovernanceMaintenance(proposal, targets).reviewRequired, true);
});

test('canonical manager environment name takes precedence and malformed calldata does not crash', () => {
  assert.equal(governanceTargets({ VITE_LEVEL_MANAGER_ADDRESS: manager, VITE_LEVELMANAGER_ADDRESS: orbit })[manager].kind, 'manager');
  assert.deepEqual(governanceTargets({ VITE_GUARDIAN_ADDRESS: 'not-an-address' }), {});
  assert.equal(describeGovernanceMaintenance({ data: '0x1234' }, targets), null);
});

test('published mainnet repair manifest recognizes the two exact deployed executor plans', () => {
  const manifest = JSON.parse(readFileSync(new URL('../src/constants/repairProposalManifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.status, 'verified-mainnet-deployments');
  assert.equal(manifest.chainId, 137);
  assert.equal(manifest.deployments.length, 11);
  assert.equal(new Set(manifest.deployments.map(d => d.address.toLowerCase())).size, 11);
  assert.equal(manifest.actions.length, 67);
  assert(manifest.actions.every(a => a.value === '0'));
  const repairs = manifest.actions.filter(a => a.phase === 'REPAIR');
  assert.equal(repairs.length, 2);
  for (const action of repairs) {
    const deployed = manifest.deployments.find(d => d.address.toLowerCase() === action.target.toLowerCase());
    assert(deployed && /^0x[0-9a-f]{64}$/i.test(deployed.txHash));
    const proposal = { to: action.target, value: action.value, data: action.data, chainId: 137, multisig: manifest.governance };
    const decoded = describeGovernanceMaintenance(proposal, {}, manifest);
    assert.equal(decoded.reviewRequired, false);
    assert.equal(decoded.label, action.label);
    assert.equal(matchedRepairAction({ ...proposal, chainId: 80002 }, manifest), null);
  }
});
