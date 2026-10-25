# Requirements traceability

Scope: M1 front end and gates. **Deferred** and **blocked** rows are not claims of implementation.
Tests refer to `tests/frontend.test.ts` unless another suite or script is named. Mutant names
are the exact names in `scripts/mutation.mjs`; “Existing ten” refers to its unchanged M0 topology rules.
The audit explains design decisions and the implementation sequence. All original R-* IDs are retained.

| Requirement | Status | Evidence | Mutant / qualification |
| --- | --- | --- | --- |
| R-1.1 | Deferred M2 | No successful conversion; graph/emitter/oracle integration pending | — |
| R-1.2 | Deferred M2 | No successful conversion; graph/emitter/oracle integration pending | — |
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
| R-2.5.3 | M1 partial | frontend and fuzz: at/over every active ceiling; junction ceiling deferred M2 | brace budget is checked before further scanning; statement budget is inclusive; path budget is inclusive; component budget is inclusive; the source limit is inclusive |
| R-3.1 | M1 | frontend public API; smoke built exports; rejection corpus; pending error per §10 | M1 never returns unsupported input as a success |
| R-3.2 | M1 | frontend public API; smoke built exports; rejection corpus; pending error per §10 | M1 never returns unsupported input as a success |
| R-3.3 | Deferred M2 | No successful conversion; graph/emitter/oracle integration pending | — |
| R-3.4 | M1 | frontend: stable phase/position sorting, recovery and independent missing names | diagnostics sort by line then column; independent errors are retained |
| R-3.5 | Deferred M2 | No successful conversion; graph/emitter/oracle integration pending | — |
| R-3.6 | M1 | frontend: every option type/range, unknown symbol/non-enumerable keys | unknown host options throw; strict option types are checked; title budget is inclusive |
| R-3.7 | Preserved M0 | topology and conformance suites; open-terminal conflict reproduced without modifying helper | Existing ten topology mutants |
| R-3.8 | M1 | README API table, existing type docs, convert doc comment, CHANGELOG | — |
| R-4.1.1 | M1 | frontend: one environment, surrounding comments, trailing environment; rejections | recovery stops at the environment end |
| R-4.1.2 | M1 partial | frontend: explicit environment presentation keys; fixbatteries retained; polarity deferred | strict escalates presentation warnings |
| R-4.1.3 | M1 | frontend scanner: comments, escaped percent and unterminated comment | comments end at CR as well as LF; escaped percent does not begin a comment |
| R-4.1.4 | M1 | frontend scanner exact token arrays, Unicode/tab and line endings | columns count UTF-16 units; CRLF is one newline |
| R-4.2.1 | M1 | frontend AST and missing delimiters; rejection fixtures for each parser message | statement budget is inclusive |
| R-4.2.2 | M1 | frontend unsupported/nested statements; unknown-statement rejection | independent errors are retained |
| R-4.2.3 | M1 | frontend: multiple statement problems; recovery rejection including semicolon in braces; missing-semicolon-recovery resynchronises at the next statement | recovery ignores semicolons in braces; recovery stops at the environment end; recovery stops at the next statement command |
| R-4.3.1 | M1 | frontend exact coordinates, names, cycle, numeric forms and overflow; rejection corpus | coordinate precision is never rounded; fractional coordinate overflow is rejected; cycle closes the current subpath; cycle after to[...] is rejected |
| R-4.3.2 | M1 parse only | frontend AST operations; corner graph expansion deferred M2 | component option order and word boundaries survive |
| R-4.3.3 | M1 | frontend undefined/duplicate and independent missing names; corresponding rejections | duplicate names are diagnosed |
| R-4.3.4 | M1 | frontend: + versus ++, actual pen endpoints and reference state | plus leaves the relative reference unchanged; relative increments use their reference |
| R-4.4.1 | Deferred M2/M3 | Component options retained structurally; no semantic acceptance or emitted components | Source review in implementation-audit; semantic mutants required in implementing PR |
| R-4.4.2 | Deferred M2/M3 | Component options retained structurally; no semantic acceptance or emitted components | Source review in implementation-audit; semantic mutants required in implementing PR |
| R-4.4.3 | Deferred M2/M3 | Component options retained structurally; no semantic acceptance or emitted components | Source review in implementation-audit; semantic mutants required in implementing PR |
| R-4.4.4 | Deferred M2/M3 | Component options retained structurally; no semantic acceptance or emitted components | Source review in implementation-audit; semantic mutants required in implementing PR |
| R-4.5.1 | Deferred M2/M3 | Component options retained structurally; no semantic acceptance or emitted components | Source review in implementation-audit; semantic mutants required in implementing PR |
| R-4.5.2 | Deferred M2/M3 | Component options retained structurally; no semantic acceptance or emitted components | Source review in implementation-audit; semantic mutants required in implementing PR |
| R-4.5.3 | Deferred M2/M3 | Component options retained structurally; no semantic acceptance or emitted components | Source review in implementation-audit; semantic mutants required in implementing PR |
| R-4.5.4 | Deferred M2/M3 | Component options retained structurally; no semantic acceptance or emitted components | Source review in implementation-audit; semantic mutants required in implementing PR |
| R-5.1.1 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.1.2 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.1.3 | Blocked M2 design | topology: real core open-terminal discrepancy; decision A in audit | Expected singleton nets are not dropped or fabricated |
| R-5.1.4 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.1.5 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.1.6 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.1.7 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.2.1 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.2.2 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.2.3 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.3.1 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.3.2 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.3.3 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.3.4 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.3.5 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.3.6 | Deferred M2 | No graph/emitter yet; existing expected conformance documents preserved | — |
| R-5.4.1 | M1 partial | frontend: only enumerated pure presentation keys; full component semantics deferred | strict escalates presentation warnings |
| R-5.4.2 | M1 | frontend strict API; strict-presentation rejection | strict escalates presentation warnings |
| R-5.4.3 | Preserved | REQUIREMENTS unchanged; ambiguous keys proposed for review, not added | — |
| R-6.1 | Blocked M2 design | topology: real core open-terminal discrepancy; decision A in audit | Expected singleton nets are not dropped or fabricated |
| R-6.2 | Blocked M2 design | topology: real core open-terminal discrepancy; decision A in audit | Expected singleton nets are not dropped or fabricated |
| R-6.3 | Blocked M2 design | topology: real core open-terminal discrepancy; decision A in audit | Expected singleton nets are not dropped or fabricated |
| R-6.4 | Deferred M2 | No compile/oracle pipeline and no internal diagnostics in M1 | — |
| R-7.1.1 | M1 | diagnostics module; frontend complete expected objects; 37 rejection fixtures | multiline spans stay on the first line; columns count UTF-16 units |
| R-7.1.2 | M1 | diagnostics module; frontend complete expected objects; 37 rejection fixtures | multiline spans stay on the first line; columns count UTF-16 units |
| R-7.1.3 | M1 | diagnostics module; frontend complete expected objects; 37 rejection fixtures | multiline spans stay on the first line; columns count UTF-16 units |
| R-7.1.4 | M1 | diagnostics module; frontend complete expected objects; 37 rejection fixtures | multiline spans stay on the first line; columns count UTF-16 units |
| R-7.2.1 | Preserved | conformance suite; both original fixtures unchanged and first-pass routing retained | — |
| R-7.2.2 | Deferred M2/M3 | No successful converter result or new emitted fixture claimed | — |
| R-7.2.3 | M1 | rejections suite: 37 byte-checked diagnostic arrays and empty output | — |
| R-7.2.4 | Deferred M2/M3 | No successful converter result or new emitted fixture claimed | — |
| R-7.2.5 | Preserved | conformance suite; both original fixtures unchanged and first-pass routing retained | — |
| R-8.1.1 | Enforced | Vitest recursive include and 100% per-file thresholds on all axes | — |
| R-8.1.2 | Enforced | source-policy scans TS and MJS tests; no ignores/skipped/focused tests | — |
| R-8.1.3 | M1 evidence | Exact assertions in frontend, topology and rejection suites; mutation runs | — |
| R-8.1.4 | Enforced | source-policy scans TS and MJS tests; no ignores/skipped/focused tests | — |
| R-8.2.1 | Enforced | mutation inventory: each logic module covered, baseline first, structured failure reports | 44 named mutants; constants/types/re-exports alone exempt |
| R-8.2.2 | Enforced | mutation inventory: each logic module covered, baseline first, structured failure reports | 44 named mutants; constants/types/re-exports alone exempt |
| R-8.2.3 | M1 only | Each active ceiling and relative/reference/diagnostic/recovery rule has a mutant | Remaining graph/emitter/polarity rules deferred with M2/M3 |
| R-8.3.1 | M1 | scripts/fuzz.mjs: seed, characters, tokens, mutated corpus and boundaries | — |
| R-8.3.2 | M1 | Fuzz result/shape/span/order/partial-output/determinism checks in timed worker | No success-path topology claim in diagnostics-only milestone |
| R-8.3.3 | M1 | CI 20000 cases; fuzz-infrastructure tests force throws/hangs and check minimized artifact | — |
| R-8.3.4 | M1 | frontend pathological-input test under 2000 ms; fuzz includes large accepted comment | — |
| R-8.4.1 | Deferred M2/M3 | Requires independently built graph and successful output; no vacuous property tests added | — |
| R-8.4.2 | Deferred M2/M3 | Requires independently built graph and successful output; no vacuous property tests added | — |
| R-8.4.3 | Deferred M2/M3 | Requires independently built graph and successful output; no vacuous property tests added | — |
| R-8.4.4 | Deferred M2/M3 | Requires independently built graph and successful output; no vacuous property tests added | — |
| R-8.5.1 | M1 | Measured M0→M1 size; documented 5 KiB gzip/brotli gates in size script | — |
| R-8.5.2 | M1 | Measured M0→M1 size; documented 5 KiB gzip/brotli gates in size script | — |
| R-8.5.3 | Below ceiling; not release-ready | M1 below 12 KiB gzip; no claim about future M2/M3 size | — |
| R-8.6.1 | Enforced | packaging recursive inventory, disjoint classifications, exports; smoke JS/d.ts existence | — |
| R-8.6.2 | M1 | CI npm pack dry-run; Node 24 built converter/oracle smoke; successful conversion deferred M2 | — |
| R-9.1 | Review required | Work on feature branch and PR to user fork; no main changes or merges | — |
| R-9.2 | Review required | Work on feature branch and PR to user fork; no main changes or merges | — |
| R-9.3 | Design blocked as required | Audit records proposals; no implementation depends on changing the contract | — |
| R-9.4 | M1 | CHANGELOG observable M1 behavior and infrastructure changes | — |
| R-9.5 | M1 | Lower-case present-tense commit messages | — |
| R-9.6 | Preserved | No version changes, tags, publication or deployment | — |
