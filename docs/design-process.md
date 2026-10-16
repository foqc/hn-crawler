# Design process

How this project went from the requirements to the current code, in the order it happened:
what I analysed, the plan I gave the AI before any code existed, how that plan was used and
changed, and the decisions behind the result. It records only what actually happened; where a
decision was later replaced, both versions are kept, because the change of mind is part of the
reasoning.

> **Who decided.** I worked with an AI assistant (Claude Code), which wrote most of the code,
> tests and documentation. The direction was mine. Most ideas and changes in this document started
> as my proposals or my questions; when I was unsure between options I asked the assistant to
> compare them ("which is better, X or Y, and why?"), and outside the sessions I researched and
> cross-checked its answers before deciding. I set the constraints, reviewed the code, ran the
> application, questioned designs I did not find clear and asked for changes — in one case against
> the assistant's recommendation
> ([ADR-09](#adr-09-usageservice-as-the-single-owner-of-the-usage-log)).
> Every batch of work started on my instruction and was reviewed by me afterwards.

1. [Requirements](#1-requirements)
2. [Analysis](#2-analysis)
3. [The plan given to the AI](#3-the-plan-given-to-the-ai)
4. [How the plan was used](#4-how-the-plan-was-used)
5. [Decision records](#5-decision-records)
6. [Current specification](#6-current-specification-written-after-implementation)

## 1. Requirements

What the project must do:

- Scrape the **first 30 entries** of <https://news.ycombinator.com/>, keeping only **number
  (rank), title, points and number of comments**.
- Filter A: titles with **more than five words**, ordered by number of comments.
- Filter B: titles with **five words or fewer**, ordered by points.
- Word counting: only spaced words, excluding symbols — `"This is - a self-explained example"`
  has 5 words.
- **Store usage data**: at least the request timestamp and the applied filter; any other field
  that helps track user interaction and crawler behaviour is welcome. Storage can be a database,
  a cache or any suitable tool.
- Quality goals: good response times, the requested operations covered by automated tests,
  clean OO/functional code without repetition and with a consistent organisation, an incremental
  commit history, and a README with the key design decisions.

My constraints before any code: TypeScript and Jest; a solution that is **simple, clear and
explainable** rather than impressive; and **analysis first** — no implementation until the
approach was chosen and I understood the reasons behind each alternative.

## 2. Analysis

I asked for the requirements to be broken down and for the possible approaches to be compared
side by side, with their advantages, disadvantages and complexity.

### Details found in the requirements and in the real page

- Job posts have no points or comments; when there are no comments HN shows `discuss`; counts
  appear as `1 comment` (singular) and `109&nbsp;comments` (non-breaking space).
- `span.titleline` contains the link **and** the site domain (`(example.com)`); taking the whole
  text would add a word to every title and break the filters.
- Titles contain HTML entities (`Duo&#x27;s`).
- Points and comments are in the **next** table row, not in the row with the title.
- The requirements do not say whether ordering is ascending or descending, nor how to break ties.
- Good response times rule out scraping Hacker News on every request.

### Complete approaches compared

|           | A. Minimal                                                     | **B. Balanced (chosen)**             | C. Over-engineered                                 |
| --------- | -------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| Interface | CLI                                                            | REST API                             | NestJS                                             |
| Scraping  | `fetch` + cheerio                                              | `fetch` + cheerio                    | Playwright                                         |
| Storage   | JSON file                                                      | SQLite behind a repository interface | PostgreSQL + Redis + Docker                        |
| Cache     | None                                                           | In-memory with TTL                   | Redis                                              |
| Trade-off | Simple, but logging requests feels forced and nothing persists | Every piece justified, nothing extra | Infrastructure and ceremony far beyond the problem |

I chose B: every piece has a one-sentence reason, anyone can run it with
`npm install && npm start`, and it shows separation of concerns, dependency injection, tests
without network and awareness of performance, without unnecessary layers.

### Decisions, one by one

| Decision          | Options compared                                                                                   | Chosen                                                                                              | Main reason                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Application shape | CLI, REST API, NestJS                                                                              | REST API first, CLI possibly later (my call)                                                        | "Request timestamp" and "user interaction" fit an API; NestJS would hide my own design |
| HTTP framework    | Fastify (my preference) vs Express                                                                 | Fastify                                                                                             | See [ADR-02](#adr-02-fastify-instead-of-express)                                       |
| Usage storage     | `node:sqlite` (my preference) vs `better-sqlite3`, JSON file, in-memory, PostgreSQL/Redis          | `node:sqlite`                                                                                       | See [ADR-03](#adr-03-nodesqlite-for-usage-data)                                        |
| Getting the HTML  | cheerio vs regex (my question), jsdom, Puppeteer/Playwright, official HN API                       | `fetch` + cheerio                                                                                   | See [ADR-04](#adr-04-cheerio-for-parsing)                                              |
| Cache             | None, in-memory TTL, Redis                                                                         | In-memory TTL; I asked to document why not Redis, and what happens on restart and under concurrency | Fast responses and fewer requests to HN; Redis is excessive here                       |
| Ordering          | Ascending vs descending, tie-break                                                                 | Descending, ties by rank; documented as an assumption                                               | Not stated in the requirements                                                         |
| Word count        | `split(' ')`, strip symbols then split, split on whitespace and drop tokens without letters/digits | The last one                                                                                        | Correct for the example, keeps `self-explained` as one word, Unicode-aware             |
| Filters           | Two near-identical functions vs a strategy map                                                     | Strategy map (filters as data)                                                                      | No repetition; a new filter is one entry                                               |
| Code style        | Pure OO, pure functional, hybrid                                                                   | Functional core, OO shell                                                                           | Pure functions for rules; classes only for things with dependencies or state           |

## 3. The plan given to the AI

Once the approach was decided, I asked for a commit plan with the test cases of each commit,
reviewed it and questioned it (the cheerio-versus-regex discussion happened at this point) before
approving it. This plan, **agreed before any code was written**, is what the AI followed. Each
commit had to compile, pass its tests and include them.

| #   | Commit                                                             | Content                                                           | Tests agreed in advance                                                                                                                                                          |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `chore: initialize project with TypeScript and Jest`               | `package.json` (`engines >=22.13`), `.nvmrc`, `tsconfig`, ts-jest | —                                                                                                                                                                                |
| 2   | `chore: add ESLint and Prettier`                                   | Consistent style from the start                                   | —                                                                                                                                                                                |
| 3   | `feat(domain): add Entry type and word counting`                   | `Entry` and `countWords()`                                        | 14 cases: the example from the requirements, empty, only spaces, repeated spaces, tabs/newlines, `HN:`, `C++`, `GPT-5`, standalone `\|` and `–`, accents, `(beta)`, only symbols |
| 4   | `feat(domain): add title filters with strategy map`                | `long-titles` / `short-titles`, `applyFilter()`                   | Exact 5-word boundary, descending order, ties by rank, job post (0 points) last, empty list, input not mutated                                                                   |
| 5   | `test: add Hacker News HTML fixture`                               | Snapshot of the real front page                                   | —                                                                                                                                                                                |
| 6   | `feat(scraper): parse entries from HN HTML`                        | `parseEntries()` with cheerio, `parseCount()`                     | Fixture: 30 entries, ranks 1–30, known first entry, domain excluded. Inline HTML: `&nbsp;`, singular, `discuss`, job post, more than 30 rows, no rows                            |
| 7   | `feat(scraper): fetch front page from HN`                          | `HackerNewsScraper`, injectable `fetch`                           | Correct URL, 200 parses, 503 fails, network error propagates                                                                                                                     |
| 8   | `feat(cache): add in-memory TTL cache`                             | `TtlCache` with injectable clock                                  | Hit within TTL, reload after TTL, concurrent calls load once, failures not cached                                                                                                |
| 9   | `feat(usage): persist usage logs with node:sqlite`                 | `UsageRepository` + SQLite implementation                         | Save and read back, `none` filter, most recent first (SQLite `:memory:`)                                                                                                         |
| 10  | `feat(service): orchestrate scraping, filtering and usage logging` | `EntriesService`                                                  | No filter → 30 and `none`; filter applied and logged; duration and cache hit; errors logged and rethrown                                                                         |
| 11  | `feat(api): expose entries and usage endpoints with Fastify`       | `GET /entries?filter=`, `GET /usage`                              | 200 for each filter, 400 for an unknown filter, 502 when scraping fails (`app.inject()`)                                                                                         |
| 12  | `feat: wire dependencies and add server entrypoint`                | Composition root, environment configuration                       | —                                                                                                                                                                                |
| 13  | `docs: add README with design decisions`                           | Assumptions and rejected alternatives                             | —                                                                                                                                                                                |
| 14  | _(optional)_ `feat(cli): add CLI on top of EntriesService`         | Shows the core does not depend on HTTP                            | —                                                                                                                                                                                |

Order: the pure domain first, then the outside world (network, database), the API last.

## 4. How the plan was used

### Persistent guidance, created before the code

The plan and the analysis lived in the conversation. Before implementation started, I asked for
two documents in the repository so that the rules would not depend on the conversation:

- **`AGENTS.md`** (commit `2b1c40e`): the conventions every AI session must follow. I then
  pointed out that it repeated business rules, which moved to the README (`974bc72`), and I gave
  the `AGENTS.md` of a larger project of mine as a model to trim it from 81 to about 40 lines
  (`1055df3`).
- **README "Requirements & assumptions"** (`974bc72`): the single source of truth for the
  business rules and assumptions, which the tests then specify. It exists **before** the first
  `feat` commit.

I also added two steps that were not in the plan: Git hooks (`89a6855`) and the
`pre-commit-review` skill (`2b1c40e`), so that quality checks would not depend on the AI
remembering them.

### Execution in batches

When I asked whether the plan still held, the AI produced a status table: commits 1–2 done, four
extra commits added (hooks, `AGENTS.md`, moving business rules, trimming `AGENTS.md`), commit 5's
fixture path adjusted to `tests/fixtures/`, and commit 13 narrowed because the README already
covered installation and assumptions. Then I asked for commits 3–12 to be implemented in one
batch, up to a point where I could test the API myself, instead of approving every commit.

### Review rounds that changed the plan

After running and reading the result, my reviews reshaped the design. Each change landed as its
own commit, so `git log` shows the evolution:

1. **Architecture** — I asked which architecture it was and gave six points of feedback (empty
   domain, scattered errors, intrusive tracking, SQL and mapping mixed together, utility
   placement, where services are created) → six `refactor:` commits
   ([ADR-07](#adr-07-layered-architecture-inspired-by-hexagonal-but-not-purist)).
2. **Readability** — I found the cache and the tracking wrapper implicit → explicit cache-aside
   and try/catch ([ADR-06](#adr-06-cache--from-read-through-to-explicit-cache-aside),
   [ADR-08](#adr-08-usage-tracking-in-the-service-not-in-an-http-middleware)).
3. **Responsibilities** — I questioned `getUsage` inside `EntriesService`, then who should write
   usage → `UsageService` ([ADR-09](#adr-09-usageservice-as-the-single-owner-of-the-usage-log));
   I asked for one controller per resource → `http/routes/`.
4. **Extras** — the optional CLI (commit 14 of the plan), CI on GitHub Actions.
5. **Independent reviews** — I had a separate AI agent review the finished project twice. I
   decided which findings to fix: failure handling ([ADR-10](#adr-10-usage-logging-is-best-effort),
   [ADR-12](#adr-12-failures-from-the-source-always-mean-502)) and the SQLite lock wait
   ([ADR-11](#adr-11-short-sqlite-lock-wait-and-wal)).

### Roles

| Phase          | What I did                                                                                                                                                                               | What the AI did                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Analysis       | Set the constraints, proposed my preferred options (Fastify, `node:sqlite`, API first) and asked for comparisons; researched and cross-checked the answers outside the sessions; decided | Broke down the requirements and compared the options I asked about                                  |
| Planning       | Asked for the commit plan and its test cases, questioned it, added steps (hooks, `AGENTS.md`), approved it                                                                               | Drafted the plan and the test cases                                                                 |
| Implementation | Chose the batch size and the milestone to stop at                                                                                                                                        | Wrote code, tests and commit messages, running type check, lint and tests before each commit        |
| Review         | Ran the API, read the code, questioned designs, proposed changes and decided on each one                                                                                                 | Gave its opinion on each point without changing code until I decided, then implemented the decision |
| Verification   | Ordered independent reviews and chose which findings to fix                                                                                                                              | A separate agent reviewed and re-checked the fixes against the real server and CLI                  |

### What kept the work in small pieces

- **One concern per commit**, each green: hooks and CI block any commit or push that fails type
  check, lint or tests.
- **Analysis separated from changes**: when I asked for an opinion, nothing changed until I
  decided.
- **Tests that never touch the network** (HTML fixture, injected `fetch` and clock, SQLite
  `:memory:`), so every change is verified deterministically.
- **Mistakes kept visible**: once a commit ran even though a test edit had failed, because the AI
  chained the commands; it was caught before pushing and amended, and from then on commits only
  ran after type check, lint and tests passed.

## 5. Decision records

Short ADRs. **Status** is _accepted_ unless a later record replaced it.

### ADR-01: REST API first, CLI as an optional extra

- **Decision (mine):** build a REST API first and consider a CLI later on the same services. The
  requirements talk about requests and user interaction, which a CLI makes feel forced.
- **Consequence:** the CLI was added near the end, labelled as an optional extra. It reuses the
  composition root and writes to the same usage log.

### ADR-02: Fastify instead of Express

- **Context:** I wanted Fastify for its speed and TypeScript support, and asked for a comparison
  with Express to check that choice. The comparison sharpened my arguments: raw speed barely
  matters when time is dominated by the network and the cache, and Fastify is written in
  JavaScript but ships official, team-maintained types (Express relies on community
  `@types/express`).
- **Decision:** Fastify, justified by what is visible in the code: JSON Schema validation (an
  unknown filter becomes a `400` with no manual checks), schema-based serialization,
  `app.inject()` for tests without supertest, and official types. Async error handling is not an
  argument, since Express 5 also has it.

### ADR-03: `node:sqlite` for usage data

- **Context:** I proposed `node:sqlite` and asked how it compared with `better-sqlite3`, since
  anyone's first contact with the project is `npm install`.
- **Decision:** the built-in `node:sqlite` module, behind a `UsageRepository` interface.
- **Alternatives:** `better-sqlite3` (stable, but a native module that may need compiling); a
  JSON file (concurrent writes, not queryable); in-memory storage (lost on restart); PostgreSQL
  or Redis with Docker (forces whoever runs it to set up infrastructure).
- **Consequences:** the worst case is a console warning (`ExperimentalWarning`) and a minimum
  Node version, both documented, instead of a broken install. The module is synchronous, which
  matters for locks ([ADR-11](#adr-11-short-sqlite-lock-wait-and-wal)).

### ADR-04: cheerio for parsing

- **Context:** I questioned whether a regular expression would be simpler than a parser library.
- **Decision:** cheerio to navigate the HTML; regular expressions only on short text already
  extracted (`"164 points"`, the word-count token test).
- **Reasons:** Hacker News is server-rendered, so one request returns static HTML and no
  headless browser is needed; HTML is a tree, and each entry spans two rows that `next()`
  relates directly; cheerio decodes entities (`&#x27;` → `'`); matching rows by position with
  regexes silently misaligns when a job post has no points; attribute order, quotes and extra
  classes break literal patterns.
- **Alternatives:** regex (no dependency, but fragile and hard to read); jsdom (heavier, no
  benefit); Puppeteer/Playwright (a whole browser for a static page); the official HN API
  (scraping is explicitly required).

### ADR-05: Descending order, ties broken by rank

- **Context:** the requirements give neither the direction nor a tie-break.
- **Decision:** descending (most comments/points first), ties by rank ascending. I decided to
  record it as an explicit assumption in the README, fixed by tests.

### ADR-06: Cache — from read-through to explicit cache-aside

- **Original:** an in-memory TTL cache whose `get(load)` received the loading function and cached
  the in-flight promise, so concurrent misses shared one scrape (cache stampede protection).
- **Revision (my proposal):** reviewing the code I found `cache.get(load)` implicit and hard to
  read; I am used to asking the cache first and loading explicitly on a miss, which also maps
  directly to a store like Redis.
- **Decision (current):** cache-aside. The `Cache` interface is `get()` / `set(value)`; the
  service reads, scrapes on a miss and stores the result.
- **Consequence:** concurrent misses each scrape once — stampede protection dropped on purpose,
  documented as a limitation.

### ADR-07: Layered architecture, inspired by hexagonal but not purist

- **Context:** after the first working version I asked which architecture it followed and gave
  six points of feedback: the domain looked empty, errors were scattered, usage tracking was
  intrusive inside `getEntries`, SQL and mapping were mixed in the repository, utility
  placement, and where services are instantiated.
- **Decision (mine):** make three layers visible (`domain/`, `application/`, `infrastructure/`)
  plus `http/`, a composition root (`container.ts`) and `server.ts` for the process lifecycle —
  explicitly **not** a purist hexagonal architecture, just common sense.
  - Business concepts that lived in infrastructure moved to the domain (the 30-entry size, the
    usage record types).
  - One application error, `SourceUnavailableError`, so HTTP maps `502` without knowing about
    the scraper.
  - SQLite split into `schema.ts` (migration), a symmetric mapper that **fails** on invalid rows
    instead of inventing defaults, and the repository with only queries.
  - A three-line `Cache` interface so the application layer does not import infrastructure.
- **Rejected:** a `constants.ts`, a global `errors/` or `mappers/` folder, a `utils/` folder
  (all group by technical type instead of concept), SQL in `.sql` files, a DI framework, and a
  "textbook" hexagonal layout with `ports/`/`adapters/` folders and interfaces for everything.
- **Rule adopted:** extract shared code when a second consumer appears, not before. It was
  applied later when the CLI needed the same usage-query limits as the API.
- **Kept as is:** the name `ports.ts`. I am used to controller → service → repository and asked
  whether to rename it; after comparing, I decided to leave it.

### ADR-08: Usage tracking in the service, not in an HTTP middleware

- **Context:** I asked what the trade-offs would be if usage were tracked in a middleware, to be
  sure the choice could be justified.
- **Decision:** track in the service. Storing usage is a business requirement that must hold for
  every entrypoint (the CLI never goes through Fastify hooks), and the most useful fields —
  cache hit, result count, source errors — are only known inside the service.
- **Trade-off:** requests rejected by validation (`400`) are not logged; HTTP-level data (IP,
  user agent) is not recorded. A Fastify `onResponse` hook is documented as a possible
  complement.
- **How the code evolved, from my reviews:** I found the `tracked(operation)` wrapper intrusive
  (the main operation was passed into a utility), so it became an explicit `try/catch`. I asked
  about a `finally` block; it was rejected because it cannot see the error, needs a shared
  mutable variable, and TypeScript flags it as possibly unassigned (TS2454). I pointed out that
  `recordSuccess`/`recordFailure` only wrapped another call, so they were inlined.

### ADR-09: `UsageService` as the single owner of the usage log

- **Step 1 (my observation):** `getUsage` lived in `EntriesService`, but reading the usage log is
  a separate use case, so it moved to a new `UsageService`.
- **Step 2 (my proposal, against the assistant's recommendation):** I proposed that
  `EntriesService` record usage **through** `UsageService` instead of calling the repository. The
  assistant recommended keeping the direct call until a second producer of usage records
  appeared; I disagreed and preferred a single owner. My option was adopted: `UsageService`
  builds, saves and queries usage records, and the dependency goes one way
  (`EntriesService → UsageService → UsageRepository`).

### ADR-10: Usage logging is best-effort

- **Context:** the independent review found that a failing usage write turned a successful
  request into a `500` and replaced the original error of a failed one (a `502` became a `500`).
- **Decision:** `UsageService.record` reports save failures through an injected callback and
  never throws. The usage log is secondary to the answer: a logging failure is reported but
  neither punishes the user nor hides the real error.

### ADR-11: Short SQLite lock wait and WAL

- **First fix:** since the API and the CLI can write to the same file, a 5 s `busy_timeout` was
  added so a write waits for a lock instead of failing at once.
- **Revision:** the second review showed that `node:sqlite` is synchronous, so that wait froze
  the whole server, not just the writing request.
- **Decision (current):** a 250 ms busy timeout (dropping a best-effort row beats stalling every
  request) and WAL mode, so readers never wait for writers. The README states that the wait
  blocks the event loop.

### ADR-12: Failures from the source always mean `502`

- **Context:** the first review also found that a layout change parsed into an empty list that
  was served as a `200` **and cached**, and that a failure while reading the response body
  surfaced as a `500`.
- **Decision:** the scraper rejects pages with no entries, or entries without rank or title, and
  wraps body-read failures; all of them become `SourceUnavailableError` (`502`) and are never
  cached. The parser stays a pure function that returns what it finds.

### ADR-13: Tooling and repository guidance

- **`AGENTS.md` + a custom review skill:** I asked for both and for a decision between writing
  our own skill or using an existing one. Hybrid: `AGENTS.md` holds only what an agent cannot
  deduce from the repository; the `pre-commit-review` skill is a checklist mapped to the
  project's quality goals. Third-party skills from skills.sh were read as references only, never
  installed. I pointed out that Claude Code now reads `AGENTS.md` natively, so there is no
  `CLAUDE.md`.
- **Business rules in the README, not in `AGENTS.md`:** see [section 4](#4-how-the-plan-was-used).
- **Git hooks (my request):** Husky + lint-staged + commitlint. `pre-commit` formats and lints
  staged files, `commit-msg` enforces Conventional Commits, `pre-push` runs type check, lint and
  tests. CI on GitHub Actions runs the same checks plus the format check.
- **Version pins:** TypeScript 6 (ts-jest and typescript-eslint do not support 7); lint-staged 16
  (17 requires a newer Node than the project's minimum).
- **`isolatedModules`:** enabled to remove a ts-jest warning; Jest now only transpiles, so types
  are enforced by `npm run typecheck` in the hook and in CI.

## 6. Current specification (written after implementation)

This section describes the system as it is now, after the plan and the reviews above. It is a
summary for readers, not the document the work started from (that was the plan in
[section 3](#3-the-plan-given-to-the-ai) and the README's requirements).

### Scope

- **In:** scraping the first 30 front-page entries, two title filters, usage logging, an HTTP
  API, documentation and tests.
- **Optional extra:** a CLI over the same services, to show that the use cases do not depend on
  HTTP.
- **Out:** authentication, pagination, multiple instances, pages other than the front page.

### Data

`Entry`: `rank`, `title`, `points`, `comments` (integers except `title`).

Usage record (`usage_logs` table): `id`, `requested_at` (ISO timestamp), `filter`
(`long-titles`, `short-titles` or `none`), `status` (`success` or `error`), `result_count`,
`duration_ms`, `cache_hit`, `error_message`.

### Behaviour

| Rule             | Specification                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Word count       | Split on whitespace; count tokens containing at least one letter or digit (any script)                              |
| `long-titles`    | More than 5 words, ordered by comments, descending                                                                  |
| `short-titles`   | 5 words or fewer, ordered by points, descending                                                                     |
| Ties             | Broken by rank ascending (original page order) — an assumption                                                      |
| Missing values   | Job posts and `discuss` count as 0 — an assumption                                                                  |
| Symbols in words | `(2026)` counts as a word because it contains digits — an assumption                                                |
| Cache            | Entries are reused for `CACHE_TTL_MS` (default 60 s); failed scrapes are never cached                               |
| Usage logging    | One record per request that reaches the service, success or failure; best-effort                                    |
| Errors           | Unknown filter or invalid limit → `400`; Hacker News unreachable, failing, or returning an unparseable page → `502` |

### Interfaces

- `GET /entries[?filter=long-titles|short-titles]` → `{ filter, count, entries }`
- `GET /usage[?limit=1..500]` → `{ count, records }`, most recent first (default 50)
- CLI: `npm run cli -- entries [--filter …]`, `npm run cli -- usage [--limit …]`; exit codes 0
  (success), 1 (command failed), 2 (invalid arguments)

### Non-functional

- Node.js >= 22.13 (`node:sqlite` without flags), declared in `engines` and `.nvmrc`.
- Tests never touch the network: HTML fixture, injected `fetch` and clock, SQLite `:memory:`.
- Every commit is green (type check, lint, tests) and follows Conventional Commits.
