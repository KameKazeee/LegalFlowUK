# Legal Flow UK (MVP: Police Station Callouts)

Monorepo managed by Turborepo. Apps and packages:

- apps/web – Next.js 14 (App Router)
- apps/worker – BullMQ worker
- packages/db – Prisma ORM schema and client
- packages/lib – Shared domain utils (parsers, validation, lookups)
- packages/ui – Shared UI components

## Quick start

1. Install Node 20 (see `.nvmrc`) and pnpm
2. Copy `.env.example` to `.env` in apps where needed
3. Install deps: `pnpm install`
4. Start dev: `pnpm dev`

## Tech

- Next.js 14, TailwindCSS, shadcn/ui
- NextAuth (Email + Credentials)
- Prisma (SQLite local, Postgres prod)
- BullMQ + Redis, Resend, S3-compatible storage
- Vitest + Playwright

## Packages

- `packages/db`: Prisma schema, migrations, seed
- `packages/lib`: DSCC parser (`zod`), lookups
- `packages/ui`: shared components

## Scripts

- `pnpm dev` – run all dev servers
- `pnpm build` – build all
- `pnpm test` – run tests
- `pnpm lint` – lint
