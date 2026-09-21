'use strict'

const SemVer = require('../classes/semver')
const Comparator = require('../classes/comparator')
const Range = require('../classes/range')
const gt = require('../functions/gt')
const { successor, release } = require('../internal/neighborhood')

const minVersion = (range, loose) => {
  range = new Range(range, loose)

  // 0.0.0-0 is the least possible version, so it is the answer whenever
  // the range admits it (always the case with includePrerelease, or when
  // a comparator has a prerelease on the 0.0.0 tuple).
  let minver = new SemVer('0.0.0-0')
  if (range.test(minver)) {
    return minver
  }

  minver = new SemVer('0.0.0')
  if (range.test(minver)) {
    return minver
  }

  minver = null
  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    let setMin = null
    comparators.forEach((comparator) => {
      if (comparator.semver === Comparator.ANY) {
        return
      }
      // Clone to avoid manipulating the comparator's semver object.
      let compver = new SemVer(comparator.semver.version)
      switch (comparator.operator) {
        case '>':
          // The least version strictly greater than the bound, per the
          // neighborhood algorithm: x.y.z -> x.y.(z+1)-0, and a
          // prerelease x.y.z-p... -> x.y.z-p....0.
          compver = successor(compver)
          /* fallthrough */
        case '':
        case '>=':
          if (!setMin || gt(compver, setMin)) {
            setMin = compver
          }
          break
        case '<':
        case '<=':
          /* Ignore maximum versions */
          break
        /* istanbul ignore next */
        default:
          throw new Error(`Unexpected operation: ${comparator.operator}`)
      }
    })

    if (!setMin) {
      continue
    }

    // The floor is the least version allowed by the lower bounds of
    // this set.  When it does not match the range (typically because
    // its prerelease is not admitted), the release of the same tuple
    // is the next candidate; anything in between is a same-tuple
    // prerelease and would be rejected for the same reason.
    const candidates = setMin.prerelease.length ? [setMin, release(setMin)] : [setMin]
    for (let j = 0; j < candidates.length; ++j) {
      const candidate = candidates[j]
      if (range.test(candidate) && (!minver || gt(minver, candidate))) {
        minver = candidate
      }
    }
  }

  return minver
}
module.exports = minVersion
