# Local validation results

Executed 2026-10-25, using **Node.js 24.22.1**, **Bun 1.4.3**, TypeScript 7.0.2 and the unchanged
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
[implementation-audit.md](./implementation-audit.md). All 103 R-* requirements, including deferred
and blocked ones, are mapped in [requirements-traceability.md](./requirements-traceability.md).
