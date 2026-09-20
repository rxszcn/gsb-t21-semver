'use strict'

const { test } = require('tap')
const { successor, conjunctionCell } = require('../../internal/neighborhood')
const Range = require('../../classes/range')

test('successor pins the prerelease tier', (t) => {
  // prerelease: append a numeric 0 identifier
  t.equal(successor('1.2.3-alpha').version, '1.2.3-alpha.0')
  t.equal(successor('1.2.3-alpha.0').version, '1.2.3-alpha.0.0')
  t.equal(successor('1.2.3-0').version, '1.2.3-0.0')
  // release: next patch, prerelease tier only entered with includePrerelease
  t.equal(successor('1.2.3').version, '1.2.4')
  t.equal(successor('1.2.3', { includePrerelease: true }).version, '1.2.4-0')
  t.equal(successor('1.2.9', { includePrerelease: true }).version, '1.2.10-0')
  t.end()
})

test('conjunctionCell bounds', (t) => {
  const cell = (range, options) => {
    const [only] = new Range(range, options).set
    return conjunctionCell(only)
  }

  const bounded = cell('>=1.0.0 <2.0.0')
  t.equal(bounded.lo.version, '1.0.0')
  t.equal(bounded.loInclusive, true)
  t.equal(bounded.hi.version, '2.0.0')
  t.equal(bounded.hiInclusive, false)
  // strongest bound wins regardless of order; exclusivity is stronger at ties
  t.equal(cell('>=1.2.3 >1.2.3').loInclusive, false)
  t.equal(cell('>1.2.3 >=1.2.3').loInclusive, false)
  t.equal(cell('<=1.2.3 <1.2.3').hiInclusive, false)
  t.equal(cell('<1.2.3 <=1.2.3').hiInclusive, false)
  // exact pins
  t.equal(cell('1.2.3').lo.version, '1.2.3')
  t.equal(cell('1.2.3').hi.version, '1.2.3')
  t.equal(cell('*').lo, null)
  t.equal(cell('*').hi, null)
  // contradictions have no neighborhood
  t.equal(cell('>4 <3'), null)
  t.equal(cell('1.2.3 <1.0.0'), null)
  t.equal(cell('>=1.2.3 <1.2.3'), null)
  // adjacent exclusive bounds still enclose the prerelease tier between them
  const adjacent = cell('>1.2.3 <1.2.4-0')
  t.equal(adjacent.lo.version, '1.2.3')
  t.equal(adjacent.hi.version, '1.2.4-0')
  t.end()
})
