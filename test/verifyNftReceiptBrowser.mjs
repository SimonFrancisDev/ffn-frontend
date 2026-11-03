import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || process.argv[2] || 'playwright')
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
const output = path.resolve(root, '../_ui-verification/nft-receipt')
await mkdir(output, { recursive: true })
const bundle = await build({
  entryPoints: [path.join(root, 'test/fixtures/nftReceiptBrowser.jsx')], bundle: true, write: false,
  outfile: 'receipt.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
  external: ['/images/*', '/assets/*'],
  plugins: [{ name: 'no-live-services', setup(builder) {
    builder.onResolve({ filter: /Services\/freedomPlus$/ }, () => ({ path: 'stub', namespace: 'test' }))
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const loadNftReceipt = () => { throw new Error("Live service forbidden in browser fixtures") }' }))
  } }],
})
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  if (url.pathname === '/receipt.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(js); return }
  if (url.pathname === '/receipt.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return }
  if (url.pathname.startsWith('/images/')) {
    const target = path.resolve(root, 'public', `.${url.pathname}`)
    if (!target.startsWith(path.join(root, 'public', 'images') + path.sep)) { response.writeHead(403); response.end(); return }
    try { response.setHeader('Content-Type', 'image/png'); response.end(await readFile(target)) } catch { response.writeHead(404); response.end() }
    return
  }
  response.setHeader('Content-Type', 'text/html')
  response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/receipt.css"></head><body><div id="root"></div><script src="/receipt.js"></script></body></html>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true })
const errors = []
try {
  for (const [width, height] of [[1440, 1000], [390, 844], [320, 740]]) {
    const page = await browser.newPage({ viewport: { width, height }, acceptDownloads: true })
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      window.receiptCanvasText = []
      const fillText = CanvasRenderingContext2D.prototype.fillText
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
        window.receiptCanvasText.push(String(text))
        return fillText.call(this, text, ...args)
      }
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
      Object.defineProperty(navigator, 'share', { value: async ({ files }) => {
        if (window.cancelShare) throw new DOMException('Share cancelled', 'AbortError')
        window.sharedReceiptType = files[0].type
        window.sharedReceiptName = files[0].name
      }, configurable: true })
    })
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    await page.getByRole('button', { name: 'Generate receipt' }).click()
    const downloadButton = page.getByRole('button', { name: 'Download receipt' })
    await downloadButton.waitFor()
    await page.waitForFunction(() => !document.querySelector('.modal-footer button')?.disabled)
    assert.equal(await page.locator('.fn-payment-modal .modal-content').evaluate(el => getComputedStyle(el).display), 'flex', 'global Security page CSS must not hide receipt content')
    assert.equal(await page.locator('.fn-payment-card').isVisible(), true)
    assert.equal(await page.locator('.fn-payment-card__address').textContent(), '0x111***111...')
    assert.equal((await page.locator('.fn-payment-card').innerHTML()).includes('0x1111111111111111111111111111111111111111'), false, 'full wallet must not appear in receipt text or attributes')
    const canvasText = await page.evaluate(() => window.receiptCanvasText)
    assert.ok(canvasText.includes('0x111***111...'), 'PNG must use the same masked wallet as the modal')
    assert.equal(canvasText.some(text => text.includes('0x1111111111111111111111111111111111111111')), false, 'PNG must not draw the full wallet')
    assert.equal(await page.locator('.fn-payment-card').getByText('123.456789').count(), 1)
    assert.equal(await page.locator('.fn-payment-card img').evaluate(img => img.complete && img.naturalWidth > 0), true)
    assert.equal(await page.locator('.modal-body').evaluate(el => el.scrollWidth <= el.clientWidth), true, `horizontal overflow at ${width}`)
    assert.equal(await page.locator('.fn-payment-card').evaluate(el => el.scrollWidth <= el.clientWidth), true)
    await page.screenshot({ path: path.join(output, `receipt-${width}.png`) })
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
    assert.equal(await page.locator('.fn-payment-modal .modal-content').evaluate(el => getComputedStyle(el).display), 'flex')
    assert.equal(await page.locator('.fn-payment-modal .modal-content').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(17, 27, 26)', 'light-theme overrides must not erase receipt contrast')
    assert.equal(await page.locator('.fn-payment-modal .modal-content').evaluate(el => getComputedStyle(el).backgroundImage), 'none')
    assert.equal(await page.locator('.fn-payment-card h2').evaluate(el => getComputedStyle(el).color), 'rgb(237, 246, 242)')
    assert.equal(await page.locator('.fn-payment-card__heading strong').evaluate(el => getComputedStyle(el).color), 'rgb(79, 223, 177)')
    assert.equal(await downloadButton.evaluate(el => getComputedStyle(el).color), 'rgb(16, 34, 26)')
    assert.equal(await page.getByRole('button', { name: 'Share', exact: true }).evaluate(el => getComputedStyle(el).color), 'rgb(237, 246, 242)')
    await page.screenshot({ path: path.join(output, `receipt-${width}-light.png`) })
    const downloadEvent = page.waitForEvent('download')
    await downloadButton.click()
    const download = await downloadEvent
    const file = path.join(output, `download-${width}.png`)
    await download.saveAs(file)
    const png = await readFile(file)
    assert.equal(png.readUInt32BE(16), 1400)
    assert.equal(png.readUInt32BE(20), 1360)
    assert.ok(png.length > 20000)
    assert.match(download.suggestedFilename(), /cycle-1-FFN-SAMPLE\.png$/)
    await page.getByRole('button', { name: 'Share', exact: true }).click()
    await page.waitForFunction(() => window.sharedReceiptType === 'image/png')
    assert.equal(await page.evaluate(() => window.sharedReceiptName), download.suggestedFilename())
    await page.evaluate(() => { window.cancelShare = true })
    await page.getByRole('button', { name: 'Share', exact: true }).click()
    assert.equal(await page.getByRole('alert').count(), 0)
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(await page.getByRole('button', { name: 'Generate receipt' }).evaluate(el => document.activeElement === el), true)
    await page.evaluate(() => { window.failReceipt = true })
    await page.getByRole('button', { name: 'Generate receipt' }).click()
    await page.getByRole('button', { name: 'Retry verification' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Download receipt' }).count(), 0)
    await page.evaluate(() => { window.failReceipt = false })
    await page.getByRole('button', { name: 'Retry verification' }).click()
    await page.getByRole('button', { name: 'Download receipt' }).waitFor()
    await page.evaluate(() => window.changeReceiptWallet())
    await page.getByRole('button', { name: 'Retry verification' }).waitFor()
    assert.equal(await page.locator('.fn-payment-card').count(), 0, 'previous wallet receipt must disappear')
    await page.close()
    console.log(`PASS ${width}x${height}: masked wallet in modal/PNG, global CSS visibility, both themes, layout, artwork, PNG, share/cancel, Escape/focus, failed verification, retry, wallet switch`)
  }
  assert.deepEqual(errors, [])
  console.log(`Screenshots and PNG receipts: ${output}`)
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
