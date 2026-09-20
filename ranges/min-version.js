'use strict'

const SemVer = require('../classes/semver')
const Range = require('../classes/range')
const parseOptions = require('../internal/parse-options')
const { successor, conjunctionCell } = require('../internal/neighborhood')

// Lowest version that can actually satisfy each conjunction.
//
// For a conjunction whose neighborhood cell has a lower bound:
//   - an inclusive lower bound is itself the candidate;
//   - an exclusive lower bound is the successor of that version, using the
//     pinned prerelease-tier step (append 0 for prereleases; for a release
//     that is X.Y.(Z+1)-0 with includePrerelease, else X.Y.(Z+1)).
// The candidate is then checked against the upper bound and, finally, the
// whole range test, so upper bounds that cut into the prerelease tier (e.g.
// `>1.2.3 <1.2.4-0`) correctly yield no minimum.
const minVersion = (range, options) => {
  options = parseOptions(options)
  range = new Range(range, options)

  let minver = null
  for (const comparators of range.set) {
    const cell = conjunctionCell(comparators)
    if (cell === null) {
      continue
    }

    let candidate
    if (!cell.lo) {
      // Unbounded below: probe the absolute floors directly.
      candidate = new SemVer('0.0.0', options)
      if (!satisfiesCell(candidate, cell)) {
        candidate = new SemVer('0.0.0-0', options)
      }
    } else if (cell.loInclusive) {
      candidate = new SemVer(cell.lo.version, options)
    } else {
      candidate = successor(cell.lo, options)
    }

    if (!satisfiesCell(candidate, cell)) {
      continue
    }
    if (!range.test(candidate)) {
      continue
    }
    if (!minver || candidate.compare(minver) < 0) {
      minver = candidate
    }
  }

  return minver
}

const satisfiesCell = (version, { hi, hiInclusive }) => {
  if (!hi) {
    return true
  }
  const cmp = version.compare(hi)
  return hiInclusive ? cmp <= 0 : cmp < 0
}

module.exports = minVersion
