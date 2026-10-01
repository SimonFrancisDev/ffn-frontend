import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformSync } from 'esbuild'
import { parseUnits } from 'ethers'
import * as walletReads from '../src/utils/walletReads.js'

const require = createRequire(import.meta.url)
function compile(path, mocks = {}, define = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = transformSync(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic', define }).code
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)((name) =>
    Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
const { FREEDOM_PLUS_LEVELS: levels, tokenUnits } = compile('../src/Services/freedomPlus.js', {
  './apiConfig': {}, './web3': {}, './earlyAccess': {}, '../abis/USDT.json': [],
}, { 'import.meta.env': '{}' })
const { default: ActivationCenter } = compile('../src/Pages/FreedomPlus/FreedomPlusActivationCenter.jsx', {
  '../../Services/freedomPlus': { tokenUnits },
  '../../utils/walletReads.js': walletReads,
  '../../components/charts/InstitutionalCharts': { ProgressionLineChart: () => null },
  './FreedomPlusOrbit': { __esModule: true, default: () => null },
  '../ActivationCenter/ActivationCenterPage.css': {},
})
const noop = () => {}
const defaults = {
  account: '0xf0152a2490a854712fae8fd32ffcd9729082a09d', isConnected: true,
  data: { chain: { registered: false, usdt: '59.800', usdtRaw: parseUnits('59800', 6) } },
  loading: false, networkReady: true, networkName: 'Polygon Amoy', levels,
  activeLevels: new Set(), progressionData: [], gateway: { registered: true, levelOneActive: true },
  busy: '', nextLevel: 1, short: () => '0xf015...a09d', onRegister: noop, onActivate: noop,
  onViewOrbit: noop, formatToken: String, selectedLevel: 1, cycle: '', visualOrbit: [],
}
const render = (props = {}) => renderToStaticMarkup(createElement(ActivationCenter, { ...defaults, ...props }))
const buttons = (html) => html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []
const activateButtons = (html) => buttons(html).filter((b) => b.includes('compact-action-btn') && !b.includes('view-orbit-btn'))

test('approved seven stage names, engines and prices come from the shared configuration', () => {
  assert.deepEqual(levels.map((x) => [x.stage, x.orbit, x.price]), [
    ['IGNITION', 'P39', 50], ['ACCELERATION', 'P14', 150], ['ASCENSION', 'P12', 450],
    ['PRESTIGE', 'P6', 1350], ['DOMINANCE', 'P4', 4050], ['EMINENCE', 'P4', 12150],
    ['PINNACLE', 'P3', 36450],
  ])
  const html = render()
  for (const level of levels) assert.match(html, new RegExp(level.stage))
  assert.match(html, /lucide-zap/)
  assert.match(html, /lucide-star/)
})

test('F-Freedom gateway completion enables a single Level 1 Activate action without review copy', () => {
  const html = render()
  const actions = activateButtons(html)
  assert.equal(actions.length, 7)
  assert.doesNotMatch(actions[0], /disabled/)
  assert.match(actions[0], />Activate</)
  assert.ok(actions.slice(1).every((b) => b.includes('disabled')))
  assert.doesNotMatch(html, /Review Registration|Register &amp; Activate|How confirmation works|type="checkbox"/)
})

test('wrong network, an in-flight operation or refresh disables activation', () => {
  for (const props of [{ networkReady: false }, { busy: 'register' }, { loading: true }]) {
    assert.ok(activateButtons(render(props)).every((b) => b.includes('disabled')))
  }
})

test('an incomplete F-Freedom gateway does not enable Level 1', () => {
  const html = render({ gateway: { registered: true, levelOneActive: false } })
  assert.ok(activateButtons(html).every((b) => b.includes('disabled')))
  assert.match(html, /F-Freedom Level 1 required/)
})

test('three active Freedom-Plus levels enable only Level 4 next', () => {
  const html = render({ data: { chain: { ...defaults.data.chain, registered: true } }, activeLevels: new Set([1, 2, 3]), nextLevel: 4 })
  const actions = activateButtons(html)
  assert.equal(actions.length, 4)
  assert.doesNotMatch(actions[0], /disabled/)
  assert.ok(actions.slice(1).every((b) => b.includes('disabled')))
  assert.match(html, /3\/7 Activated/)
  assert.doesNotMatch(html, /Review Registration|Not Registered/)
})

test('failed initial account loading never looks like seven confirmed inactive levels', () => {
  const html = render({ data: null })
  assert.match(html, /Account status unavailable/)
  assert.doesNotMatch(html, /0\/7 Activated|Level 1 not active/)
  assert.equal(activateButtons(html).length, 0)
})

test('Italian display formatting does not turn a sufficient raw balance into an insufficient badge', () => {
  assert.equal((render().match(/activation-level-price-token is-sufficient/g) || []).length, 7)
  const html = render({ data: { chain: { ...defaults.data.chain, usdtRaw: null } } })
  assert.doesNotMatch(html, /activation-level-price-token is-sufficient/)
})

function renderOverview(configuredLevels = levels, theme = 'dark') {
  const { default: Overview } = compile('../src/Pages/FreedomPlus/FreedomPlusOverview.jsx', {
    '../../Services/freedomPlus': { FREEDOM_PLUS_LEVELS: configuredLevels },
  })
  const previousDocument = globalThis.document
  globalThis.document = { documentElement: { getAttribute: () => theme } }
  try {
    return renderToStaticMarkup(createElement(Overview, { registered: false, openView: noop }))
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
}
function overviewStages(html) {
  return Array.from(html.matchAll(/class="fp-program-level-card__heading"><h3>([^<]+)<\/h3><span>([^<]+)<\/span><\/div><strong class="fp-program-level-card__price">([\d,]+) <small>USDT<\/small>/g),
    (match) => match.slice(1))
}

for (const theme of ['dark', 'light']) {
  test('overview uses all seven approved stages, engines and prices in ' + theme + ' mode', () => {
    const html = renderOverview(levels, theme)
    assert.deepEqual(overviewStages(html), levels.map((level) => [
      level.stage, level.orbit + ' Orbit', level.price.toLocaleString('en-US'),
    ]))
    assert.match(html, /7 Premium Levels/)
    assert.match(html, /lucide-zap/)
    assert.match(html, /lucide-star/)
  })
}

test('overview stage titles follow the shared configuration rather than a duplicate name list', () => {
  const configured = levels.map((level) => ({ ...level, stage: 'SHARED STAGE ' + level.level }))
  assert.deepEqual(overviewStages(renderOverview(configured)).map((row) => row[0]),
    configured.map((level) => level.stage))
})
