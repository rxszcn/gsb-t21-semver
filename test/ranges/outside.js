'use strict'

const { test } = require('tap')
const outside = require('../../ranges/outside')
const satisfies = require('../../functions/satisfies')
const versionGtr = require('../fixtures/version-gt-range')
const versionNotGtr = require('../fixtures/version-not-gt-range')
const versionLtr = require('../fixtures/version-lt-range')
const versionNotLtr = require('../fixtures/version-not-lt-range')

test('gtr tests', (t) => {
  // [range, version, options]
  // Version should be greater than range
  versionGtr.forEach(([range, version, options = false]) => {
    const msg = `outside(${version}, ${range}, > ${options})`
    t.ok(outside(version, range, '>', options), msg)
  })
  t.end()
})

test('ltr tests', (t) => {
  // [range, version, options]
  // Version should be less than range
  versionLtr.forEach(([range, version, options = false]) => {
    const msg = `outside(${version}, ${range}, <, ${options})`
    t.ok(outside(version, range, '<', options), msg)
  })
  t.end()
})

test('negative gtr tests', (t) => {
  // [range, version, options]
  // Version should NOT be greater than range
  versionNotGtr.forEach(([range, version, options = false]) => {
    const msg = `!outside(${version}, ${range}, > ${options})`
    t.notOk(outside(version, range, '>', options), msg)
  })
  t.end()
})

test('negative ltr tests', (t) => {
  // [range, version, options]
  // Version should NOT be less than range
  versionNotLtr.forEach(([range, version, options = false]) => {
    const msg = `!outside(${version}, ${range}, < ${options})`
    t.notOk(outside(version, range, '<', options), msg)
  })
  t.end()
})

test('satisfies/gtr/ltr are mutually exclusive on prerelease gaps', (t) => {
  // Prereleases can sit inside the neighborhood of a non-prerelease range;
  // the tuple rule only denies satisfies, they must not read as both above
  // and below the range.
  const cases = [
    ['1.2.3-alpha', '>=1.0.0'],
    ['1.2.3-alpha', '>=1.0.0 <2.0.0'],
    ['2.0.0-beta', '>=1.0.0 <2.0.0'],
    ['1.0.0-rc.1', '1.x'],
    ['1.0.0', '>1.2.3 <1.2.4-0'],
    ['9.9.9', '>1.2.3 <1.2.4-0'],
    ['0.0.1', '>1.2.3 <1.2.4-0'],
    ['0.7.2-beta', '0.7.x'],
    ['1.3.0-alpha', '>1.2.3'],
  ]

  for (const [version, range] of cases) {
    const tuple = [
      satisfies(version, range),
      outside(version, range, '>'),
      outside(version, range, '<'),
    ]
    t.ok(tuple.filter(Boolean).length <= 1,
      `${version} / ${range} -> ${tuple.join(',')}`)
  }

  // With includePrerelease the neighborhood and matched set coincide, so
  // the three states form an exact partition.
  for (const [version, range] of cases) {
    const options = { includePrerelease: true }
    const tuple = [
      satisfies(version, range, options),
      outside(version, range, '>', options),
      outside(version, range, '<', options),
    ]
    t.equal(tuple.filter(Boolean).length, 1,
      `includePrerelease ${version} / ${range} -> ${tuple.join(',')}`)
  }
  t.end()
})

test('outside with bad hilo throws', (t) => {
  t.throws(() => {
    outside('1.2.3', '>1.5.0', 'blerg', true)
  }, new TypeError('Must provide a hilo val of "<" or ">"'))
  t.end()
})
