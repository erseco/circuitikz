# M2 design and review record

M2 is implemented on a branch stacked on M1, at the user's explicit request. These are concrete
reviewable design choices in the fork, **not a claim of prior upstream maintainer agreement**.
REQUIREMENTS.md and public type interfaces remain unchanged. Upstream design approval remains a
review item before these proposals are merged upstream.

- **Open terminals:** `connectivityOf` completes missing non-junction ports from `netlist.nodes` as
  singleton nets. The input graph retains every terminal, so R-5.1.3 and the literal R-6.2 expression
  now agree. No expected terminals are removed and no synthetic self-connections are introduced.
  Existing open-terminal helper tests explicitly change their expected observable results.
- **Ambiguous keys:** reject multiple component kinds or label-bearing keys at the conflicting key.
  Annotation text supplies a label only when it is the sole label-bearing key; presentation generates
  its required warning. Repeated invert sets true, following CircuiTikZ pgfcircpath.tex, never toggles.
  Only the contract's explicitly listed presentation/pole keys are accepted. Unknowns remain errors.
- **Unlabelled parts:** keep the literal R-4.5.4 ID label. No API change to suppress duplicate visible
  designators. Battery semantic ports are authoritative; no workaround exchanges ports to compensate
  for the apparent upstream core battery glyph inconsistency found in the initial audit.
- **Geometry:** exact coordinate-keyed vertices; components split nets, wires join them. Union-find
  retains earlier roots and a source-ordered spanning forest. Degenerate wire steps have no physical
  branch and are removed before degree calculation. Original nondegenerate degrees determine junctions
  before cycle pruning. Collinear primitive-integer direction groups plus interval sweeps detect overlaps;
  geometric intersections never add vertices. Corners contract without synthetic junctions.
- **Connections:** contract a separate terminal/junction forest; wire-bearing paths use the earliest
  wire operation's direction and source order. Direct terminal contacts use source appearance. Junction
  anchors are visited before terminal anchors, making every remaining ordering choice deterministic.
- **Representability:** fixed-size core symbols can collide even when individual segments are long
  enough. Before emission, core's public component rectangles check body overlap and fence extent;
  a fixed-cell broad phase limits local comparisons. Such input gets actionable geometry diagnostics,
  rather than leaking predictable input failures into the internal-error oracle.
- **Verification:** graph-derived expected nets precede emission. Core diagnoses and compiles the output;
  an independent coordinate/orientation derivation checks kinds, IDs, labels, colors, variants and
  junctions. Only then is buildNetlist connectivity compared. Corruption tests independently change
  each property and assert failure. Unexpected exceptions/errors discard all output.

## Source evidence

The exact inspected upstream revisions and shape references are retained in implementation-audit.md.
M2 mappings cite CircuiTikZ `tex/pgfcircbipoles.tex`: zigzag/square resistors, capacitor, inductors and
Battery 1; `tex/pgfcircpath.tex` establishes inverted xscale. In Battery 1's default branch, the long
plate is at the path start; fixbatteries moves it to the end. Core 1.1 electrical definitions name
source ports negative at canonical left and positive at right. Quarter turns follow those semantic
names. Passive in/out ports are canonical left/right and their fixed span is 84 Schemd units.

## Tests and fixtures

The original two expected conformance documents are unchanged. Added alias, open-terminal,
fixbatteries/invert, exact-midpoint, named/relative/corner and cycle-return documents were independently
constructed and then compared with conversion; every expected declaration and connection was read.
Rejection expectations were generated once and read in full, including codes, positions and messages.
Property tests cover translation, independent statement ordering, wire reversal, determinism and
battery inversion. Resource tests cover exactly 512 junctions and one past, before construction continues.
Fuzz now generates valid convertible grammar examples as well as malformed input and mutations.

M3 remains a separate stacked PR. Core's battery glyph issue is an upstream visual limitation; no core
repository, package, release, tag or public type was modified here.
