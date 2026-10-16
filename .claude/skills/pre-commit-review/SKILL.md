---
name: pre-commit-review
description: Review staged changes against this project's design and quality standards before committing. Use before every commit, or when asked to review code quality, repetition, consistency, OOP/functional design or tests.
---

# Pre-commit review

Checks the things linters cannot: design, repetition, consistency and test quality. Formatting and
lint rules are already enforced by the Git hooks, so do not spend time on them.

The checklist maps to the project's quality goals. The conventions themselves live in
`AGENTS.md`; this skill is the procedure to verify them.

## Procedure

1. Run `git diff --staged` (or `git diff` if nothing is staged) and read every changed file in full,
   not only the diff hunks.
2. Go through the checklist below. For each problem, note `file:line`, the rule it breaks and a
   concrete fix.
3. Run `npm run lint` and `npm test`; both must pass.
4. Report findings ordered by severity. If there are none, say so explicitly.
5. Propose a Conventional Commit message for the change.

Do not commit if any **blocking** item fails. Fix it first or ask the user.

## Checklist

### Correctness (blocking)

- [ ] Behaviour matches the business rules and assumptions documented in the README and specified by
      the tests. If a rule changes, README and tests change in the same commit.
- [ ] Edge cases of the changed code are handled (empty input, missing or malformed data).
- [ ] Errors at boundaries are thrown or mapped to meaningful responses, never swallowed.

### Tests (blocking)

- [ ] Every new or changed behaviour has tests in the same commit.
- [ ] Tests do not touch the network or the real clock.
- [ ] Boundary values and ties are tested.
- [ ] Every new documented assumption has a test that proves it.
- [ ] Repetitive cases use `test.each`; test names describe behaviour.

### Repetition

- [ ] No duplicated logic: two similar blocks should become one function or one data entry.
- [ ] New filters or variants are added as data, not as copy-pasted functions.
- [ ] Constants (URL, entry limit, TTL) are defined once.

### Functional / OOP design

- [ ] Domain code is pure: no I/O, no hidden state, no mutation of inputs.
- [ ] Classes exist only where there are dependencies or state; collaborators are injected through
      the constructor.
- [ ] Each module has one responsibility; dependencies point inwards (`http -> service -> domain`).
- [ ] Boundaries depend on interfaces (`UsageRepository`), not concrete classes.

### Consistency and TypeScript semantics

- [ ] Naming, file layout and patterns match the existing code.
- [ ] No `any`, no unnecessary type assertions (`as`), no non-null assertions (`!`) without reason.
- [ ] `readonly` for data that must not change; `import type` for type-only imports.
- [ ] Idiomatic constructs: `async`/`await`, optional chaining, `??`, array methods over manual loops
      when clearer.

### Simplicity

- [ ] No dependency, abstraction or configuration without a concrete need.
- [ ] Any non-obvious decision is explained in a short _why_ comment or in the README.

### Commit

- [ ] The change is atomic: one purpose per commit.
- [ ] The message follows Conventional Commits and describes _why_ when it is not obvious.
