# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

## Project

A Hacker News crawler written as a coding exercise: it scrapes the front page, exposes filters
through an HTTP API and stores usage data for every request.

Business rules and documented assumptions live in the README
([Requirements & assumptions](README.md#requirements--assumptions)) and are specified by the tests.
They are the single source of truth: never change one without updating the other.

## Stack

Node.js >= 22.13 · TypeScript 6 (strict) · Fastify · cheerio · `node:sqlite` · Jest + ts-jest ·
ESLint + Prettier · Husky + lint-staged + commitlint.

Do not upgrade TypeScript to 7: ts-jest and typescript-eslint do not support it yet.

## Commands

```bash
npm test           # run all tests
npm run lint       # ESLint (type-aware)
npm run format     # Prettier
```

## Architecture

```
src/
  domain/    pure types and functions: Entry, countWords, filters
  scraper/   HTML parsing (cheerio) and fetching
  cache/     in-memory TTL cache
  usage/     UsageRepository interface + SQLite implementation
  service/   EntriesService: orchestrates cache, scraping, filtering and usage logging
  http/      Fastify app (routes + schemas) and server entrypoint
tests/       mirrors src/; fixtures live in tests/fixtures/
```

Dependencies point inwards: `http -> service -> (scraper, cache, usage) -> domain`. The domain never
imports from outer layers.

## Coding conventions

- **Functional core, object-oriented shell**: domain logic is pure functions over immutable data.
  Use classes only for components with dependencies or state (scraper, cache, repository, service).
- **Dependency injection by constructor**: classes receive collaborators (`fetch`, clock, repository)
  as parameters; nothing is instantiated inside business logic. Wiring happens only in the server
  entrypoint.
- **Program to interfaces** at the boundaries (`UsageRepository`), not to concrete implementations.
- **No repetition**: filters are data (`{ predicate, sortBy }`) in a single map, applied by one
  generic function. Adding a filter must be a one-line change.
- **Immutability**: never mutate inputs (copy before `sort`); prefer `readonly` properties and arrays.
- **Types**: no `any` (use `unknown` and narrow); explicit return types on exported functions;
  `import type` for type-only imports; derive types from constants instead of duplicating them.
- **Naming**: descriptive, intention-revealing names; files in camelCase, classes in PascalCase.
- **Errors**: throw meaningful errors at the boundaries (non-2xx responses, invalid input); never
  swallow them silently.
- **Comments** explain _why_, not _what_. Keep them short.
- **Keep it simple**: no new dependency or abstraction without a concrete reason; document the reason
  in the README's design decisions section.

## Testing conventions

- Every behaviour change ships with its tests in the same commit.
- Tests never hit the network: use the HTML fixture, injected `fetch`, injected clock and SQLite
  `:memory:`.
- Prefer `test.each` tables for input/output cases.
- Each documented assumption has at least one test that proves it.
- Test names describe behaviour: `it('orders by comments descending')`.

## Git workflow

- Small, atomic commits; every commit builds, lints and passes the tests.
- Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`), enforced by
  commitlint. Subject in imperative mood; body explains _why_ when it is not obvious.
- Hooks: `pre-commit` formats and lints staged files, `commit-msg` validates the message,
  `pre-push` runs lint and tests. Never bypass them with `--no-verify`.
- Before committing, run the `pre-commit-review` skill (`.claude/skills/pre-commit-review`).
