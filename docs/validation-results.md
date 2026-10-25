# M3 validation results

Executed 2026-10-25 with Node.js 24.22.1, Bun 1.4.4 and the unchanged lockfile.
Stack: M1 → M2 → M3. Upstream design approval is not claimed.

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

Tests: 827 passed (827). Mutation score: 100% (86/86 killed).
Fuzz seed 6049357: 20000 cases / 40000 conversions, including M3 components and ground/junction boundaries.

| Coverage | Actual | Covered / total |
| --- | --- | --- |
| statements | 100% | 885 / 885 |
| branches | 100% | 717 / 717 |
| functions | 100% | 100 / 100 |
| lines | 100% | 622 / 622 |

Every source file is included; all four gates remain 100% per file with no exclusions.

| Whole public bundle, core external | M2 | M3 | Unchanged gate |
| --- | --- | --- | --- |
| Minified | 23141 B | 25249 B | measured |
| Gzip | 8615 B | 9174 B | 9216 B |
| Brotli-11 | 7762 B | 8278 B | 9216 B |

M3 adds 559 B gzip / 516 B brotli and does not raise the M2 budget. The 12288 B release ceiling holds.
No runtime/dev dependency or public type interface changed. The original two conformance outputs
remain unchanged; added expectations use independent endpoint/placement templates and were inspected.

The browser-target VM smoke performs successful conversion with standard TextEncoder/TextDecoder Web
APIs and no Node/DOM globals. It is not a real-browser engine integration test. Known core battery glyph
polarity and rose alias/theme behavior are documented in README and m3-design.md. Ground/junction body
collisions are explicitly rejected rather than silently dropping junctions or inventing offsets.
M4 website/publication/tagging is not performed.

## Review follow-up

Rerun on 2026-10-25 after the code-review fixes, locally with **Node.js 26.12.1** and Bun 1.4.4 and
the unchanged lockfile; CI runs the same gates on Node 24. Every mandatory command passed again:
`bun ci`, `check`, `test`, `test:coverage`, `test:mutation`, `test:fuzz:contract` (seed 6049357,
20000 cases / 40000 conversions), `build`, `size`, `release:check`, `npm pack --dry-run`, `test:smoke`.

| Measure | Result |
| --- | --- |
| Tests | 812 passed |
| Mutants | 98/98 killed |
| Coverage (stmts / branches / funcs / lines) | 920/920, 744/744, 105/105, 641/641, 100% per file |
| Size | 26231 B minified, 9567 B gzip, 8620 B brotli-11 |

The merged M1/M2 fixes move gzip past the 9 KiB gate (9181 -> 9567 B). The gzip gate moves to
9.5 KiB with the measurement recorded in `scripts/check-bundle-size.mjs`; brotli keeps 9 KiB and
both stay below the 12288 B release ceiling. The vertex-to-canvas mapping is now one `canvas()`
helper shared by the emitter and the placement preflight. 76 conformance and 64 rejection fixtures.

After schemd/circuitikz#2 was settled: core `^1.2.0` with unlabelled parts emitted without a label
(46 expected documents checked to differ only by the removed `"ID"`), and `ncs`/`cspst` rejected with
one `unsupported` diagnostic (#2 §4). Their two conformance fixtures became the `closed-switch`
rejection fixture, and the alias tests now cover only `nos`/`ospst`. 812 tests (19 fewer, because the
closed-switch family rows went away and one rejection test took their place).
