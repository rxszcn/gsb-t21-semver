'use strict'

const SemVer = require('../classes/semver')
const Range = require('../classes/range')
const satisfies = require('../functions/satisfies')
const { conjunctionCell } = require('../internal/neighborhood')

// gtr: version is greater than the whole range
// ltr: version is less than the whole range
//
// Each conjunction of comparators is reduced to a contiguous neighborhood
// cell [lo, hi].  gtr/ltr compare against that cell rather than against the
// individual comparators, so versions caught by the prerelease tuple rule
// (inside the cell but not satisfying without includePrerelease) are neither
// above nor below it.
const outside = (version, range, hilo, options) => {
  version = new SemVer(version, options)
  range = new Range(range, options)

  const above = hilo === '>'
  if (hilo !== '>' && hilo !== '<') {
    throw new TypeError('Must provide a hilo val of "<" or ">"')
  }

  // If it satisfies the range it is not outside.
  if (satisfies(version, range, options)) {
    return false
  }

  const cells = range.set
    .map(comparators => conjunctionCell(comparators))
    .filter(cell => cell !== null)

  // A range with no non-contradictory cells can't be placed on either side.
  if (!cells.length) {
    return false
  }

  if (above) {
    // gtr iff above every cell, i.e. above the highest upper bound.
    return cells.every(({ hi, hiInclusive }) => {
      if (!hi) {
        return false
      }
      const cmp = version.compare(hi)
      return hiInclusive ? cmp > 0 : cmp >= 0
    })
  }

  // ltr iff below every cell, i.e. below the lowest lower bound.
  return cells.every(({ lo, loInclusive }) => {
    if (!lo) {
      return false
    }
    const cmp = version.compare(lo)
    return loInclusive ? cmp < 0 : cmp <= 0
  })
}

module.exports = outside
