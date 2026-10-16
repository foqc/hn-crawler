# hn-crawler

Web crawler that scrapes the first 30 entries from [Hacker News](https://news.ycombinator.com/)
and exposes filters over them, recording how each request to the crawler went.

## Requirements & assumptions

For each of the first 30 entries the crawler extracts **rank, title, points and number of comments**.

| Filter         | Keeps titles with | Ordered by |
| -------------- | ----------------- | ---------- |
| `long-titles`  | more than 5 words | comments   |
| `short-titles` | 5 words or fewer  | points     |

**Word count**: the title is split on whitespace and only tokens containing at least one letter or
digit are counted, so standalone symbols are excluded. `"This is - a self-explained example"` has
5 words (`-` is ignored; `self-explained` is one word).

**Usage data**: each request that reaches the crawler (API or CLI) stores at least its timestamp
and the applied filter, plus status, result count, duration, cache hit and error message. See
[Limitations](#limitations) for what is not recorded.

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

Example response (`GET /entries?filter=short-titles`, truncated):

```json
{
  "filter": "short-titles",
  "count": 11,
  "entries": [
    { "rank": 1, "title": "Tesla Roadster", "points": 909, "comments": 1636 },
    { "rank": 2, "title": "Claude reveals ECDSA curve origins", "points": 415, "comments": 173 }
  ]
}
```

An unknown filter returns `400`. If Hacker News cannot be reached, answers with an error, or
returns a page that cannot be parsed (e.g. after a layout change), the API returns `502`.

### CLI (optional extra)

Not part of the requirements: it demonstrates that the use cases are independent of HTTP. It runs
the same services with the same configuration and usage database as the API:

```bash
npm run -s cli -- entries                        # the first 30 entries
npm run -s cli -- entries --filter long-titles   # filtered and ordered
npm run -s cli -- usage --limit 10               # usage log, most recent first
npm run -s cli -- help
```

Exit codes: `0` success, `1` the command failed (e.g. Hacker News unreachable), `2` invalid
arguments. Every run is a new process, so the in-memory cache never carries over between runs.

### Configuration

| Variable        | Default     | Description                                     |
| --------------- | ----------- | ----------------------------------------------- |
| `PORT`          | `3000`      | HTTP port                                       |
| `HOST`          | `127.0.0.1` | Interface to bind                               |
| `CACHE_TTL_MS`  | `60000`     | How long scraped entries are reused (0 = never) |
| `DATABASE_PATH` | `usage.db`  | SQLite file for the usage log                   |

## Architecture

A layered design: controller (routes) → service → repository, with the business rules in a pure
domain layer.

```
src/
  domain/          business rules as pure functions and types: entry, word count, filters, usage
  application/     services (EntriesService, UsageService) and the interfaces they need (ports.ts)
  infrastructure/  implementations of those interfaces: scraper/ (fetch + cheerio), cache/, sqlite/
  http/            Fastify app; routes/ has one plugin per resource (route + JSON schema)
  cli/             command line program: parses arguments and prints results
  container.ts     the only place where implementations are created and wired together
  server.ts        API entrypoint: config -> container -> Fastify, plus graceful shutdown
  cli.ts           CLI entrypoint: config -> container -> CLI program
```

A request to `GET /entries?filter=long-titles` flows like this:

```
routes/entries.ts -> EntriesService -> cache hit?  yes -> cached entries
                                                    no  -> HackerNewsScraper -> cache.set
                                    -> applyFilter (domain)
                                    -> UsageService.record -> SqliteUsageRepository
```

- **Dependencies point inwards:** `http` and `infrastructure` depend on `application`, which
  depends on `domain`. Services reach external systems (Hacker News, cache, database, clock)
  only through interfaces, so tests replace them with fakes, and a technology can be swapped
  (e.g. SQLite → PostgreSQL, memory → Redis) in `container.ts` alone.
- **Functional core, OO shell:** the domain is pure functions over readonly data; classes are used
  only for components with dependencies or state, injected through the constructor.
- **Errors:** the scraper raises `SourceUnavailableError` for any failure to get usable data
  (network, HTTP status, body download, unparseable page), which the HTTP layer maps to `502`
  without knowing about Hacker News. Failed scrapes are never cached.

## Design decisions

### Fastify instead of Express

- JSON Schema validation and serialization are built in: an unknown filter is rejected with `400`
  without extra libraries (Express would need e.g. zod or joi).
- `app.inject()` drives the API in tests without opening a port (Express would need supertest).
- First-class TypeScript types and async handlers whose errors reach one error handler.

### SQLite (`node:sqlite`) for usage data

- Built into Node: no extra dependency, no native compilation (unlike `better-sqlite3`) and no
  server to run (unlike PostgreSQL or Redis).
- Data survives restarts and can be queried with SQL, unlike a JSON file or an in-memory list.
- Trade-offs: the module is still flagged experimental in Node 22, and it is synchronous, which is
  negligible for one small insert per request. `UsageRepository` keeps the rest of the app
  independent of it.

### cheerio for parsing (no headless browser, no regular expressions)

- Hacker News is rendered on the server: a single HTTP request returns static HTML that already
  contains every entry. No JavaScript has to run, so a headless browser (Playwright, Puppeteer)
  would only add weight and slowness; fetching the page and parsing it with cheerio is enough.
- HTML is a tree, not a flat string: each entry spans two table rows (title row and points/comments
  row), which CSS selectors relate directly (`tr.athing` and its next sibling).
- cheerio decodes HTML entities (`&#x27;` → `'`) and tolerates attribute order, whitespace and
  markup changes that would silently break a regex.
- Regular expressions are still used where they fit: on short, already extracted text such as
  `"164 points"`.

### Usage is tracked in the service, not in an HTTP middleware

`EntriesService.getEntries` records one usage row per call through `UsageService`, whether it
succeeds or fails. `UsageService` owns the usage log: it builds and saves each record and answers
the queries of `GET /usage`.

- **Why the service:** storing usage is a business requirement, so it must hold for every
  entrypoint (API and CLI), and a CLI never goes through Fastify's hooks. The
  most useful fields describe the crawler's behaviour — cache hit, result count, source errors —
  and only the service knows them.
- **Trade-off:** requests rejected by validation (`400`, e.g. an unknown filter) are not recorded,
  because Fastify rejects them before the service runs. HTTP-level data (IP, user agent, status
  code) is not recorded either.
- **Best-effort:** if the usage log cannot be written, the error is reported (stderr) and the
  request still gets its normal answer; a logging failure never turns a `200` into a `500` or hides
  the original error of a failed request.
- **Possible extension:** a lightweight Fastify `onResponse` hook could log that HTTP-level
  information as a complement — user interaction at the edge, crawler behaviour in the service.

### Cache-aside with an in-memory TTL

The service asks the cache first; on a miss it scrapes Hacker News and stores the result for
`CACHE_TTL_MS`. The service depends on a two-method `Cache` interface (`get()` / `set(value)`)
instead of `TtlCache` itself, which keeps the application layer free of infrastructure imports. A
shared cache such as Redis (`GET` / `SET ... EX`) would plug in the same way if the API ever ran as
several instances; it is not needed today.

- **Trade-off:** concurrent requests that miss at the same moment each scrape once (no cache
  stampede protection). With one front page and a short TTL, that costs a few extra requests at
  worst, and explicit code was preferred.
- In-memory means the cache is per process and is lost on restart.

## Limitations

Known trade-offs, accepted for the scope of this exercise:

- **Not every request is logged:** requests rejected by validation (`400`) and `GET /usage` itself
  are not recorded, and logging is best-effort (a failed write is reported, not retried).
- **Unbounded usage table:** `usage_logs` grows forever; a real deployment would add retention or
  rotation.
- **No cache stampede protection:** concurrent misses each scrape Hacker News once.
- **Single machine:** the cache lives in memory and SQLite is a local file. API and CLI can share
  the database: it runs in WAL mode, so reads never wait for writes, and a write waits at most
  250 ms for a lock held by the other process. `node:sqlite` is synchronous, so that wait blocks
  the event loop and every in-flight request; it is kept short on purpose, and if it expires the
  usage row is dropped and reported (best-effort). Scaling out would need a shared cache and an
  asynchronous database.
- **Depends on Hacker News markup:** a layout change is detected and answered with `502`, but the
  parser must be updated to recover.

## Testing

```bash
npm test                # full suite, no network access
npm run test:coverage   # coverage report in coverage/
```

Tests never hit the network. The parser runs against
[`tests/fixtures/hn-front-page.html`](tests/fixtures/hn-front-page.html), a snapshot of the Hacker
News front page captured on 2026-10-16; edge cases the snapshot lacks are covered with small inline
HTML samples.

## How I used AI

The assignment allows AI, so I worked with Claude Code as a pair programmer:

- **I decided** the stack (TypeScript, Jest, Fastify, `node:sqlite`, cheerio), the assumptions
  (ordering, tie-breaking, word count) and the architecture. Several designs changed after my
  review: an explicit cache-aside instead of a read-through cache, a plain try/catch instead of a
  tracking wrapper, `UsageService` as the single owner of the usage log, and one route plugin per
  resource.
- **I delegated** drafting code, tests, documentation and commit messages once a design was agreed.
- **I reviewed** every change in small batches, and ran an independent AI review whose findings
  (failure handling around the usage log and the scraper) were fixed with tests.
- **Guardrails** kept quality independent of who wrote a line: [`AGENTS.md`](AGENTS.md), a
  [pre-commit review checklist](.claude/skills/pre-commit-review/SKILL.md), Git hooks, CI, and a
  test suite that never touches the network.

## Development workflow

- `npm run lint` / `npm run format` — ESLint and Prettier.
- Git hooks (installed automatically by `npm install` through Husky):
  - `pre-commit`: formats and lints staged files (lint-staged).
  - `commit-msg`: enforces [Conventional Commits](https://www.conventionalcommits.org/) (commitlint).
  - `pre-push`: runs the type check, lint and the full test suite.
- CI (GitHub Actions) runs the same checks, plus the format check, on every push and pull request.
- [`AGENTS.md`](AGENTS.md) documents conventions for AI coding agents and humans alike (Claude Code
  reads it natively). The [`pre-commit-review`](.claude/skills/pre-commit-review/SKILL.md) skill is
  the checklist used to review each change before committing.
