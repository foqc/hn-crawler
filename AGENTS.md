# AGENTS.md

Hacker News crawler (coding exercise): scrapes the front page, exposes filters through a Fastify API
and logs usage to SQLite. Business rules and assumptions live in the
[README](README.md#requirements--assumptions) and are specified by the tests — change both together.

Node >= 22.13 (`node:sqlite`). `npm test` and `npm run lint` must pass; Husky enforces formatting,
lint and Conventional Commits, so never use `--no-verify`. Keep TypeScript on 6.x: ts-jest and
typescript-eslint don't support 7 yet.

## Architecture

```
src/
  domain/          business concepts and rules: pure types and functions
  application/     use cases (EntriesService) and the ports they need (ports.ts)
  infrastructure/  port implementations: scraper/, cache/, sqlite/
  http/            Fastify app (routes + schemas)
  config.ts        environment configuration
  server.ts        composition root: the only place that instantiates and wires implementations
tests/             mirrors src/; fixtures in tests/fixtures/
```

Dependencies point inwards: `http` and `infrastructure` -> `application` -> `domain`. Layers are a
guide, not dogma: no interface or abstraction without a concrete use.

## Design choices

- Functional core, OO shell: the domain is pure functions over readonly data; classes only for
  components with dependencies or state, injected through the constructor and wired in the server
  entrypoint only.
- Filters are data (`{ predicate, sortBy }`) applied by one generic function — a new filter is one line.
- Tests never hit the network: HTML fixture, injected `fetch` and clock, SQLite `:memory:`. Each
  behaviour change ships with its tests.

## Workflow

Commits are atomic and green, e.g. `feat(domain): add word counting`. Run the `pre-commit-review`
skill before committing.

Everything written is English (code, comments, docs, commits); you may be spoken to in Spanish.
