# Local validation results

Executed 2026-10-25, using **Node.js 24.22.1**, **Bun 1.4.4**, TypeScript 7.0.2 and the unchanged
lockfile (core 1.1.0, Vitest/V8 coverage 5.0.5, Vite 8.3.5). These are local results; GitHub Actions
results must be read separately. Scope is the M1 front end, not a complete converter.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun ci` | PASS | Frozen lockfile, exit 0; no lockfile changes |
| `bun run check` | PASS | Original strict TypeScript configuration, tests included |
| `bun run test` | PASS | 175 tests, 7 suites; no skipped/focused tests |
| `bun run test:coverage` | PASS | Per-file 100% statements, branches, functions and lines |
| `bun run test:mutation` | PASS | Green baseline, 44/44 mutants killed by recorded failing tests |
| `bun run test:fuzz:contract` | PASS | Seed 6049357; 20000 cases / 40000 conversions, valid option variations and active limit boundaries |
| `bun run build` | PASS | ESM JS and declarations for all modules |
| `bun run size` | PASS | Both 5 KiB compression gates; detailed measurements below |
| `bun run release:check` | PASS | Type check, coverage, mutation, fuzz/build, smoke and size repeated together |
| `npm pack --dry-run` | PASS | Only package metadata/license, README, CHANGELOG and dist; no publication |
| `bun run test:smoke` | PASS | Node 24.22.1 built exports, recursive declarations, topology helper and diagnostics-only converter; browser-target bundle without Node/DOM globals |

No mandatory command was skipped. Intermediate failures during development were fixed before this
final sequence: incomplete coverage/assertions, the scaffold-only size budget, an equivalent mutant,
Node type imports in the infrastructure test, and the unavailable legacy TypeScript compiler API.
No thresholds were lowered, no tests suppressed, and no package dependency was added.

## Coverage

| Axis | Covered / total | Actual | Gate |
| --- | --- | --- | --- |
| Statements | 457 / 457 | 100% | 100% per file |
| Branches | 353 / 353 | 100% | 100% per file |
| Functions | 61 / 61 | 100% | 100% per file |
| Lines | 330 / 330 | 100% | 100% per file |

Eight files have executable coverage; three type/re-export-only files are empty in the V8 report.
Every source file is included by `src/**/*.ts`; no coverage exclusions or ignore comments were added.

## Size

Whole public entry, minified for ES2022, core external; gzip level 9, brotli quality 11.

| Measurement | M0 | M1 | Change | Gate |
| --- | --- | --- | --- | --- |
| Minified | 991 B | 11833 B | +10842 B | Measured, no separate gate |
| Gzip | 533 B | 4406 B | +3873 B | 5120 B |
| Brotli-11 | 455 B | 3942 B | +3487 B | 5120 B |

The M0-only 1024 B gzip/brotli gates could not hold a parser. The 5 KiB replacement is justified in
`scripts/check-bundle-size.mjs` by the measured scanner/parser/resolver/diagnostics/host-validation
cost. The contractual 0.1.0 ceiling remains **12288 B gzip**. Future graph/emission code must be
measured rather than assuming that the remaining budget will suffice.

## Limits of these results

There are no successful conversion results in M1, so no claim is made about emitted source maps,
component/label/polarity preservation, graph connectivity, topology metamorphisms or M2/M3 acceptance.
The original conformance expected documents still compile, route first-pass and match their metadata;
they are not yet produced by this converter. Real-browser integration and successful dist conversion
remain M2 work. The browser/worker compatibility check is a browser-target VM smoke, not a browser run.

The initial audit, implementation sequence and unresolved maintainer decisions are in
[implementation-audit.md](./implementation-audit.md). All 106 R-* requirements, including deferred
and blocked ones, are mapped in [requirements-traceability.md](./requirements-traceability.md).

## Review follow-up

Rerun on 2026-10-25 after the code-review fixes, locally with **Node.js 26.12.1** and Bun 1.4.4 and
the unchanged lockfile; CI runs the same gates on Node 24. Every mandatory command passed again:
`bun ci`, `check`, `test`, `test:coverage`, `test:mutation`, `test:fuzz:contract` (seed 6049357,
20000 cases / 40000 conversions), `build`, `size`, `release:check`, `npm pack --dry-run`, `test:smoke`.

| Measure | Result |
| --- | --- |
| Tests | 176 passed, 7 suites |
| Mutants | 48/48 killed |
| Coverage (stmts / branches / funcs / lines) | 469/469, 363/363, 62/62, 335/335, 100% per file |
| Size | 12137 B minified, 4528 B gzip, 4038 B brotli-11 (5 KiB gates unchanged) |

Changes: `cycle` closes the current subpath, and is rejected after a `to[...]` in that subpath, because
CircuiTikZ closes it inside the component's drawing; a missing `;` before the next statement no longer
swallows that statement during recovery; empty option entries are ignored. The `empty-option`
rejection fixture is replaced by `missing-semicolon-recovery`, so the corpus stays at 36 cases; `cycle-after-component` then makes it 37.
