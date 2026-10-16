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
npm test
```

## Development workflow

- `npm run lint` / `npm run format` — ESLint and Prettier.
- Git hooks (installed automatically by `npm install` through Husky):
  - `pre-commit`: formats and lints staged files (lint-staged).
  - `commit-msg`: enforces [Conventional Commits](https://www.conventionalcommits.org/) (commitlint).
  - `pre-push`: runs lint and the full test suite.
- [`AGENTS.md`](AGENTS.md) documents conventions for AI coding agents and humans alike (Claude Code
  reads it natively). The [`pre-commit-review`](.claude/skills/pre-commit-review/SKILL.md) skill is
  the checklist used to review each change before committing.
