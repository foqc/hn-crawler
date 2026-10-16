# hn-crawler

Web crawler that scrapes the first 30 entries from [Hacker News](https://news.ycombinator.com/)
and exposes filters over them, storing usage data for every request.

> Work in progress — full documentation and design decisions will be added as the project evolves.

## Requirements & assumptions

For each of the first 30 entries the crawler extracts **rank, title, points and number of comments**.

| Filter         | Keeps titles with | Ordered by |
| -------------- | ----------------- | ---------- |
| `long-titles`  | more than 5 words | comments   |
| `short-titles` | 5 words or fewer  | points     |

**Word count**: the title is split on whitespace and only tokens containing at least one letter or
digit are counted, so standalone symbols are excluded. `"This is - a self-explained example"` has
5 words (`-` is ignored; `self-explained` is one word).

**Usage data**: every request stores at least its timestamp and the applied filter.

Assumptions where the statement is not explicit (each one is covered by tests):

- Ordering is **descending**; ties are broken by rank ascending (original page order).
- Entries without points or comments (job posts, `discuss`) count as `0`.
- Tokens such as `(2026)` count as words because they contain alphanumeric characters.

## Prerequisites

- Node.js >= 22.13 (see `.nvmrc`)

## Getting started

```bash
npm install
npm test        # run the test suite
npm start       # build and start the API on http://127.0.0.1:3000
```

Node prints an `ExperimentalWarning` for SQLite on startup: `node:sqlite` is still flagged
experimental in Node 22, and the warning is expected.

### Endpoints

| Method | Path                           | Description                                        |
| ------ | ------------------------------ | -------------------------------------------------- |
| GET    | `/entries`                     | The first 30 entries, in page order                |
| GET    | `/entries?filter=long-titles`  | Titles with more than 5 words, ordered by comments |
| GET    | `/entries?filter=short-titles` | Titles with 5 words or fewer, ordered by points    |
| GET    | `/usage?limit=50`              | Usage log, most recent first (`limit` 1–500)       |

```bash
curl 'http://127.0.0.1:3000/entries?filter=long-titles'
curl 'http://127.0.0.1:3000/usage?limit=5'
```

An unknown filter returns `400`; if Hacker News cannot be reached the API returns `502`.

### Configuration

| Variable        | Default     | Description                                     |
| --------------- | ----------- | ----------------------------------------------- |
| `PORT`          | `3000`      | HTTP port                                       |
| `HOST`          | `127.0.0.1` | Interface to bind                               |
| `CACHE_TTL_MS`  | `60000`     | How long scraped entries are reused (0 = never) |
| `DATABASE_PATH` | `usage.db`  | SQLite file for the usage log                   |

## Design decisions

### Usage is tracked in the service, not in an HTTP middleware

`EntriesService.getEntries` records one usage row per call, whether it succeeds or fails.

- **Why the service:** storing usage is a business requirement, so it must hold for every
  entrypoint (the API today, a CLI later), and a CLI never goes through Fastify's hooks. The
  most useful fields describe the crawler's behaviour — cache hit, result count, source errors —
  and only the service knows them.
- **Trade-off:** requests rejected by validation (`400`, e.g. an unknown filter) are not recorded,
  because Fastify rejects them before the service runs. HTTP-level data (IP, user agent, status
  code) is not recorded either.
- **Possible extension:** a lightweight Fastify `onResponse` hook could log that HTTP-level
  information as a complement — user interaction at the edge, crawler behaviour in the service.

### Cache-aside with an in-memory TTL

The service asks the cache first; on a miss it scrapes Hacker News and stores the result for
`CACHE_TTL_MS`. The `Cache` interface is just `get()` / `set(value)`, so swapping the in-memory
`TtlCache` for Redis (`GET` / `SET ... EX`) means one new class and one line in `container.ts`.

- **Trade-off:** concurrent requests that miss at the same moment each scrape once (no cache
  stampede protection). With one front page and a short TTL, that costs a few extra requests at
  worst, and explicit code was preferred.
- In-memory means the cache is per process and is lost on restart; failed scrapes are never
  cached.

## Testing

Tests never hit the network. The parser runs against
[`tests/fixtures/hn-front-page.html`](tests/fixtures/hn-front-page.html), a snapshot of the Hacker
News front page captured on 2026-10-16; edge cases the snapshot lacks are covered with small inline
HTML samples.

## Development workflow

- `npm run lint` / `npm run format` — ESLint and Prettier.
- Git hooks (installed automatically by `npm install` through Husky):
  - `pre-commit`: formats and lints staged files (lint-staged).
  - `commit-msg`: enforces [Conventional Commits](https://www.conventionalcommits.org/) (commitlint).
  - `pre-push`: runs lint and the full test suite.
- [`AGENTS.md`](AGENTS.md) documents conventions for AI coding agents and humans alike (Claude Code
  reads it natively). The [`pre-commit-review`](.claude/skills/pre-commit-review/SKILL.md) skill is
  the checklist used to review each change before committing.
