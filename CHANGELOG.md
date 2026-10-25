# Changelog

Written for someone deciding whether to upgrade. Sections: `Fixed`, `Added`, `Removed`, `Changed`,
`Verified`, `Performance`, `Documented`. Dates are npm publication dates; unpublished versions say
`Unreleased`.

## [0.0.0] - Unreleased

### Added

- The contract, `REQUIREMENTS.md`, and the public types in `src/types.ts`.
- The topology oracle: `connectivityOf`, `connectivityDifference` and `canonical` compare a schemd
  netlist with the connectivity a CircuiTikZ circuit describes, with junctions left out.
- The conformance corpus. It has two cases: the series circuit from
  [schemd/core#7](https://github.com/schemd/core/issues/7), and a divider with two junctions. Each
  expected document is checked against `@schemd/core` 1.1: no diagnostics, routed on the first pass,
  and wired as the TeX describes.

### Verified

- 100% coverage on all four axes, 10 of 10 mutants killed, a source-policy test, a packaging test,
  and a 1 KiB size budget.
