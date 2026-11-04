import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || process.argv[2] || 'playwright')
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
const output = path.resolve(root, '../_ui-verification/nft-pool')
await mkdir(output, { recursive: true })
const bundle = await build({
  entryPoints: [path.join(root, 'test/fixtures/nftPoolBrowser.jsx')], bundle: true, write: false,
  outfile: 'pool.js', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env.VITE_API_BASE_URL': '""', 'import.meta.env.PROD': 'false' },
  external: ['/images/*', '/assets/*'],
  plugins: [{ name: 'fixture-used-icon', setup(builder) {
    builder.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'refresh-icon', namespace: 'fixture-icons' }))
    builder.onLoad({ filter: /.*/, namespace: 'fixture-icons' }, () => ({
      contents: `export { default as RefreshCw } from ${JSON.stringify(path.join(root, 'node_modules/lucide-react/dist/esm/icons/refresh-cw.js'))}`,
      resolveDir: root,
    }))
  } }],
})
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost')
  if (url.pathname === '/pool.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(js); return }
  if (url.pathname === '/pool.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return }
  if (url.pathname !== '/') { response.writeHead(404); response.end(); return }
  response.setHeader('Content-Type', 'text/html')
  response.end('<!doctype html><html data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/pool.css"></head><body><div id="root"></div><script src="/pool.js"></script></body></html>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true })
const errors = []
try {
  for (const [width, height] of [[1440, 1000], [390, 844], [320, 740]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
    page.on('pageerror', error => errors.push(error.message))
    let requests = 0
    let mode = 'ready'
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.hostname !== '127.0.0.1') return route.abort()
      if (url.pathname !== '/api/community/summary') return route.continue()
      requests++
      if (mode === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Fixture unavailable' }) })
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data: { public: { nftRewardPool: {
        totalInflow: mode === 'zero' ? '0.00' : '5133.44',
        currentBalance: mode === 'unverified' ? null : mode === 'zero' ? '0.00' : mode === 'deposit' ? '2721.52' : '2621.52',
        totalDistributed: '2511.92', balanceVerified: mode !== 'unverified',
      } } } }) })
    })
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForFunction(() => document.querySelectorAll('.nft-pool-summary[aria-busy="false"]').length === 7, null, { timeout: 120000 })
    assert.equal(requests, 1, 'all views must share one HTTP request')
    const panels = page.locator('.nft-pool-summary')
    for (let i = 0; i < 7; i++) {
      const panel = panels.nth(i)
      await panel.scrollIntoViewIfNeeded()
      assert.equal(await panel.getByText('Total NFT accumulated (all time)', { exact: true }).count(), 1)
      assert.equal(await panel.getByText('Current NFT pool balance', { exact: true }).count(), 1)
      assert.equal(await panel.locator('[data-pool-metric="accumulated"] dd > span').getAttribute('aria-label'), '$5,133.44')
      assert.equal(await panel.locator('[data-pool-metric="current"] dd > span').getAttribute('aria-label'), '$2,621.52')
    }
    await page.waitForFunction(() => [...document.querySelectorAll('[data-pool-metric="current"] dd')].every(node => node.textContent === '$2,621.52'))
    await page.evaluate(() => window.scrollTo(0, 0))
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
      const brightness = await panels.evaluateAll(nodes => nodes.map(node => {
        const rgb = getComputedStyle(node).color.match(/[\d.]+/g).slice(0, 3).map(Number)
        return rgb.reduce((sum, channel) => sum + channel, 0) / 3
      }))
      assert.ok(brightness.every(value => theme === 'dark' ? value > 180 : value < 100), 'theme text contrast must not inherit Bootstrap body colors')
      const issues = await panels.evaluateAll(nodes => nodes.flatMap(panel => {
        const issues = []
        if (panel.scrollWidth > panel.clientWidth + 1) issues.push('horizontal overflow')
        for (const row of panel.querySelectorAll('dl > div')) {
          const dt = row.querySelector('dt').getBoundingClientRect()
          const dd = row.querySelector('dd').getBoundingClientRect()
          if (dt.bottom > dd.top + 1) issues.push('overlapping label/value')
          if (dd.bottom > panel.getBoundingClientRect().bottom + 1) issues.push('vertical overflow')
        }
        return issues
      }))
      assert.deepEqual(issues, [], `${width}px ${theme}`)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await page.screenshot({ path: path.join(output, `pool-${width}-${theme}.png`), fullPage: true })
    }
    for (const scenario of ['unverified', 'error', 'zero', 'deposit']) {
      mode = scenario
      await page.getByRole('button', { name: 'Refresh NFT pool' }).first().click()
      await page.waitForFunction(() => document.querySelectorAll('.nft-pool-summary[aria-busy="false"]').length === 7)
      for (let i = 0; i < 7; i++) {
        const current = panels.nth(i).locator('[data-pool-metric="current"] dd')
        if (scenario === 'unverified' || scenario === 'error') assert.equal(await current.textContent(), 'Unavailable')
        else assert.equal(await current.locator('span[aria-label]').getAttribute('aria-label'), scenario === 'zero' ? '$0.00' : '$2,721.52')
      }
    }
    assert.equal(requests, 5, 'one request per explicit refresh, no per-component requests')
    await page.close()
    console.log(`PASS ${width}x${height}: seven shared displays, two themes, layout, verified zero, unavailable balance, failure recovery, deduped refresh`)
  }
  assert.deepEqual(errors, [])
  console.log(`Screenshots: ${output}`)
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
