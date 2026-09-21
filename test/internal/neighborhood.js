'use strict'

const { test } = require('tap')
const SemVer = require('../../classes/semver')
const gt = require('../../functions/gt')
const { successor, release } = require('../../internal/neighborhood')

test('successor', (t) => {
  // [version, successor]
  const set = [
    // a release steps to the floor of the next patch tuple
    ['0.0.0', '0.0.1-0'],
    ['1.2.3', '1.2.4-0'],
    ['1.2.9', '1.2.10-0'],
    // a prerelease grows a trailing 0 identifier
    ['0.0.0-0', '0.0.0-0.0'],
    ['1.2.3-alpha', '1.2.3-alpha.0'],
    ['1.2.3-alpha.1', '1.2.3-alpha.1.0'],
    ['1.2.3-0.3.7', '1.2.3-0.3.7.0'],
  ]
  set.forEach(([version, expected]) => {
    const next = successor(new SemVer(version))
    t.equal(String(next), expected, `successor(${version})`)
    t.ok(gt(next, new SemVer(version)), `successor(${version}) is greater`)
  })
  t.end()
})

test('release', (t) => {
  const set = [
    ['1.2.3', '1.2.3'],
    ['1.2.3-0', '1.2.3'],
    ['1.2.3-alpha.1', '1.2.3'],
  ]
  set.forEach(([version, expected]) => {
    t.equal(String(release(new SemVer(version))), expected, `release(${version})`)
  })
  t.end()
})
