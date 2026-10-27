# M3 component semantics and review record

M3 is stacked on M2, as explicitly requested by the user. This is a fork implementation for review;
it does not claim prior upstream approval of the concrete M2/M3 design decisions. Public type
interfaces, REQUIREMENTS.md, dependency ranges and bun.lock remain unchanged. Bun is pinned to 1.4.4.

## Source-verified mapping

CircuiTikZ revision `226cd409d8b7625a42d0a084eef085e4e56f86d6`, files:
[pgfcircbipoles.tex](https://github.com/circuitikz/circuitikz/blob/226cd409d8b7625a42d0a084eef085e4e56f86d6/tex/pgfcircbipoles.tex),
[pgfcircpath.tex](https://github.com/circuitikz/circuitikz/blob/226cd409d8b7625a42d0a084eef085e4e56f86d6/tex/pgfcircpath.tex),
[pgfcircmonopoles.tex](https://github.com/circuitikz/circuitikz/blob/226cd409d8b7625a42d0a084eef085e4e56f86d6/tex/pgfcircmonopoles.tex).
Core 1.1.0 source revision and semantic port names are pinned in implementation-audit.md.

| CircuiTikZ | Source shape / rule | Schemd semantics |
| --- | --- | --- |
| battery, battery2 | Battery and Battery 2 branches in pgfcircbipoles.tex: default long plate left; fixbatteries long plate right | source type=battery; positive→negative by default; fixbatteries and invert compose |
| D, diode, empty diode, full diode | emptydiode/fulldiode and generated D aliases; cathode bar at res@right | diode; anode→cathode |
| zD | emptyzdiode/fullzdiode shapes and generated zD aliases; right cathode bar | diode type=zener; anode→cathode |
| leD | emptylediode/fulllediode, LED arrows and generated leD aliases; same diode cathode convention | diode type=led; anode→cathode |
| nos, ospst | Named SPST shapes, normally open | switch type=spst; in→out |
| ncs, cspst | Named SPST shapes, normally closed | `unsupported` until core draws a closed contact (#2 §4) |
| node[ground]{} | ground in pgfcircmonopoles.tex has three horizontal earth bars | ground style=earth, one in terminal |

Invert in pgfcircpath.tex sets an inverted flag and a negative xscale. It is idempotent. Four
orientations and both inversion states are tested for every family; fixbatteries combinations are
pinned for both added batteries. Existing battery1 behavior is unchanged.

Ground has a unary graph incidence rather than a synthetic two-terminal component edge. Its
terminal shares the current exact vertex, contributes one degree, receives one net membership and
counts against the same component ceiling before graph construction. Rendering places its center at
the normalized vertex; core routes to its fixed local in-port offset, just as passive port offsets
need not coincide with original TikZ segment endpoints. The contract guarantees topology, not pixels.

Ground and a mandatory junction at the same point overlap as fixed-size core bodies. That input is
rejected with geometry diagnostics rather than dropping a required junction, inventing an offset or
changing the fixed fence. Put the ground at the end of a short wire from the junction; the supplied
ground-branch fixture demonstrates the same net with representable geometry.

## Presentation and compatibility

The finite pole list is taken directly from pgfcircpath.tex's bipole/nodes styles, including o/*/d
circles/diamonds and rectjoinfill dot endpoints. These only change endpoint artwork and produce
warnings; no arbitrary style name is accepted. The contract already includes “other pole shapes”;
no new executable/style expansion facility is introduced.

The required diode color `#rose` is a custom alias in core 1.1, not one of its six built-in tokens.
The converter preserves and verifies that alias; a host should define its rose CSS color variable.
Core up to 1.3.0 drew the battery's long plate on the `negative` side, a core bug confirmed in
schemd/circuitikz#2 §3 and fixed in core 1.3.1 (schemd/core#11). No terminal was exchanged to disguise
it, so with core 1.3.1 `battery`, `battery2` and `battery1` draw their plates as CircuiTikZ does,
with and without `invert`. `ncs`/`cspst` are rejected
with one `unsupported` diagnostic, because core has no closed contact and an open drawing would
misstate the circuit (#2 §4); they return once core draws a closed switch.

## Quality evidence

Added conformance expectations use independent declaration/endpoint templates, not text copied from
conversion; the complete emitted documents were compared and inspected. They cover each alias,
all four directions with invert for battery/battery2/standard/Zener/LED, fixed-battery combinations,
unary ground and a ground branch. Both original M0 documents remain unchanged. Rejection arrays
were read in full, including exact messages and UTF-16 positions.

Independent verifier corruption tests include diode and ground variants. New mutants protect every
family, diode polarity, ground style/incidence/coordinates/limits, parser recovery, emitted ground
style and sub-token UTF-16 diagnostic positions. Fuzz generates actual successful M3 circuits and
checks all active resource boundaries, including junction and ground-declaration limits.

M4 publication, website documentation and real-browser engine integration are not part of this PR.
No merge, main change, package publication, core modification or release tag is performed.
