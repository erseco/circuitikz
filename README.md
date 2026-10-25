# @schemd/circuitikz

Parse a strict subset of [CircuiTikZ](https://github.com/circuitikz/circuitikz), with exact coordinates
and source diagnostics, as the first stage of a topology-preserving Schemd importer.

**Status: M1 front end, diagnostics only. There is no successful conversion yet.**
`convertCircuitikz` always returns `ok: false`, no source or fence, and an empty source map.
An otherwise accepted input receives `unsupported: Conversion is not implemented yet`.
Component mapping, label validation, graph construction, emission and compiler verification belong
to M2/M3 and are **not available**. Nothing is published before 0.1.0.

[REQUIREMENTS.md](./REQUIREMENTS.md) remains the contract. See the
[implementation audit and design questions](./docs/implementation-audit.md) and the
[requirements traceability matrix](./docs/requirements-traceability.md).

## Public API

```ts
import { convertCircuitikz } from '@schemd/circuitikz';

const result = convertCircuitikz(String.raw`\begin{circuitikz}
\coordinate (A) at (1.25cm,-2cm);
\draw (A) -- ++(2,0) -- +(0,1) -- cycle;
\end{circuitikz}`, { title: 'Example', strict: false });

// M1 returns diagnostics, including the pending-conversion error.
for (const diagnostic of result.diagnostics) {
  // The host chooses how to display the diagnostics.
}
```

| Export | Available behavior |
| --- | --- |
| `convertCircuitikz(source, options?)` | M1 parsing, coordinate resolution and diagnostics; no output yet |
| `connectivityOf(netlist)` | Canonical nets of `ID.port`, with junction terminals removed |
| `connectivityDifference(expected, actual)` | First connectivity difference as an actionable sentence, or `undefined` |
| `canonical(nets)` | Sort and deduplicate terminals in each net; discard empty nets; sort nets by code unit |

The existing topology oracle reflects **connection-driven** core netlists. It does not add isolated
terminals from the node port inventory. This conflicts with the terminal-complete graph specified by
R-5.1.3; the [M2 decision](./docs/implementation-audit.md#decisions-before-m2) must be reviewed before
conversion relies on it. The API and `REQUIREMENTS.md` have not been changed to hide the conflict.

Type-only exports are `CircuitConnectivity`, `CircuitikzConversion`, `CircuitikzDiagnostic`,
`CircuitikzDiagnosticCode`, `CircuitikzMapping`, and `ConvertCircuitikzOptions`, also available from
`@schemd/circuitikz/types`. Their existing interfaces are unchanged.

### Host options

| Key | Accepted value | Default |
| --- | --- | --- |
| `title` | Nonblank string, at most 120 UTF-16 code units | `Converted CircuiTikZ circuit` |
| `strict` | Boolean; turn presentation warnings into errors | `false` |
| `maxSourceLength` | Integer from 1 through 1,000,000 | `100000` |

A non-string source or invalid options throw `TypeError`. Unknown own keys, including symbol and
non-enumerable keys, are rejected. A supplied property with value `undefined` is invalid; omit it to
use the default. Malformed TeX is reported as diagnostics. Calls perform no I/O and retain no state.

## M1 input syntax

Pass exactly one `\begin{circuitikz}` … `\end{circuitikz}` environment. Only whitespace and `%`
comments may surround it. LF, CRLF and CR each end a line. Columns and offsets count UTF-16 code
units; a tab is one column. `\%` is a token rather than a comment marker; M1 does not promise that it
will be a supported component label in M2.

The parser retains spans and component option tokens for these statements:

```tex
\begin{circuitikz}
\coordinate (supply) at (0cm,0cm);
\draw (supply) coordinate (return) to[battery1] ++(0,2)
  to[R=100] ++(2,0) |- (return) -- cycle;
\end{circuitikz}
```

This example **parses but does not convert**. Component kinds, labels, polarity, dimensions and
connections are not validated by the M1 front end.

Coordinates support absolute `(x,y)` and `(xcm,ycm)`, relative `+(dx,dy)` and `++(dx,dy)`, references
to earlier named coordinates, inline `coordinate (name)`, and `cycle` as a segment destination, closing the current subpath (back to the last move-to), as
TikZ does. Empty option entries such as `[]` or `[R,]` are ignored, as pgfkeys does.
Names are literal TikZ names: numbers, spaces, hyphens and Unicode work; anchors, calculations,
macros and coordinate-system punctuation do not. Repeated definitions and undefined references
produce `reference` errors.

Decimals are accumulated digit by digit into integer hundredths. Signs and negative zero are
handled exactly; excessive decimal precision is rejected, never rounded. Unsupported units,
exponents, polar coordinates, anchors and coordinate calculations produce diagnostics. Integer
multiplication, final scaling and relative addition are checked for overflow.

`+` moves the pen but keeps the previous reference point. `++` moves both:

```tex
\draw (0,0) -- +(1,0) -- +(0,1);   % visits (0,0), (1,0), (0,1)
\draw (0,0) -- ++(1,0) -- ++(0,1); % visits (0,0), (1,0), (1,1)
```

The parser records `--`, `|-`, `-|` and `to[...]`; graph expansion of corner operations is deferred
to M2. Other path operations and statement commands are rejected. Recovery skips to the next
semicolon outside braces, or the environment end, so independent statement errors remain visible.

Environment `fixbatteries` is retained for M2. The explicitly enumerated pure presentation keys
`mirror`, `thick`, `thin`, `dashed`, `color=`, `line width=`, `-*`, `*-`, `*-*`, `-o`, `o-`, and `o-o`
produce warnings in environment/draw options; `strict` escalates them. Other environment/draw keys
are rejected. M1 only parses component option groups structurally: R-4.4/R-4.5 semantic validation,
including duplicate labels, `invert`, ground nodes and additional pole shapes, is pending.

### Limits and diagnostics

Before the corresponding work, M1 checks source length, 1024 statements, 4096 path elements per
statement (including the initial point and inline names), 512 non-`short` component declarations,
and brace nesting depth 32. A limit is inclusive. Junction construction and its ceiling belong to M2.

| Code | Meaning in M1 | Action |
| --- | --- | --- |
| `syntax` | Missing delimiter, malformed options or excessive precision | Correct the named token or decimal |
| `unsupported` | Environment, statement, path, numeric form, key, or the pending-conversion marker | Use the documented grammar; await M2 for actual conversion |
| `reference` | Undefined or repeated named coordinate | Define first, or rename the duplicate |
| `limit` | Resource budget or exact-integer overflow | Split the circuit or reduce coordinates |
| `geometry` | Reserved for M2 geometry checks | Not produced by M1 |
| `internal` | Reserved for M2 compiler/oracle verification failures | Not produced by M1 |

Each diagnostic contains its complete message, code, severity, one-based `line`, `column`, and
exclusive `endColumn` on that line. Sorting is stable by line and column. Presentation keys alone
may produce warnings. The 36 rejection fixtures pin full messages and positions.

## Compatibility and verification

TypeScript strict checking, ESM with `.js` relative imports, Node.js 24+, browsers and Web Workers.
No runtime dependencies; `@schemd/core` is the sole peer, with the existing `^1.1.0` range.
The lockfile currently tests core 1.1.0. No dependency or public type changes were introduced.

```sh
bun ci
bun run check
bun run test
bun run test:coverage       # 100% statements, branches, functions and lines per file
bun run test:mutation       # passing baseline, then every named mutant killed by a test failure
bun run test:fuzz:contract  # build and 20000 cases, seed 6049357
bun run build
bun run test:smoke          # built exports, declarations and host-free browser-target bundle
bun run size
bun run release:check
npm pack --dry-run
```

Fuzzing includes random characters, grammar tokens, mutated conformance inputs, valid option
variations and M1 resource boundaries. Each case runs twice in an isolated worker with a deadline;
a failure writes `fuzz-failure-<seed>.json`, with the original and deletion-minimized input and options.
CI uploads failures. Override the seed for a local run with
`node scripts/fuzz.mjs --seed=123 --cases=20000` after building.

The browser-target bundle smoke test executes without Node or DOM globals in a VM; it is not a
real-browser integration test. M2 must additionally exercise successful conversion and the compiler
in supported browser/worker engines. The existing series-battery and divider-junctions fixtures
remain unchanged and continue to compile, route on the first pass and match their declared nets.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before contributing. Maintainer design decisions and review
remain required; no releases, tags or upstream comments are created by this change.
