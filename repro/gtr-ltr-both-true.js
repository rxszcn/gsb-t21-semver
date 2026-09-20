"use strict"
const semver = require("../index.js")
const { Range, Comparator, SemVer } = semver
const P = (l, ...v) => console.log(l + " => " + v.map(x => { try { return JSON.stringify(x) } catch (e) { return "UNSERIAL" } }).join(" | "))
const T = (fn) => { try { return fn() } catch (e) { return "THROW:" + e.constructor.name + ":" + e.message.slice(0, 60) } }

// M. gtr/ltr README contract
const cases = [["1.2.3-alpha", ">=1.0.0"], ["1.2.3-alpha", ">=1.0.0 <2.0.0"], ["2.0.0-beta", ">=1.0.0 <2.0.0"], ["1.2.3", ">x"], ["1.0.0-rc.1", "1.x"], ["1.0.0", ">1.2.3 <1.2.4-0"], ["9.9.9", ">1.2.3 <1.2.4-0"], ["0.0.1", ">1.2.3 <1.2.4-0"]]
for (const [v, r] of cases) {
  P("M " + v + "  " + r + " [sat,gtr,ltr]", [semver.satisfies(v, r), semver.gtr(v, r), semver.ltr(v, r)])
}

// N. subset/intersects on empty-conjunction
P("N1 minVersion('>1.2.3 <1.2.4-0')", T(() => String(semver.minVersion(">1.2.3 <1.2.4-0"))))
P("N2 subset(a,'1.0.0')", T(() => semver.subset(">1.2.3 <1.2.4-0", "1.0.0")))
P("N3 intersects(a,a)", T(() => semver.intersects(">1.2.3 <1.2.4-0", ">1.2.3 <1.2.4-0")))
P("N4 subset('<0.0.0-0','1.0.0')", T(() => semver.subset("<0.0.0-0", "1.0.0")))
P("N5 subset('>=0.0.0-0','x') no-incPr", T(() => semver.subset(">=0.0.0-0", "x")))
P("N6 subset('x','>=0.0.0-0') no-incPr", T(() => semver.subset("x", ">=0.0.0-0")))
P("N7 intersects('>=0.0.0-0','1.2.3')", T(() => semver.intersects(">=0.0.0-0", "1.2.3")))
P("N8 satisfies tuple-prerelease: satisfies('1.2.4-alpha','>=1.2.3-alpha')", semver.satisfies("1.2.4-alpha", ">=1.2.3-alpha"))
P("N9 intersects('>=1.2.3-alpha <1.2.4','>=1.2.4-alpha <2') expect EMPTY overlap (tuple rule)", semver.intersects(">=1.2.3-alpha <1.2.4", ">=1.2.4-alpha <2"))
P("N10 brute overlap N9:", (() => {
  const a = new Range(">=1.2.3-alpha <1.2.4"), b = new Range(">=1.2.4-alpha <2")
  const vs = []
  for (const x of ["", "-0", "-1", "-alpha", "-beta", "-z"]) {
    for (const t of ["1.2.3", "1.2.4", "1.3.0", "1.9.9"]) vs.push(t + x)
  }
  return vs.filter(v => { try { return a.test(v) && b.test(v) } catch (e) { return false } })
})())

// O. simplifyRange contract
const rr = new Range("1.0.0 || 2.0.0")
const s1 = semver.simplifyRange(["1.0.0", "2.0.0"], rr)
P("O2 same-object-return?", s1 === rr, typeof s1)
P("O3", (() => { const s = semver.simplifyRange(["1.0.0", "1.1.0", "2.0.0"], ">=1.0.0 <1.2.0 || 2.0.0"); return [typeof s, String(s)] })())
P("O4 prerelease sampling", (() => { const s = semver.simplifyRange(["1.0.0", "1.1.0-beta", "2.0.0"], ">=1.0.0 <2.0.0"); return [typeof s, String(s)] })())
P("O5 simplify vs subset agreement", (() => { const s = semver.simplifyRange(["1.0.0", "1.0.1"], "1.0.0 || 1.0.1"); return [String(s), semver.subset(String(s), "1.0.0 || 1.0.1"), semver.subset("1.0.0 || 1.0.1", String(s))] })())

// P. toComparators
P("P1", semver.toComparators("1.2.3 - 2.0.0 || >3"))
P("P2 toComparators('>=0.0.0')", T(() => semver.toComparators(">=0.0.0")))
P("P3 roundtrip ^1.2.3", semver.toComparators(semver.toComparators("^1.2.3").map(x => x.join(" ")).join(" || ")))

// D1. Comparator loose grammar leak
P("C-tilde ctor", T(() => { const c = new Comparator("~1.2.3", { loose: true }); return [c.operator, c.value, String(c.semver)] }))
P("C-tilde test", T(() => new Comparator("~1.2.3", { loose: true }).test("1.2.9")))
P("C-caret test", T(() => new Comparator("^1.2.3", { loose: true }).test("1.2.9")))
P("C-xrange test", T(() => new Comparator("1.x", { loose: true }).test("1.5.0")))
P("C-tilde strict", T(() => new Comparator("~1.2.3", { loose: false })))
P("C-range-with-tilde-LOOSE via Range", T(() => new Range("~1.2.3 garbage", { loose: true }).set[0].map(c => c.value)))

// D2. coerce output validity
P("X1 coerce('1.2.3-01',{includePrerelease:true})", T(() => String(semver.coerce("1.2.3-01", { includePrerelease: true }))))
P("X2 valid of X1 output", T(() => String(semver.valid(T(() => String(semver.coerce("1.2.3-01", { includePrerelease: true })))))))
P("X3 coerce('1.2.3.4.5.6',{includePrerelease:true})", T(() => String(semver.coerce("1.2.3.4.5.6", { includePrerelease: true }))))
P("X4 coerce('v2')", T(() => String(semver.coerce("v2"))))
P("X5 coerce('1.2.3-beta.4.5',{includePrerelease:true})", T(() => String(semver.coerce("1.2.3-beta.4.5", { includePrerelease: true }))))
P("X6 coerce('1.2.3+build')", T(() => String(semver.coerce("1.2.3+build", { includePrerelease: true }))))
P("X7 coerce huge", T(() => String(semver.coerce("99999999999999999999.0.0"))))

// Q. maxSatisfying ties
P("Q1 maxSatisfying build tie", String(semver.maxSatisfying(["1.2.3+b1", "1.2.3+b2"], "1.2.3")))
P("Q2 reverse order", String(semver.maxSatisfying(["1.2.3+b2", "1.2.3+b1"], "1.2.3")))
