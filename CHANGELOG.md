# Changelog

Written for someone deciding whether to upgrade. Sections: `Fixed`, `Added`, `Removed`, `Changed`,
`Verified`, `Performance`, `Documented`. Dates are npm publication dates; unpublished versions say
`Unreleased`.

## [0.0.0] - Unreleased

### Added

- The diagnostics-only M1 `convertCircuitikz` entry point: a bounded scanner and span-aware parser,
  exact integer coordinates, relative and named references, resource ceilings, validated host options,
  stable actionable diagnostics and strict presentation warnings. It does not emit Schemd yet;
  otherwise accepted input receives the milestone's pending-conversion error.
- 37 complete rejection fixtures, front-end unit tests and pathological input checks.
- Reproducible fuzzing of at least 20,000 cases in CI, including valid options and limit boundaries;
  worker deadlines, failure minimization and retained artifacts. Infrastructure tests detect an
  intentionally throwing or hung converter.
- Built-package smoke checks for public exports, every JS/declaration module, and a browser-target
  bundle executed without Node or DOM globals.
- An implementation audit, source-cited semantic findings, M2 design questions and complete R-*
  traceability. Open-terminal oracle behavior is reproduced without changing the public contract.

### Changed

- `cycle` closes the current subpath (to the last move-to), as TikZ does, rather than the first point
  of the whole statement. `cycle` after a `to[...]` in the same subpath is `unsupported`, because
  CircuiTikZ closes it inside that component's drawing rather than to a circuit point.
- A statement that ends at the next `\draw` or `\coordinate` (a missing `;`) no longer swallows that
  statement during recovery, so its own problems are reported in the same run (R-4.2.3).
- Empty option entries (`[]`, `[R,]`, `[,thick]`) are ignored, as pgfkeys does, instead of being a
  `syntax` error. The `empty-option` rejection fixture is replaced by `missing-semicolon-recovery`.
- Pin Bun 1.4.4 for local and CI installation.

- Coverage now enforces the existing 100% requirement per file as well as recursively including src.
- Packaging classifies nested modules; source policy also checks TypeScript syntax tokens and MJS
  tests. CI selects Bun from the existing packageManager pin; the lockfile and dependencies are unchanged.
- Mutation runs require a passing baseline and recorded test failures; setup/load failures and
  timeouts fail the gate instead of receiving mutation credit. M1 adds 34 meaningful mutants.
- The size gate grows from the scaffold-only 1 KiB to 5 KiB on gzip and brotli, with measured changes
  documented in the size script; the 12 KiB release ceiling remains unchanged.

### Added (M0 scaffold)

- The contract, `REQUIREMENTS.md`, and the public types in `src/types.ts`.
- The topology oracle: `connectivityOf`, `connectivityDifference` and `canonical` compare a schemd
  netlist with the connectivity a CircuiTikZ circuit describes, with junctions left out.
- The conformance corpus. It has two cases: the series circuit from
  [schemd/core#7](https://github.com/schemd/core/issues/7), and a divider with two junctions. Each
  expected document is checked against `@schemd/core` 1.1: no diagnostics, routed on the first pass,
  and wired as the TeX describes.

### Verified (M0 baseline)

- 100% coverage on all four axes, 10 of 10 mutants killed, a source-policy test, a packaging test,
  and a 1 KiB size budget.
