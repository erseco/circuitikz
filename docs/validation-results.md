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
