'use strict'

// The version neighborhood algorithm.
//
// Versions form a single total order, so every version has a well-defined
// "neighborhood": the versions immediately around it.  Range questions
// like "is this version above every possible member of the range?" or
// "what is the lowest version that can match?" need two primitives:
//
// - successor(v): the least version strictly greater than v.  This pins
//   down how the prerelease tier is traversed:
//   - x.y.z       -> x.y.(z+1)-0, because every prerelease of a tuple
//     sorts below the release itself, so nothing lives between x.y.z
//     and the floor of the next patch tuple.
//   - x.y.z-p...  -> x.y.z-p....0, because appending a 0 identifier
//     yields the smallest prerelease list strictly greater than the
//     current one (a longer list whose prefix matches sorts higher,
//     and 0 is the smallest possible identifier).
//   In both cases the successor carries a prerelease, and
//   `x > v` is exactly equivalent to `x >= successor(v)`.
//
// - release(v): the release version of the same tuple (prerelease
//   stripped).  This is the least version without a prerelease that is
//   greater than or equal to v, used to step over a prerelease tier
//   that a range does not admit.

const SemVer = require('../classes/semver')

const successor = (version) => {
  const next = new SemVer(version.version, version.options)
  if (next.prerelease.length) {
    next.prerelease.push(0)
  } else {
    next.patch++
    next.prerelease = [0]
  }
  next.raw = next.format()
  return next
}

const release = (version) => {
  if (!version.prerelease.length) {
    return version
  }
  const normal = new SemVer(version.version, version.options)
  normal.prerelease = []
  normal.raw = normal.format()
  return normal
}

module.exports = { successor, release }
