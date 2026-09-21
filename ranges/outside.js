'use strict'

const SemVer = require('../classes/semver')
const Comparator = require('../classes/comparator')
const { ANY } = Comparator
const Range = require('../classes/range')
const satisfies = require('../functions/satisfies')
const gt = require('../functions/gt')
const lte = require('../functions/lte')
const { successor, release } = require('../internal/neighborhood')

const outside = (version, range, hilo, options) => {
  version = new SemVer(version, options)
  range = new Range(range, options)

  if (hilo !== '>' && hilo !== '<') {
    throw new TypeError('Must provide a hilo val of "<" or ">"')
  }

  // If it satisfies the range it is not outside
  if (satisfies(version, range, options)) {
    return false
  }

  // The least possible version, used as the floor of comparator sets
  // that have no lower bound of their own.
  const bottom = new SemVer('0.0.0-0', options)

  // A version with a prerelease is only a possible member of a
  // comparator set when the range options allow prereleases, or when
  // some comparator of the set has a prerelease on the same x.y.z
  // tuple (mirrors the admissibility rule in Range.test).
  const admissible = (comparators, v) => {
    if (!v.prerelease.length || range.options.includePrerelease) {
      return true
    }
    return comparators.some((comparator) =>
      comparator.semver !== ANY &&
      comparator.semver.prerelease.length > 0 &&
      comparator.semver.major === v.major &&
      comparator.semver.minor === v.minor &&
      comparator.semver.patch === v.patch
    )
  }

  // The least admissible version at or above v: v itself when its
  // prerelease is allowed, otherwise the release of the same tuple
  // (nothing admissible lives in between, since only same-tuple
  // prereleases sort there, and those are not admitted either).
  const ceilAdmissible = (comparators, v) =>
    admissible(comparators, v) ? v : release(v)

  // Track whether the range has any members at all.  An empty range is
  // vacuously both above and below every version, which would make gtr
  // and ltr both true and break their mutual exclusion with satisfies,
  // so an empty range reports "not outside".
  let anyMember = false

  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    // The least version allowed by the lower-bound comparators of this
    // set.  A strict '>' floor is converted to an inclusive one via the
    // successor, so the floor is always a plain lower bound.  Exact
    // comparators bound from both sides.
    let floor = null
    const uppers = []
    for (let j = 0; j < comparators.length; ++j) {
      const comparator = comparators[j]
      if (comparator.semver === ANY) {
        continue
      }
      switch (comparator.operator) {
        case '>': {
          const bound = successor(comparator.semver)
          floor = floor && gt(floor, bound) ? floor : bound
          break
        }
        case '<':
        case '<=':
          uppers.push(comparator)
          break
        default:
          // '' and '>='
          floor = floor && gt(floor, comparator.semver) ? floor : comparator.semver
          if (comparator.operator === '') {
            uppers.push(comparator)
          }
      }
    }

    const inUppers = (v) => uppers.every((comparator) => comparator.test(v))

    // The least possible member of this set: the set is empty exactly
    // when even this candidate falls outside the upper bounds.
    const lowest = ceilAdmissible(comparators, floor || bottom)
    const setHasMembers = inUppers(lowest)
    anyMember = anyMember || setHasMembers

    if (hilo === '>') {
      // The version is not above the whole set if some member of the
      // set is greater than or equal to it.
      const start = floor && gt(floor, version) ? floor : version
      if (inUppers(ceilAdmissible(comparators, start))) {
        return false
      }
    } else {
      // The version is not below the whole set if some member of the
      // set is less than or equal to it, i.e. the least member is.
      if (setHasMembers && lte(lowest, version)) {
        return false
      }
    }
  }

  return anyMember
}

module.exports = outside
