# M2 validation results

Executed locally on 2026-10-25 with Node.js 24.22.1, Bun 1.4.4 and the unchanged lockfile.
The M2 branch is stacked on M1. No upstream design approval or publication is claimed.

| Command | Result |
| --- | --- |
| `bun ci` | PASS (exit 0) |
| `bun run check` | PASS (exit 0) |
| `bun run test` | PASS (exit 0) |
| `bun run test:coverage` | PASS (exit 0) |
| `bun run test:mutation` | PASS (exit 0) |
| `bun run test:fuzz:contract` | PASS (exit 0) |
| `bun run build` | PASS (exit 0) |
| `bun run size` | PASS (exit 0) |
| `bun run release:check` | PASS (exit 0) |
| `npm pack --dry-run` | PASS (exit 0) |
| `bun run test:smoke` | PASS (exit 0) |

Tests  379 passed (379). 71/71 named mutants killed after a passing baseline.
Fuzz seed 6049357: 20000 cases / 40000 conversions, now including successful conversion grammar.

| Coverage axis | Actual | Covered / total |
| --- | --- | --- |
| statements | 100% | 846 / 846 |
| branches | 100% | 652 / 652 |
| functions | 100% | 98 / 98 |
| lines | 100% | 597 / 597 |

All source files remain included, with 100% per-file gates and no exclusions.

| Full public bundle, core external | M1 | M2 | M2 gate |
| --- | --- | --- | --- |
| Minified | 11833 B | 23141 B | measured |
| Gzip | 4406 B | 8615 B | 9216 B |
| Brotli-11 | 3942 B | 7762 B | 9216 B |

The size-script comment records the measured graph, component/label, emitter, geometry and verifier cost.
The 12288 B gzip release ceiling is unchanged. No dependency or public type interface was added.

Both original conformance documents are unchanged. New expectations were independently constructed or
generated once and read in full; see m2-design.md. M3 components remain deferred to the next stacked PR.
The browser-target smoke executes real successful conversion with standard TextEncoder/TextDecoder Web
APIs in a VM without Node/DOM globals; it is not a real-browser engine integration test.
