import { Interface, isAddress, keccak256 } from 'ethers';
import { describeRepair224Relay } from './governanceRelay224.js';

const iface = new Interface([
  'function pause()', 'function unpause()',
  'function upgradeTo(address implementation)',
  'function upgradeToAndCall(address implementation,bytes data)',
  'function setSettlementRouter(address router)',
  'function execute(bytes[4] plans)',
]);
const lower = value => String(value || '').toLowerCase();

export function governanceTargets(env = {}) {
  const targets = {};
  const add = (address, label, kind) => {
    if (isAddress(address || '')) targets[lower(address)] = { label, kind };
  };
  add(env.VITE_LEVEL_MANAGER_ADDRESS || env.VITE_LEVELMANAGER_ADDRESS, 'F-Freedom LevelManager', 'manager');
  add(env.VITE_REGISTRATION_ADDRESS, 'F-Freedom Registration', 'proxy');
  for (const name of ['P4', 'P12', 'P39']) add(env[`VITE_${name}_ORBIT_ADDRESS`], `F-Freedom ${name} Orbit`, 'proxy');
  for (const [key, label] of [['REGISTRATION', 'Registration'], ['LEVEL_MANAGER', 'LevelManager'],
    ['SETTLEMENT_ROUTER', 'Settlement Router'], ...['P39', 'P14', 'P12', 'P6', 'P4', 'P3'].map(n => [`${n}_ORBIT`, `${n} Orbit`])]) {
    add(env[`VITE_FREEDOM_PLUS_${key}_ADDRESS`], `Freedom Plus ${label}`, 'proxy');
  }
  add(env.VITE_GUARDIAN_ADDRESS, 'Guardian', 'guardian');
  add(env.VITE_MULTISIG_ADDRESS, 'SimpleMultiSig', 'multisig');
  add(env.VITE_FGT_TOKEN_ADDRESS, 'FGT Token', 'fgt');
  add(env.VITE_NFT_POOL_VAULT_ADDRESS || env.VITE_NFT_POOL_ADDRESS, 'NFT Pool Vault', 'nft');
  add(env.VITE_OPERATIONS_VAULT_ADDRESS || env.VITE_OPERATIONS_WALLET_ADDRESS, 'Operations Vault', 'operations');
  return targets;
}

export function matchedRepairAction(tx, manifest) {
  if (manifest?.status !== 'verified-mainnet-deployments' || Number(tx.chainId) !== 137 ||
    Number(manifest.chainId) !== 137 || !isAddress(tx.multisig || '') ||
    lower(manifest.governance) !== lower(tx.multisig)) return null;
  return manifest.actions?.find(action => lower(action.target) === lower(tx.to) &&
    String(action.value) === String(tx.value) && lower(action.data) === lower(tx.data)) || null;
}

// A matching selector is not proof of the target's identity or the repair's provenance.
export function describeGovernanceMaintenance(tx, targets = {}, manifest = {}) {
  const relay = describeRepair224Relay(tx);
  if (relay) return relay;
  let parsed;
  try { parsed = iface.parseTransaction({ data: tx.data }); } catch { return null; }
  if (!parsed) return null;
  const target = targets[lower(tx.to)];
  const matched = matchedRepairAction(tx, manifest);
  const result = { targetLabel: target?.label || tx.to, category: 'Maintenance' };
  if (parsed.name === 'execute') {
    const hashes = Array.from(parsed.args[0], keccak256);
    return { ...result, category: 'Historical repair',
      label: matched?.label || 'Historical repair: verification required',
      targetLabel: matched ? `${matched.program} repair executor` : `Unverified executor ${tx.to}`,
      details: `Four bound repair plans. Hashes: ${hashes.join(', ')}. ${matched ? 'Matches the verified deployment manifest.' : 'Not matched to a verified deployment manifest.'}`,
      reviewRequired: !matched || String(tx.value) !== '0', repairPhase: matched?.phase };
  }
  if (!target || String(tx.value) !== '0') return { ...result,
    label: `${parsed.name}: verification required`, details: `Target ${tx.to}; native value ${tx.value}.`, reviewRequired: true };
  if (['pause', 'unpause'].includes(parsed.name)) {
    const verb = parsed.name === 'pause' ? 'Pause' : 'Reopen';
    return { ...result, label: `${verb} ${target.label}`, details: `${verb} ${target.label} at ${tx.to}.`,
      reviewRequired: !['manager', 'proxy', 'guardian'].includes(target.kind) };
  }
  if (parsed.name === 'setSettlementRouter') return { ...result, category: 'Configuration',
    label: `Set ${target.label} settlement router`, details: `Router: ${parsed.args[0]}`,
    reviewRequired: target.kind !== 'manager' };
  return { ...result, category: 'Upgrade', label: `Upgrade ${target.label}`,
    details: `Implementation: ${parsed.args[0]}. Initialization bytes: ${(parsed.args[1]?.length || 2) / 2 - 1}.`,
    proxyAddress: tx.to, implementationAddress: parsed.args[0],
    reviewRequired: !['manager', 'proxy'].includes(target.kind) };
}
