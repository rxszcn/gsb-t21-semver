'use strict'

const SemVer = require('../classes/semver')
const Comparator = require('../classes/comparator')
const parseOptions = require('./parse-options')

// Version "neighborhood" helpers.
//
// SemVer precedence is dense immediately above any version:
//
// - The immediate successor of a release X.Y.Z is X.Y.(Z+1)-0, the lowest
//   possible prerelease of the next patch tuple.  When prereleases are not
//   being matched the next matchable step is the release X.Y.(Z+1), which
//   skips that whole prerelease tier.
// - The immediate successor of any prerelease X.Y.Z-pre is X.Y.Z-pre.0:
//   appending a numeric 0 identifier is the only step that admits nothing
//   in between.  Repeated steps keep appending 0.
//
// A conjunction of comparators occupies a contiguous neighborhood cell in
// this order: [lo, hi] with either endpoint optionally excluded.  Versions
// in the cell that still fail satisfies are the prerelease gaps produced by
// the default (non-includePrerelease) tuple rule; they sit inside the
// neighborhood, so they are neither above nor below it.

// Smallest version strictly greater than the given one in precedence order.
// With includePrerelease=false the release -> prerelease step is skipped,
// since nothing in that tier can be matched.
const successor = (version, options) => {
  options = parseOptions(options)
  const next = new SemVer(version instanceof SemVer ? version.version : version, options)
  if (next.prerelease.length) {
    // X.Y.Z-pre -> X.Y.Z-pre.0: nothing fits between them.
    next.prerelease.push(0)
  } else {
    // X.Y.Z -> X.Y.(Z+1): the next tuple.  Its lowest prerelease -0 is the
    // true immediate successor and is the floor when includePrerelease is
    // set; otherwise matching starts at the release itself.
    next.patch++
    if (options.includePrerelease) {
      next.prerelease = [0]
    }
  }
  next.raw = next.format()
  return next
}

// Reduce one comparator conjunction (an element of Range#set) to a
// neighborhood cell { lo, loInclusive, hi, hiInclusive }, where lo/hi may
// be null for an unbounded side.
// Returns null when the comparators contradict each other (lo > hi, or the
// two sides meet at a single excluded boundary), so no neighborhood exists.
const conjunctionCell = (comparators) => {
  let lo = null
  let loInclusive = false
  let hi = null
  let hiInclusive = false

  const raiseLower = (semver, inclusive) => {
    if (!lo || semver.compare(lo) > 0 ||
        (semver.compare(lo) === 0 && loInclusive && !inclusive)) {
      lo = semver
      loInclusive = inclusive
    }
  }

  const lowerUpper = (semver, inclusive) => {
    if (!hi || semver.compare(hi) < 0 ||
        (semver.compare(hi) === 0 && hiInclusive && !inclusive)) {
      hi = semver
      hiInclusive = inclusive
    }
  }

  for (const comparator of comparators) {
    if (comparator.semver === Comparator.ANY) {
      continue
    }

    switch (comparator.operator) {
      case '':
        // Exact pin: both ends meet at this version.
        raiseLower(comparator.semver, true)
        lowerUpper(comparator.semver, true)
        break
      case '>=':
        raiseLower(comparator.semver, true)
        break
      case '>':
        raiseLower(comparator.semver, false)
        break
      case '<=':
        lowerUpper(comparator.semver, true)
        break
      case '<':
        lowerUpper(comparator.semver, false)
        break
    }
  }

  if (lo && hi) {
    const cmp = lo.compare(hi)
    if (cmp > 0) {
      return null
    }
    if (cmp === 0 && !(loInclusive && hiInclusive)) {
      return null
    }
  }

  return { lo, loInclusive, hi, hiInclusive }
}

module.exports = {
  successor,
  conjunctionCell,
}
