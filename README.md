# hn-crawler

Web crawler that scrapes the first 30 entries from [Hacker News](https://news.ycombinator.com/)
and exposes filters over them, storing usage data for every request.

> Work in progress — full documentation and design decisions will be added as the project evolves.

## Requirements

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
