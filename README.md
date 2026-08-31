# MahaSetu

MahaSetu is an SIH 2026 software demonstrator for a startup-friendly public procurement lifecycle: `Pulse → Forge → Match → Lab → Proof → PayFlow → ScaleGraph`.

The prototype uses synthetic demonstration data and explicit offline/mock adapters. It does not connect to live government identity, procurement, sandbox, or payment systems.

The verified foundation uses Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, Prisma 6, Zod 4, Vitest 4, and ESLint 9. Exact reproducible versions are locked in `pnpm-lock.yaml`.

## Local setup

Prerequisites:

- Node.js 20.9 or newer (Node 22 LTS is recommended)
- pnpm 10.25 or newer
- PostgreSQL for database-backed flows

On Windows PowerShell, use `pnpm.cmd` if execution policy blocks the `pnpm.ps1` shim.

```powershell
Copy-Item .env.example .env
pnpm.cmd install
pnpm.cmd db:generate
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/mahasetu?schema=public'
pnpm.cmd db:deploy
pnpm.cmd db:seed
pnpm.cmd dev
```

`db:deploy` applies the committed migration in `prisma/migrations/` (requires a reachable PostgreSQL server; it does not create or drop the database itself). `db:seed` truncates every application table and reloads the deterministic golden-path demo dataset described in `Truth.md` section 5.1 — safe to rerun any number of times for repeatable judging. Use `pnpm.cmd db:reset` during development to apply migrations from scratch and reseed in one step (destructive: drops and recreates the database).

Open [http://localhost:3000](http://localhost:3000). The initial overview shell runs without contacting external government or AI services.

To validate the foundation:

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/mahasetu?schema=public'
pnpm.cmd db:validate
pnpm.cmd build
```

`db:validate` parses the schema and connection URL; it does not require the database server to be running. `db:deploy`/`db:seed`/`db:reset` do require a reachable PostgreSQL server.

`pnpm audit --prod` currently reports the transitive Prisma configuration-tooling advisory tracked as `R-013` in `Truth.md`. Do not silence it with an unverified major override; rerun the audit before submission and adopt a compatible upstream fix when available.

## Project context

- `Truth.md` is the current product, architecture, scope, decision, and backlog specification.
- `WORKLOG.md` is the append-only contributor activity and handoff record.
- `AGENTS.md` and `CLAUDE.md` contain mandatory repository collaboration rules.

Never place real secrets, private proposals, or citizen data in this repository. Label all fixture-backed behavior `SIMULATED_FOR_DEMO` and all seeded operational numbers `Synthetic demonstration data`.
