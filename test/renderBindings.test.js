import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import babel from '@babel/core'

const browserGlobals = new Set([
  'undefined', 'window', 'document', 'console', 'setTimeout', 'clearTimeout',
  'Number', 'String', 'Boolean', 'BigInt', 'Map', 'Set', 'Promise', 'Error',
  'Math', 'Date', 'Object', 'Array', 'Intl', 'JSON', 'MutationObserver',
])
for (const name of ['FreedomPlusOverview', 'FreedomPlusActivationCenter', 'FreedomPlusPage', 'FreedomNftPages', 'FreedomNftOverview', 'FreedomPlusTokens']) {
  test(name + ' has no unbound render or handler identifiers', () => {
    const source = readFileSync(new URL('../src/Pages/FreedomPlus/' + name + '.jsx', import.meta.url), 'utf8')
    const ast = babel.parseSync(source, {
      configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] },
    })
    const missing = new Set()
    babel.traverse(ast, {
      ReferencedIdentifier(path) {
        const name = path.node.name
        if (!path.scope.hasBinding(name) && !browserGlobals.has(name)) missing.add(name)
      },
      JSXOpeningElement(path) {
        let node = path.node.name
        while (node.type === 'JSXMemberExpression') node = node.object
        if (node.type === 'JSXIdentifier' && /^[A-Z]/.test(node.name) && !path.scope.hasBinding(node.name)) missing.add(node.name)
      },
    })
    assert.deepEqual([...missing], [])
  })
}
