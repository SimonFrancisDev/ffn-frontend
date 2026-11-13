import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { Interface } from 'ethers';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const bindings = JSON.parse(await readFile(path.join(root, '../tmp/repair-served-frontend-bindings.json'), 'utf8')).values;
const env = { ...bindings, VITE_FREEDOM_PLUS_SETTLEMENT_ROUTER_ADDRESS: '0x8C88262595cbEAA5FffB60a0689b3EAbe22B0498' };
const iface = new Interface(['function pause()', 'function upgradeToAndCall(address,bytes)', 'function execute(bytes[4])', 'function cancelTransaction(uint256)']);
const actions = [
  { to: env.VITE_FREEDOM_PLUS_P39_ORBIT_ADDRESS, data: iface.encodeFunctionData('pause') },
  { to: env.VITE_FREEDOM_PLUS_SETTLEMENT_ROUTER_ADDRESS, data: iface.encodeFunctionData('upgradeToAndCall', ['0x0000000000000000000000000000000000000002', '0x']) },
  { to: '0x0000000000000000000000000000000000000003', data: iface.encodeFunctionData('execute', [['0x01', '0x02', '0x03', '0x04']]) },
];
const stubs = {
  '/hooks/useWallet': 'const wallet={isConnected:true,account:"0x0000000000000000000000000000000000000001",connect(){throw Error("No wallet actions")}}; export const useWallet=()=>wallet;',
  '/hooks/useContracts': 'const state={contracts:window.fixtureContracts,isLoading:false,error:null,loadContracts:async()=>{}};export const useContracts=()=>state;',
  '/Services/web3': 'export const web3Service={initWallet(){throw Error("Signing prohibited in fixture")}};',
  '/components/feedback': 'const toast={success(){},danger(){},info(){}}; export const useToast=()=>toast;',
  '/Services/communitySummary': 'export const fetchCommunitySummary=async()=>({data:{}});',
  '/Services/profilePrivacyApi': 'export const getProfileSessionAuth=()=>{throw Error("No auth signatures")};',
  '/Services/apiConfig': 'export const getApiUrl=path=>path;',
  '/constants/addresses': 'export const NETWORK_CONFIG={chainName:"Polygon Mainnet",chainId:"0x89"};',
  'react-i18next': 'const t=(_key,fallback)=>fallback;export const useTranslation=()=>({t});',
};
for (const name of ['AdminNotificationComposer', 'AdminOfficialVideo', 'AdminTasksManager']) stubs[`/components/admin/${name}`] = 'export default function Stub(){return null}';
stubs['/components/metrics/NftPoolSummary'] = 'export default function Stub(){return null}';
const bundle = await build({
  stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import 'bootstrap/dist/css/bootstrap.min.css';import {AdminPanel} from './src/Pages/AdminPanel';import './src/styles/variables.css';import './src/styles/globals.css';import './src/styles/foundation.css';import './src/App.css';createRoot(document.getElementById('root')).render(<AdminPanel canPerformOnchainAdmin={true}/>);", resolveDir: root, loader: 'jsx' },
  bundle: true, write: false, format: 'esm', outfile: 'admin.js', jsx: 'automatic', external: ['/images/*', '/assets/*'],
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': JSON.stringify(env) },
  plugins: [{ name: 'read-only-fixture', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => {
      const normalized = path.resolve(args.resolveDir, args.path).replaceAll('\\', '/');
      const key = Object.keys(stubs).find(key => key === args.path || normalized.endsWith(key));
      return key ? { path: key, namespace: 'fixture' } : undefined;
    });
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stubs[args.path], loader: 'js' }));
  } }],
});
const server = createServer((req, res) => {
  if (req.url.startsWith('/api/')) { res.setHeader('Content-Type', 'application/json'); res.end('{"data":[]}'); return; }
  const file = bundle.outputFiles.find(file => req.url === '/' + path.basename(file.path));
  if (file) { res.setHeader('Content-Type', req.url.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(file.contents); return; }
  res.setHeader('Content-Type', 'text/html');
  res.end('<html data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/admin.css"></head><body><div id="root"></div><script type="module" src="/admin.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const output = path.join(root, '../tmp/repair-governance-browser');
  await mkdir(output, { recursive: true });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('Browser fixture:', error.message); });
    page.on('console', message => { if (message.type() === 'error') console.error('Browser console:', message.text()); });
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' && route.request().method() === 'GET' ? route.continue() : route.abort());
    await page.addInitScript(({ env, actions }) => {
      sessionStorage.setItem('ffn_admin_api_key_session', 'LOCAL_FIXTURE_ONLY');
      localStorage.setItem('admin_tour_preferences', JSON.stringify({ skippedForever: true }));
      const provider = { getNetwork: async () => ({ chainId: 137n }), getBlock: async () => ({ timestamp: Math.floor(Date.now() / 1000) }) };
      window.fixtureContracts = {
        simpleMultiSig: { runner: { provider }, getAddress: async () => env.VITE_MULTISIG_ADDRESS,
          isOwner: async () => { window.fixtureRefreshes = (window.fixtureRefreshes || 0) + 1; return true; }, requiredConfirmations: async () => 3n, getTransactionCount: async () => 193n,
          timelockDelay: async () => 120n, getOwners: async () => ['0x0000000000000000000000000000000000000001'], approved: async () => false,
          transactions: async id => ({ ...(actions[id - 190] || actions[0]), value: 0n, confirmations: 0n, executed: false,
            cancelled: false, submittedAt: BigInt(Math.floor(Date.now() / 1000)), executeAfter: 0n }),
        },
        levelManager: { runner: { provider }, paused: async () => false, getFounderWallets: async () => [[], []],
          nftPool: async () => env.VITE_NFT_POOL_VAULT_ADDRESS, operationsWallet: async () => env.VITE_OPERATIONS_VAULT_ADDRESS,
          id1Wallet: async () => '0xCE38722a72c9099D9237897E18B0cfb6D51c4470', isID1Downline: async () => false },
        guardian: { paused: async () => false, globalUpgradeFreeze: async () => false,
          approvedProxies: async () => true, approvedImplementations: async () => false },
      };
    }, { env, actions });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
    assert.deepEqual(errors, []);
    await page.getByTitle('Tx Queue', { exact: true }).click();
    const row = id => page.locator('.tx-row-premium').filter({ has: page.locator('td:first-child', { hasText: new RegExp(`^${id}$`) }) });
    await row(190).getByText('Pause Freedom Plus P39 Orbit', { exact: true }).waitFor();
    await row(191).getByText('Upgrade Freedom Plus Settlement Router', { exact: true }).waitFor();
    await row(192).getByText('Historical repair: verification required', { exact: true }).waitFor();
    assert(await row(192).getByRole('button', { name: 'Approve', exact: true }).isDisabled());
    assert(await row(192).getByRole('button', { name: 'Execute', exact: true }).isDisabled());
    await row(191).getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText(env.VITE_FREEDOM_PLUS_SETTLEMENT_ROUTER_ADDRESS, { exact: true }).waitFor();
    assert(await page.locator('.admin-proposal-details').evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'Selected proposal details must fit mobile width');
    await page.locator('.table-responsive').evaluateAll(nodes => nodes.forEach(node => { node.scrollLeft = 0; }));
    await page.screenshot({ path: path.join(output, `admin-${width}.png`), fullPage: true });
    assert(await page.evaluate(() => window.fixtureRefreshes < 8), 'Governance refresh must settle, not loop on identical owner lists');
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px actual AdminPanel: correct program/proxy labels, target details, unverified repair blocked; no signing/network writes`);
    await page.close();
  }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
