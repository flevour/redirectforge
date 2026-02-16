# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RedirectForge is a framework-agnostic Node.js library that ports the WordPress Redirection plugin's core functionality. It provides URL redirect matching, regex/pattern support, redirect actions (URL redirect, 404, pass-through, random, error codes), and logging — all decoupled from any web framework or database.

Specs are provided via `juxt@allium` plugin annotations derived from the original WordPress plugin.

## Commands

```bash
pnpm build          # Build with tsup (ESM + CJS + .d.ts)
pnpm test           # Run all tests (vitest)
pnpm test:watch     # Run tests in watch mode
pnpm test:single    # Run tests with verbose output
pnpm typecheck      # Type-check without emitting (tsc --noEmit)
pnpm lint           # Lint src/ with eslint

# Run a single test file
pnpm vitest run src/path/to/file.test.ts
```

## Architecture

- **Pure library** — no HTTP server, no database driver, no framework dependency. Consumers provide request data in and receive redirect decisions out.
- **Dual-format output** — ships ESM (`dist/index.js`) and CJS (`dist/index.cjs`) via tsup.
- **TypeScript strict mode** — `strict: true` in tsconfig, all public API types exported from `src/index.ts`.

## Conventions

- Package manager: **pnpm** (do not use npm or yarn).
- Tests live alongside source files as `*.test.ts`.
- Commit only via the custom committer: `~/.claude/custom-bins/committer "message" "file" ["file" ...]`.
