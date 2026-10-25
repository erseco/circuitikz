## What this changes

<!-- One concern. What a user of the package can now observe. -->

## Requirements satisfied

<!-- One row per R- ID from REQUIREMENTS.md. Every row names a test, and a mutant where the rule is load-bearing. -->

| Requirement | Test | Mutant |
| --- | --- | --- |
| R- | | |

## Deliberately not changed

<!-- Usually the most informative part. -->

## Size

<!-- `bun run size` before → after. If a budget moved, the comment in scripts/check-bundle-size.mjs says what paid for it. -->

## Checklist

- [ ] `bun run release:check` passes locally
- [ ] Coverage is 100% without ignore comments, and every new test asserts behaviour, not just execution
- [ ] Every new module has at least one mutant, and every mutant is killed
- [ ] Every new diagnostic has a test asserting its full message and span, plus a rejection fixture
- [ ] Every new or changed `expected.schemd` was read line by line
- [ ] A new component row cites the CircuiTikZ source file and shape that fix its terminal order
- [ ] `CHANGELOG.md` has an entry if behaviour changed
- [ ] A design question this depends on was settled in an issue: #
