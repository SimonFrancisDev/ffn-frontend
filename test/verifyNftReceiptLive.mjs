import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const wallet = process.argv[2]
const periodId = Number(process.argv[3] || 1)
if (!/^0x[0-9a-f]{40}$/i.test(wallet || '') || !Number.isSafeInteger(periodId) || periodId < 1) {
  throw Error('Usage: node test/verifyNftReceiptLive.mjs <paid-wallet> <cycle> [playwright-module] [--local-css]')
}
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || process.argv[4] || 'playwright')
const site = 'https://www.finfreedomnetwork.io'
const output = new URL('../../_ui-verification/nft-receipt-live/', import.meta.url)
await mkdir(output, { recursive: true })
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const html = await (await page.request.get(site)).text()
  const asset = html.match(/src="(\/assets\/index-[^"]+\.js)"/)[1]
  const script = await (await page.request.get(site + asset)).text()
  const env = Object.fromEntries([...script.matchAll(/\b(VITE_[A-Z0-9_]+):("(?:\\.|[^"\\])*")/g)].map(match => [match[1], JSON.parse(match[2])]))
  if (Number(env.VITE_CHAIN_ID) !== 137) throw Error('Public site is not mainnet')
  console.log(JSON.stringify({ asset, chainId: env.VITE_CHAIN_ID, rpcHost: new URL(env.VITE_RPC_URL).hostname, api: env.VITE_API_BASE_URL }))
  const bundle = await build({
    // Public-wallet read only. The real verifier independently requires a successful
    // claim and USDT transfer; these UI flags cannot fabricate a payment receipt.
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Receipt from './src/Pages/FreedomPlus/FreedomNftReceipt.jsx'; const root = document.createElement('div'); document.body.append(root); createRoot(root).render(React.createElement(Receipt,{wallet:${JSON.stringify(wallet)},period:{periodId:${periodId},status:'published',claimed:true},onClose:()=>{}}));`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
    bundle: true, write: false, format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' }, define: { 'import.meta.env': JSON.stringify(env), 'process.env.NODE_ENV': '"production"' },
  })
  // Keep the production origin and exact served styles, without starting unrelated
  // app RPC reads. This isolates the receipt while preserving global CSS conflicts.
  const styles = (html.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) || []).join('')
  assert.ok(styles, 'production stylesheet links are required')
  await page.route(site + '/freedom-nft/rewards', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body></body></html>` }))
  await page.goto(site + '/freedom-nft/rewards', { waitUntil: 'load' })
  if (process.argv.includes('--local-css')) await page.addStyleTag({ content: await readFile(new URL('../src/Pages/FreedomPlus/FreedomNftReceipt.css', import.meta.url), 'utf8') })
  page.on('pageerror', error => console.log('UI_ERROR', error.message))
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.waitForFunction(() => document.querySelector('.fn-payment-modal .modal-footer') || document.querySelector('.fn-payment-state button'), null, { timeout: 40000 })
  assert.equal(await page.locator('.fn-payment-modal .modal-content').evaluate(el => getComputedStyle(el).display), 'flex', 'receipt must be visible under production global CSS')
  console.log('LIVE_UI_RESULT', await page.locator('.fn-payment-modal').innerText())
  if (await page.getByRole('button', { name: 'Retry verification' }).count()) {
    console.log('Retrying one transient verification failure')
    await page.getByRole('button', { name: 'Retry verification' }).click()
    await page.waitForFunction(() => document.querySelector('.fn-payment-modal .modal-footer') || document.querySelector('.fn-payment-state button'), null, { timeout: 40000 })
  }
  const download = page.getByRole('button', { name: 'Download receipt' })
  await download.waitFor({ timeout: 20000 })
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.locator('.fn-payment-card').isVisible(), true)
    assert.equal(await page.locator('.modal-body').evaluate(el => el.scrollWidth <= el.clientWidth), true)
    assert.equal(await page.locator('.fn-payment-card img').evaluate(el => el.complete && el.naturalWidth > 0), true)
    await page.screenshot({ path: fileURLToPath(new URL(`receipt-${width}.png`, output)), timeout: 10000 })
  }
  const event = page.waitForEvent('download', { timeout: 20000 })
  await download.click({ timeout: 20000 })
  const file = await event
  const pngPath = fileURLToPath(new URL('download.png', output))
  await file.saveAs(pngPath)
  const png = await readFile(pngPath)
  assert.equal(png.readUInt32BE(16), 1400)
  assert.equal(png.readUInt32BE(20), 1360)
  assert.ok(png.length > 20000)
  console.log('DOWNLOAD_OK', file.suggestedFilename())
} finally { await browser.close() }
