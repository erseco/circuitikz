# @schemd/circuitikz

Convert a strict CircuiTikZ subset to Schemd DSL, preserving component terminals, labels and nets.
**Status: M1–M3 implemented in stacked review PRs.**

```ts
import { convertCircuitikz } from '@schemd/circuitikz';
import { compileSchematic } from '@schemd/core';
const result = convertCircuitikz(String.raw`\begin{circuitikz}
\draw (0,0) to[battery1] (0,2) to[R=100] (2,2)
  to[R=200] (4,2) -- (4,0) -- (0,0);
\end{circuitikz}`);
if (result.ok) {
  const compiled = compileSchematic(result.source!, result.fence!);
}
```

The original series-battery and divider-junctions examples convert byte for byte to the unchanged
conformance documents. Each result is diagnosed, compiled and independently checked before success.
No partial source, fence or source map is returned on failure.

## Supported syntax

Pass exactly one `\begin{circuitikz}` … `\end{circuitikz}` environment, optionally surrounded by
whitespace or `%` comments. `\%` does not start a comment. LF, CRLF and CR end lines; source offsets
and one-based columns count UTF-16 code units, with a tab counting as one column.

| Construct | Support |
| --- | --- |
| `\draw[options] path;` | Component/wire paths; statement recovery at a semicolon outside braces, or at the next statement when a `;` is missing |
| `\coordinate (name) at (x,y);` | Previously defined literal names, including spaces, numbers and Unicode |
| `(x,y)`, `(xcm,ycm)` | Exact signed decimal hundredths; no rounding or exponent notation |
| `+(dx,dy)`, `++(dx,dy)` | Both move the pen; only `++` changes the relative reference |
| `coordinate (name)` on a path | Name the current point; duplicate/undefined names are errors |
| `--`, `|-`, `-|`, `cycle` | Wires and exact corner points; corners do not become junctions; `cycle` closes the current subpath (to the last move-to); after a `to[...]` in that subpath it is rejected, because CircuiTikZ closes it inside the component drawing |
| `R`, `resistor`, `american resistor`, `european resistor` | Resistor, `in` → `out` |
| `C`, `capacitor` | Capacitor, `in` → `out` |
| `L`, `inductor`, `american inductor`, `cute inductor`, `european inductor` | Inductor, `in` → `out` |
| `battery1`, `battery`, `battery2` | Battery source, `positive` → `negative` by default |
| `D`, `diode`, `empty diode`, `full diode` | Diode, `anode` → `cathode` |
| `zD`, `leD` | Zener / LED diode, `anode` → `cathode` |
| `nos`, `ospst`, `ncs`, `cspst` | SPST switch, `in` → `out` |
| `node[ground]{}` on a draw path | Earth ground with one `in` terminal |
| `short` | Wire; labels and invert on wires are rejected |

Environment `fixbatteries` reverses all three supported battery polarities. `invert` reverses a component's terminal order;
repeating invert is idempotent, matching CircuiTikZ. Component orientation is derived from semantic
ports and the path direction. Diagonal, zero-length or sub-0.84-unit component segments are errors.
Body collisions and labels outside the fixed canvas are reported as geometry errors before emission.

```tex
\begin{circuitikz}[fixbatteries]
\coordinate (A) at (0cm,0cm);
\draw (A) to[R=$R_1$] ++(2,0) coordinate (B)
  |- +(1,2) -- ++(0,3) to[C=100] (0,3) -| (A);
\end{circuitikz}
```

Coordinates use integer hundredths throughout. One TikZ unit is 100 Schemd units; y is inverted,
80-unit margins are added, and midpoints round down after normalization. IDs follow first appearance
per kind. Output has stable declaration/connection order, fixed colors and exactly one final newline.
Every nonblank output line has a source-map entry, including connection lines.

Vertices coincide only at exactly equal coordinates. Crossings do not create electrical connections.
Positive-length collinear overlaps are errors. A source-ordered wire spanning forest removes redundant
cycle edges. Zero-length wire steps draw no segment and do not inflate junction degree. Real vertices
with three or more edge ends become junctions. Wire geometry with no terminal or junction is rejected, as is a wire with an unconnected end and an
endpoint that lands inside another segment (split that segment to make a junction).
Unconnected component terminals are preserved as singleton nets rather than being omitted.

### Labels and options

`NAME=text` and `l=text` label the component without synthetic units. A part without a label is emitted without one, so only its designator is drawn (core 1.2.0, R-4.5.4).
Multiple component kinds or label-bearing keys are errors; there is no guessed precedence. The
annotation/presentation keys `l_`, `l^`, `a`, `a_`, `a^` also retain their text, with a warning about
presentation. Text labels support letters, digits, spaces and `. , - + / ( ) : '`. Text braces and
quotes are rejected. Math labels `$…$` support core's micro-math commands, sub/superscripts, grouping,
Greek letters in core's allowlist, `\Omega`, `\mu`, and spacing `\,`, `\;`, `\ `. Unknown commands
are rejected instead of being printed literally. Labels are validated before DSL quoting.

Only explicitly enumerated presentation keys are ignored: `mirror`, `thick`, `thin`, `dashed`,
`color=`, `line width=`, `-*`, `*-`, `*-*`, `-o`, `o-`, `o-o`, and source-defined circle/diamond/rectjoinfill endpoint combinations listed in m3-design.md. Each produces a warning; `strict: true`
escalates it to an error. Unknown keys, voltage/current/flow annotations and component naming keys
are errors. Environment/draw options use the same pure-presentation list, plus environment fixbatteries.
Empty option entries such as `[]` or `[R,]` are ignored, as pgfkeys does.

Unsupported: whole LaTeX documents, macros/expansion, scopes, styles, loops, arbitrary nodes, polar
coordinates, anchors, coordinate calculations, unsupported units, arcs/curves/shapes, other sources,
transistors and op-amps. Unsupported diode/switch/ground variants are rejected, never approximated.

## API

| Export | Contract |
| --- | --- |
| `convertCircuitikz(source, options?)` | Convert or return complete diagnostics with no partial output |
| `connectivityOf(netlist)` | Sorted real-component terminals per net, including isolated ports; junction terminals excluded |
| `connectivityDifference(expected, actual)` | First connectivity difference or `undefined` |
| `canonical(nets)` | Sort/deduplicate terminals, discard empty nets, sort nets by code unit |

The topology helper now completes core 1.1's connection-driven netlist from its node port inventory.
This is an observable correction to its M0/M1 behavior: isolated ports now appear in singleton nets.
Expected connectivity is built independently from the input graph before any DSL exists. Component
identity, kind, label, color, position, orientation and variant are checked independently of net equality.

Type-only exports: `CircuitConnectivity`, `CircuitikzConversion`, `CircuitikzDiagnostic`,
`CircuitikzDiagnosticCode`, `CircuitikzMapping`, `ConvertCircuitikzOptions`, also via the `/types` subpath.
Public type interfaces are unchanged. Each conversion owns its state and performs no I/O.

| Host option | Accepted values | Default |
| --- | --- | --- |
| `title` | Nonblank string, at most 120 UTF-16 code units | `Converted CircuiTikZ circuit` |
| `strict` | Boolean | `false` |
| `maxSourceLength` | Integer 1 … 1000000 | `100000` |

Invalid host arguments/options throw TypeError, including unknown own keys and explicitly supplied
undefined values. Malformed TeX never throws. Every diagnostic has code, severity, full message,
line, column and exclusive endColumn. Codes are syntax, unsupported, reference, geometry, limit,
and internal. Internal means a converter verification failure and asks for an input bug report.
Diagnostics are stably ordered by source position; only presentation options produce warnings.

Active ceilings: source length, 1024 statements, 4096 path elements per statement, 512 components,
512 junctions, brace nesting 32, and the core maximum canvas extent. Limits are checked before the
corresponding work; exact-integer overflow is rejected. Fuzz failures are minimized in timed workers.

## Compatibility and validation

Node.js 24+, strict TypeScript, ESM `.js` specifiers, browser/worker-compatible source, no runtime
or new development dependencies. Bun **1.4.4** is pinned; core `^1.2.0` is the sole peer, because unlabelled
parts are emitted without a label (R-4.5.4). Core draws its battery glyph with the long plate on the
`negative` side, so a battery is drawn mirrored until core fixes it; the output keeps **netlist**
polarity and never swaps terminals to compensate (R-4.4.3). `#rose` is a core custom
color alias; hosts should define the corresponding rose CSS variable. Closed/open SPST states are
not electrically simulated, and `ncs`/`cspst` are drawn as core's open `spst` symbol: core 1.1 has
only `spst` and `spdt` switch variants, and R-4.4 maps all four names to `switch [type=spst]`.

Ground uses the graph point as its unary terminal and normalized symbol center. If a mandatory
junction coincides with the ground body, conversion reports a geometry collision. Place the ground
at the end of a short wire from the junction; this preserves the net and avoids overlapping bodies.
See the ground-branch conformance fixture. Arbitrary ground nodes, body text, invert and alternate
ground styles are rejected.

```sh
bun ci
bun run check
bun run test
bun run test:coverage
bun run test:mutation
bun run test:fuzz:contract
bun run build
bun run size
bun run release:check
npm pack --dry-run
bun run test:smoke
```

Coverage gates remain 100% per source file on all four axes. CI runs at least 20000 seeded cases,
records minimized failures, checks the built package under Node 24, and runs on stacked PR bases.
The browser-target bundle smoke runs in a VM with standard TextEncoder/TextDecoder Web APIs and
without Node/DOM globals. It is not a real-browser integration run. No releases or tags are created.

[Requirements](REQUIREMENTS.md) · [Contributing](CONTRIBUTING.md) · [M2 design](docs/m2-design.md) · [M3 semantics](docs/m3-design.md) ·
[Traceability](docs/requirements-traceability.md) · [Validation](docs/validation-results.md) ·
[Initial audit](docs/implementation-audit.md) · [Changelog](CHANGELOG.md)
