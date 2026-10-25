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

## Review follow-up

Rerun on 2026-10-25 after the code-review fixes, locally with **Node.js 26.12.1** and Bun 1.4.4 and
the unchanged lockfile; CI runs the same gates on Node 24. Every mandatory command passed again:
`bun ci`, `check`, `test`, `test:coverage`, `test:mutation`, `test:fuzz:contract` (seed 6049357,
20000 cases / 40000 conversions), `build`, `size`, `release:check`, `npm pack --dry-run`, `test:smoke`.

| Measure | Result |
| --- | --- |
| Tests | 383 passed |
| Mutants | 82/82 killed |
| Coverage (stmts / branches / funcs / lines) | 873/873, 673/673, 101/101, 613/613, 100% per file |
| Size | 23935 B minified, 8897 B gzip, 8017 B brotli-11 (9 KiB gates unchanged) |

Changes on top of the M1 follow-up: an endpoint strictly inside another segment is a `geometry`
error (`t-junction` fixture), a wire with an unconnected end is `unsupported` (`wire-dead-end`
fixture; `segments-overlap` now also reports its dead end), and parts are matched to segments by
index rather than by span start. Both original conformance documents are unchanged. `cycle-return`
now closes with an explicit `-- (0,0)`, because `cycle` after `to[R]` is rejected; its expected
document is byte-identical.

After schemd/circuitikz#2 was settled: the peer range moves to `^1.2.0` (lockfile at core 1.2.0), and
unlabelled parts and junctions are emitted without a label (R-4.5.4). The nine changed expected
documents were checked to differ only by the removed `"ID"` labels, including both original fixtures.
