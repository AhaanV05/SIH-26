# MahaSetu

MahaSetu is an SIH 2026 software demonstrator for a startup-friendly public procurement lifecycle: `Pulse → Forge → Match → Lab → Proof → PayFlow → ScaleGraph`.

The prototype uses synthetic demonstration data and explicit offline/mock adapters. It does not connect to live government identity, procurement, sandbox, or payment systems.

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
pnpm.cmd dev
```

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

`db:validate` parses the schema and connection URL; it does not require the database server to be running. Database migrations and deterministic seed data are not yet included.

## Project context

- `Truth.md` is the current product, architecture, scope, decision, and backlog specification.
- `WORKLOG.md` is the append-only contributor activity and handoff record.
- `AGENTS.md` and `CLAUDE.md` contain mandatory repository collaboration rules.

Never place real secrets, private proposals, or citizen data in this repository. Label all fixture-backed behavior `SIMULATED_FOR_DEMO` and all seeded operational numbers `Synthetic demonstration data`.
