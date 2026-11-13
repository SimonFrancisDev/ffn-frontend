import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const origin = 'https://www.finfreedomnetwork.io';
const report = { checkedAt: new Date().toISOString(), origin, liveWrites: 0, scripts: [], values: {} };
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  const page = await browser.newPage();
  const bodies = [];
  // Inspect only public documents, scripts and styles; no wallet, API, or RPC activity.
  await page.route('**/*', route => {
    const request = route.request();
    if (request.method() !== 'GET' || new URL(request.url()).origin !== origin || !['document', 'script', 'stylesheet'].includes(request.resourceType())) return route.abort();
    return route.continue();
  });
  page.on('response', response => {
    if (response.request().resourceType() === 'script' && response.ok()) bodies.push(response.text().then(text => ({ url: response.url(), text })));
  });
  await page.goto(`${origin}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
  for (const { url, text } of await Promise.all(bodies)) {
    report.scripts.push({ url, sha256: createHash('sha256').update(text).digest('hex') });
    const ast = parse(text, { sourceType: 'unambiguous' });
    const stack = [ast];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      if (node.type === 'ObjectProperty') {
        const key = node.key.name || node.key.value;
        const value = node.value.value;
        if (/^VITE_/.test(key) && /(_ADDRESS$|CHAIN_ID$|_ENABLED$|API_BASE_URL$|API_URL$)/.test(key) && ['string', 'number', 'boolean'].includes(typeof value)) {
          const prior = report.values[key];
          assert(prior === undefined || prior === value, `Conflicting served value: ${key}`);
          report.values[key] = value;
        }
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) stack.push(...value);
        else if (value && typeof value === 'object') stack.push(value);
      }
    }
  }
  assert.equal(Number(report.values.VITE_CHAIN_ID), 137, 'Served bundle chain ID could not be verified');
  assert.equal(new URL(report.values.VITE_API_BASE_URL || report.values.VITE_API_URL).hostname, 'fin-freedom-backend-3.onrender.com');
  await writeFile(new URL('../../tmp/repair-served-frontend-bindings.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
