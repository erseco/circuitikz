# Initial implementation audit and sequence

This records the M0→M1 inspection. Current M2 decisions and implementation are in
[m2-design.md](m2-design.md); historical pending statements below describe the M1 baseline.

## Baseline inspection

Audited base: `f5dc1e0` (M0), shared by the upstream and user fork at inspection. No `AGENTS.md` was
present. Read `REQUIREMENTS.md`, `CONTRIBUTING.md`, README, all three source modules, all four test
suites and both conformance cases, the TypeScript/Vitest configurations, mutation and size scripts,
`package.json`, `bun.lock`, CODEOWNERS, the PR template and CI/publish workflow before changing code.

The issue discussion is [schemd/circuitikz#1](https://github.com/schemd/circuitikz/issues/1): the
technical guidance is in the earlier comment, not the final repository-creation acknowledgement.
It asks for an independent package, a circuit graph rather than picture tracing, explicit rejection,
minimal junctions, and compiler/netlist verification.

| Area | M0 status | Evidence / defect |
| --- | --- | --- |
| Public types | Implemented | `src/types.ts`; no converter export or implementation |
| Topology helpers | Implemented | Canonical sorting and junction stripping; 100% coverage, 10 mutants |
| Core conformance | Implemented for expected text | Both supplied fixtures diagnose cleanly, route first-pass, match metadata |
| Conversion | Missing | No lexer, AST, parser, resolver, graph, emitter or conversion checks |
| Diagnostics / host options | Missing | Types only |
| Labels / component semantics | Missing | Fixture assertions establish some intended behavior, not a converter |
| Fuzz / property tests | Missing | No fuzz script or CI invocation |
| Coverage | Strong but aggregate | Recursive source include already correct; per-file thresholds absent |
| Packaging | Incomplete | Source inventory only `src/*.ts`; built smoke checked one export |
| Source policy | Partial | Line regexes missed multiline/double-quoted imports and some type/global forms |
| Mutation infrastructure | Partial | No baseline gate; any failing subprocess, including setup failures, counted as killed |
| Toolchain | Partly reproducible | Lockfile and `packageManager` pinned Bun; workflow installed an unspecified Bun |
| Size | M0-only budget | 991 B minified, 533 B gzip, 455 B brotli-11; both gates 1024 B |

The unmodified baseline `bun run release:check` passed locally before implementation. The package
is a scaffold, so a complete importer is a sequence of PRs, not an improvement to an existing parser.

## Implemented in this PR

This PR implements the **M1 front end and its quality infrastructure**. It deliberately does not
claim M2/M3 conversion. The M1 pending diagnostic is explicitly required by REQUIREMENTS §10.
The existing public interfaces, peer range, lockfile, requirements and two conformance outputs are
unchanged.

- `lexer.ts`: bounded UTF-16 scanner, CR/LF/CRLF, comments/control symbols, spans and brace ceiling.
- `ast.ts`: span-bearing statement, option, coordinate and operation types.
- `parser.ts`: single environment, draw/coordinate statements, retained option groups and recovery.
- `coordinates.ts`: exact decimal integers, literal named references, separate pen/reference state,
  cycle endpoints, duplicate/undefined names and overflow; independent missing names keep reporting.
- `diagnostics.ts`: centralized messages, warning escalation and stable ordering.
- `options.ts`: host argument validation; unknown own keys cannot silently disappear.
- `limits.ts`: immutable ceilings, scale and margin constants; junction enforcement is deferred.
- `convert.ts`: pure diagnostics-only entry; no partial output and no false successful result.

36 rejection cases were generated once and their complete messages, severities and source positions
were read and checked before committing. The component/element limit positions were checked against
the repeated operation lengths; EOF and missing-semicolon spans are zero-width. No conformance
output was regenerated. Tests cover module behavior, API behavior, resource boundaries and hostile
inputs. No devDependency was added. Host-only fuzz infrastructure tests are `.mjs`, using the same
Vitest runner, so they need no new Node type dependency in the browser library's strict TS project.

Coverage includes `src/**/*.ts`, enforces all four 100% gates per file, and has no exclusions or
ignore comments. Packaging inventory is recursive and mutually classifies public/internal modules.
Syntax-token policy checks use the installed TypeScript 7 scanner, including its template rescanning,
without requiring the removed legacy TypeScript compiler API or an extra dependency.

Fuzzing has a timed worker, deterministic seed and valid option variations. Fixed boundary cases
precede random cases. The test suite deliberately supplies a throwing converter and a hung converter
to prove nonzero failure, isolation and failure-artifact behavior. Delta debugging preserves options.
Mutations require a green baseline and recorded failing tests; load errors and timeouts fail the gate
rather than producing false mutation credit. An equivalent early-overflow mutant was removed: the
final scaled-integer check rejects the same inputs with the same diagnostic; that final guard has
its own killed mutant.

## Architecture and implementation sequence

1. **M1 front end (this PR).** Scanner → span AST → exact resolution → diagnostics-only public entry.
   Check purity and progress, every active ceiling, recovery, complete diagnostic fixtures, fuzz,
   coverage, mutation, runtime packaging and size. Review independently of graph/emission design.
2. **M2 graph PR.** Resolve the open-terminal oracle decision below; build coordinate-keyed vertices,
   wire/component edges and terminal inventories. Use disjoint-set union for deterministic nets,
   keep a source-ordered spanning forest, and classify junctions by original degree before cycles
   are pruned. Detect overlaps independently of crossing geometry; bound vertices/edges before work.
3. **M2 emitter/verification PR.** Centralize passive/battery1 metadata with explicit terminal
   conventions. Emit declarations, junctions and contracted connections in required order; retain
   source spans. Compute expected nets from the graph before emission. Independently compare kinds,
   IDs, labels, variants, orientation and polar ports after diagnose/compile/buildNetlist. Add positive
   byte-exact conversions and topology properties; keep both original fixtures unchanged.
4. **M3 family PRs.** Batteries, diodes, switches and grounds with source-cited metadata, four
   orientation cases, reverse directions, invert, negative cases and semantic mutants for each row.
5. **M4 readiness.** Full documentation, measured size below 12 KiB gzip, real-browser integration,
   successful built-package conversion, website documentation and maintainer review. No publication
   or tagging is authorized or performed here.

Every stage must keep the existing gates green and add its logic-bearing modules to the mutation
inventory. M1's green gates are not evidence that the unimplemented graph or emitter is correct.

## Verified upstream semantics

Core checkout/package: **1.1.0**, `31907a1` (lockfile resolution). Relevant public entry points are
`diagnoseSchematic`, `compileSchematic`, `buildNetlist`, `parseSchematicFence`, `SchematicNetlist`
and `SchematicFence`; source imports must use `@schemd/core` only.

- [Core netlist construction](https://github.com/schemd/core/blob/31907a19fd437e6ef8b03ce6a4ee713d2e6e4134/src/netlist.ts): nodes expose
  all ports, while nets are built exclusively from connections. `tests/topology.test.ts` reproduces
  the isolated-terminal discrepancy with the real installed package.
- [Core electrical definitions](https://github.com/schemd/core/blob/31907a19fd437e6ef8b03ce6a4ee713d2e6e4134/src/symbols/electrical.ts):
  passive ports `in`/`out`, diode `anode`/`cathode`, source `negative` at canonical x=-42 and `positive`
  at x=42. Grounds expose `in` at y=-42; placement must account for this. Standard two-terminal
  extents span 84 units. Quarter turns preserve terminal names while moving their positions.
- The same source's battery glyph puts the long plate at x=-8, but the canonical `positive` port is
  on the right. This appears to be a **visual polarity inconsistency in core 1.1.0**, not a license
  to exchange port names in the importer. It needs upstream confirmation; this PR emits no batteries.
- [Core math labels](https://github.com/schemd/core/blob/31907a19fd437e6ef8b03ce6a4ee713d2e6e4134/src/math-label.ts): unknown commands
  remain literal. M2 must explicitly validate the allowed set and translate spacing commands rather
  than passing through arbitrary TeX. Connectivity alone cannot verify label or component semantics.

CircuiTikZ inspected commit:
[`226cd409d8b7625a42d0a084eef085e4e56f86d6`](https://github.com/circuitikz/circuitikz/tree/226cd409d8b7625a42d0a084eef085e4e56f86d6).

- [`tex/pgfcircbipoles.tex`](https://github.com/circuitikz/circuitikz/blob/226cd409d8b7625a42d0a084eef085e4e56f86d6/tex/pgfcircbipoles.tex),
  shapes **battery**, **battery1** (Battery 1), **battery2** (Battery 2): long plates are at the left
  in the default branch and at the right with `fixbatteries`. Thickness of the short plate does not
  change its sign. M2/M3 must compose that convention with path direction and invert.
- [`tex/pgfcircpath.tex`](https://github.com/circuitikz/circuitikz/blob/226cd409d8b7625a42d0a084eef085e4e56f86d6/tex/pgfcircpath.tex):
  `invert` sets inverted=true (it does not toggle it); the bipole transform uses a negative xscale.
- Switch shapes **nos**, **ncs**, **ospst**, **cspst** in `pgfcircbipoles.tex` distinguish normally
  open/closed depictions and opening/closing arrows. Core's SPST model exposes only `in`/`out`, with
  no closed-state option; the R-4.4.1 kind mapping must not be confused with an electrical simulation
  of switch state. Core itself does no such simulation.
- Ground shape **ground** is in
  [`tex/pgfcircmonopoles.tex`](https://github.com/circuitikz/circuitikz/blob/226cd409d8b7625a42d0a084eef085e4e56f86d6/tex/pgfcircmonopoles.tex).
  M3 must establish its Schemd style explicitly; core's default ground style is `signal`.
- [TikZ coordinates §13.4.1](https://tikz.dev/tikz-coordinates#sec-13.4.1) establishes the separate
  relative reference for `+` and `++`. [Names §17.2.1](https://tikz.dev/tikz-shapes#sec-17.2.1) explicitly
  allow numeric, spaced and other literal names; the parser does not impose an ASCII-identifier rule.

Context7 was consulted for Vitest coverage inclusion/per-file thresholds, TypeScript ESM resolution
and syntax scanning, and Bun frozen-lockfile installation/CI. Cross-checked
[Vitest's coverage reference](https://vitest.dev/config/coverage.html) and the actual installed
TypeScript 7.0.2 API. CI's `bun-version-file: package.json` was verified against
[setup-bun v2 action metadata](https://github.com/oven-sh/setup-bun/blob/v2/action.yml).

## Decisions before M2

These are proposals for maintainer review, **not implemented assumptions**. REQUIREMENTS §9.3
requires design to be settled in an issue before code depends on it. No issue/comment was posted;
the user authorized a PR to their fork, not upstream discussion or a contract change.

1. **Terminal-complete topology.** A lone resistor's graph has `[['R1.in'], ['R1.out']]` under
   R-5.1.3, but the literal R-6.2 expression returns `[]` with the current core/oracle. Prefer
   completing the oracle's connectivity from `netlist.nodes[].ports`, adding only absent non-junction
   ports as singleton nets and independently verifying the terminal inventory. That changes the
   existing public helper's observable behavior and test expectations. Alternatives are a core
   change or an explicitly specified comparison adapter. Do not omit expected terminals or synthesize
   self-wires to make the check pass. Obtain agreement before implementing the choice.
2. **Ambiguous labels and keys.** R-4.4.2 names component-assignment, `l`, annotation and presentation
   variants but does not settle conflicts. Prefer rejecting multiple label-bearing keys with a
   precise syntax diagnostic rather than guessing precedence; preserve idempotent repeated `invert`
   as true, matching CircuiTikZ. Confirm whether annotation text counts as a label, and enumerate
   “other pole shapes” and the complete environment presentation allowlist. Unknown keys remain errors.
3. **Unlabelled parts.** The contract's own open question says to settle duplicate visible ID/label
   before M2. Prefer following R-4.5.4 unchanged unless the maintainer approves an alternative.
4. **Battery glyph/ports and ground style.** Confirm the apparent core battery glyph polarity issue;
   keep netlist names authoritative, not guessed from the drawing. Confirm the contract's intended
   ground symbol style and exact placement before M3.

These questions prevent an honest claim of full M2/M3/M4 implementation. This PR provides an
independently reviewable, tested front end without weakening the requirements or inventing semantics.
