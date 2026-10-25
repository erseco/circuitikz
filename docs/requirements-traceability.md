# Requirements traceability

Scope: M3 component completion stacked on M2 and M1. See m2-design.md for the concrete fork design proposals. **Deferred** and **blocked** rows are not claims of implementation.
Tests refer to `tests/frontend.test.ts` unless another suite or script is named. Mutant names
are the exact names in `scripts/mutation.mjs`; “Existing ten” refers to its unchanged M0 topology rules.
The audit explains design decisions and the implementation sequence. All original R-* IDs are retained.

| Requirement | Status | Evidence | Mutant / qualification |
| --- | --- | --- | --- |
| R-1.1 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-1.2 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-1.3 | M1 partial | frontend parser/API and rejection corpus; component semantics deferred | independent errors are retained |
| R-2.1.1 | Preserved | packaging: dependency contract; manifest/lockfile unchanged | No dependency added |
| R-2.1.2 | Enforced | source-policy: regex and syntax-token checks; smoke: browser-target VM | Policy has positive violation samples |
| R-2.1.3 | Preserved | packaging: dependency contract; manifest/lockfile unchanged | No dependency added |
| R-2.2.1 | M1 | frontend: repeatability and independent calls; fuzz: two calls per case | M1 never returns unsupported input as a success |
| R-2.2.2 | Enforced | source-policy: regex and syntax-token checks; smoke: browser-target VM | Policy has positive violation samples |
| R-2.3.1 | M1 | frontend: repeatability and independent calls; fuzz: two calls per case | M1 never returns unsupported input as a success |
| R-2.3.2 | Enforced | source-policy: regex and syntax-token checks; smoke: browser-target VM | Policy has positive violation samples |
| R-2.3.3 | M1 | frontend: stable phase/position sorting, recovery and independent missing names | diagnostics sort by line then column; independent errors are retained |
| R-2.3.4 | M1 | frontend: exact decimals, negative zero, precision, overflow; no emission yet | coordinate digits are accumulated in base ten; negative zero is normalized; fractional coordinate overflow is rejected |
| R-2.4.1 | Enforced | bun run check; original strict compiler configuration preserved | — |
| R-2.4.2 | Enforced | source-policy: regex and syntax-token checks; smoke: browser-target VM | Policy has positive violation samples |
| R-2.4.3 | Enforced | source-policy: regex and syntax-token checks; smoke: browser-target VM | Policy has positive violation samples |
| R-2.5.1 | M1 | frontend: host errors and pathological input; fuzz: valid options, no throws, timed worker | strict option types are checked; the source limit is inclusive |
| R-2.5.2 | M1 evidence | Bounded scanner/parser loop inspection; frontend pathological inputs; timed fuzz | recovery stops at the environment end |
| R-2.5.3 | M2 | All active graph/front-end ceilings have boundary tests and mutants, including junctions | conversion/conformance/graph/verification tests and 86-mutant gate |
| R-3.1 | M1 | frontend public API; smoke built exports; rejection corpus; pending error per §10 | M1 never returns unsupported input as a success |
| R-3.2 | M1 | frontend public API; smoke built exports; rejection corpus; pending error per §10 | M1 never returns unsupported input as a success |
| R-3.3 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-3.4 | M1 | frontend: stable phase/position sorting, recovery and independent missing names | diagnostics sort by line then column; independent errors are retained |
| R-3.5 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-3.6 | M1 | frontend: every option type/range, unknown symbol/non-enumerable keys | unknown host options throw; strict option types are checked; title budget is inclusive |
| R-3.7 | Preserved M0 | topology and conformance suites; open-terminal conflict reproduced without modifying helper | Existing ten topology mutants |
| R-3.8 | M1 | README API table, existing type docs, convert doc comment, CHANGELOG | — |
| R-4.1.1 | M1 | frontend: one environment, surrounding comments, trailing environment; rejections | recovery stops at the environment end |
| R-4.1.2 | M2 | Environment presentation and fixbatteries honored in conversion | conversion/conformance/graph/verification tests and 86-mutant gate |
| R-4.1.3 | M1 | frontend scanner: comments, escaped percent and unterminated comment | comments end at CR as well as LF; escaped percent does not begin a comment |
| R-4.1.4 | M1 | frontend scanner exact token arrays, Unicode/tab and line endings | columns count UTF-16 units; CRLF is one newline |
| R-4.2.1 | M1 | frontend AST and missing delimiters; rejection fixtures for each parser message | statement budget is inclusive |
| R-4.2.2 | M1 | frontend unsupported/nested statements; unknown-statement rejection | independent errors are retained |
| R-4.2.3 | M1 | frontend: multiple statement problems; recovery rejection including semicolon in braces; missing-semicolon-recovery resynchronises at the next statement | recovery ignores semicolons in braces; recovery stops at the environment end; recovery stops at the next statement command |
| R-4.3.1 | M1 | frontend exact coordinates, names, cycle, numeric forms and overflow; rejection corpus | coordinate precision is never rounded; fractional coordinate overflow is rejected; cycle closes the current subpath |
| R-4.3.2 | M2 | All supported operations expand into exact graph segments | conversion/conformance/graph/verification tests and 86-mutant gate |
| R-4.3.3 | M1 | frontend undefined/duplicate and independent missing names; corresponding rejections | duplicate names are diagnosed |
| R-4.3.4 | M1 | frontend: + versus ++, actual pen endpoints and reference state | plus leaves the relative reference unchanged; relative increments use their reference |
| R-4.4.1 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-4.4.2 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-4.4.3 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-4.4.4 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-4.5.1 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-4.5.2 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-4.5.3 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-4.5.4 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-5.1.1 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.1.2 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.1.3 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.1.4 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.1.5 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.1.6 | M2 | conversion dead-end tests; wire-orphan and wire-dead-end rejections | dead-end wires are rejected; dead-end wires are rejected only at single edge ends |
| R-5.1.7 | M2 | conversion T-junction test; segments-overlap and t-junction rejections | positive-length overlaps are rejected; an endpoint inside another segment is a geometry error; overlaps suppress duplicate interior diagnostics |
| R-5.2.1 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.2.2 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.2.3 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.3.1 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.3.2 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.3.3 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.3.4 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.3.5 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.3.6 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-5.4.1 | M2 | Explicit presentation keys, including component annotations, retain warnings and labels | conversion/conformance/graph/verification tests and 86-mutant gate |
| R-5.4.2 | M1 | frontend strict API; strict-presentation rejection | strict escalates presentation warnings |
| R-5.4.3 | Preserved | REQUIREMENTS unchanged; ambiguous keys proposed for review, not added | — |
| R-6.1 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-6.2 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-6.3 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-6.4 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-7.1.1 | M1 | diagnostics module; frontend complete expected objects; 36 rejection fixtures | multiline spans stay on the first line; columns count UTF-16 units |
| R-7.1.2 | M1 | diagnostics module; frontend complete expected objects; 36 rejection fixtures | multiline spans stay on the first line; columns count UTF-16 units |
| R-7.1.3 | M1 | diagnostics module; frontend complete expected objects; 36 rejection fixtures | multiline spans stay on the first line; columns count UTF-16 units |
| R-7.1.4 | M1 | diagnostics module; frontend complete expected objects; 36 rejection fixtures | multiline spans stay on the first line; columns count UTF-16 units |
| R-7.2.1 | Preserved | conformance suite; both original fixtures unchanged and first-pass routing retained | — |
| R-7.2.2 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-7.2.3 | M1 | rejections suite: 36 byte-checked diagnostic arrays and empty output | — |
| R-7.2.4 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-7.2.5 | Preserved | conformance suite; both original fixtures unchanged and first-pass routing retained | — |
| R-8.1.1 | Enforced | Vitest recursive include and 100% per-file thresholds on all axes | — |
| R-8.1.2 | Enforced | source-policy scans TS and MJS tests; no ignores/skipped/focused tests | — |
| R-8.1.3 | M1 evidence | Exact assertions in frontend, topology and rejection suites; mutation runs | — |
| R-8.1.4 | Enforced | source-policy scans TS and MJS tests; no ignores/skipped/focused tests | — |
| R-8.2.1 | Enforced | mutation inventory: each logic module covered, baseline first, structured failure reports | 86 named mutants; constants/types/re-exports alone exempt |
| R-8.2.2 | Enforced | mutation inventory: each logic module covered, baseline first, structured failure reports | 86 named mutants; constants/types/re-exports alone exempt |
| R-8.2.3 | M2 | M2 load-bearing graph, emission, polarity, geometry and oracle rules have killed mutants | conversion/conformance/graph/verification tests and 86-mutant gate |
| R-8.3.1 | M1 | scripts/fuzz.mjs: seed, characters, tokens, mutated corpus and boundaries | — |
| R-8.3.2 | M2 | Successful and failed result contracts are fuzzed; graph oracle runs before every ok result | conversion/conformance/graph/verification tests and 86-mutant gate |
| R-8.3.3 | M1 | CI 20000 cases; fuzz-infrastructure tests force throws/hangs and check minimized artifact | — |
| R-8.3.4 | M1 | frontend pathological-input test under 2000 ms; fuzz includes large accepted comment | — |
| R-8.4.1 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-8.4.2 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-8.4.3 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-8.4.4 | M2–M3 | conversion, m3 family/ground, verification and conformance suites | kind, alias, polarity, invert, label, ground and verification mutants |
| R-8.5.1 | M1 | Measured M0→M1 size; documented 5 KiB gzip/brotli gates in size script | — |
| R-8.5.2 | M1 | Measured M0→M1 size; documented 5 KiB gzip/brotli gates in size script | — |
| R-8.5.3 | Below ceiling; not release-ready | M1 below 12 KiB gzip; no claim about future M2/M3 size | — |
| R-8.6.1 | Enforced | packaging recursive inventory, disjoint classifications, exports; smoke JS/d.ts existence | — |
| R-8.6.2 | M2 | conversion, conformance, graph, verification and property suites; built smoke | graph/emitter/oracle mutants; M3 family tests and source-cited fixtures included |
| R-9.1 | Review required | Work on feature branch and PR to user fork; no main changes or merges | — |
| R-9.2 | Review required | Work on feature branch and PR to user fork; no main changes or merges | — |
| R-9.3 | Draft review required | Explicit user request to implement stacked fork PRs; m2-design.md records proposals | Upstream agreement is not claimed |
| R-9.4 | M1 | CHANGELOG observable M1 behavior and infrastructure changes | — |
| R-9.5 | M1 | Lower-case present-tense commit messages | — |
| R-9.6 | Preserved | No version changes, tags, publication or deployment | — |
