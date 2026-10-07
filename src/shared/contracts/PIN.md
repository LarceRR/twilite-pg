# Contracts pin (P0-S6)

Pinned source: `@twilite/contracts@1.0.0` in `D:/twilite-backend/packages/contracts`.

## Why not `file:` dependency

A `file:../twilite-backend/packages/contracts` dependency is fragile on Windows (path layout, pnpm linking, Zod peer pull into the Vite app). Until the package is published or a monorepo workspace exists, PG vendors the **client-facing surface** lightly:

- error code registry (`errors.ts`)
- default limits + format literal (`limits.ts`)

Zod schemas stay API-owned. PG continues to use local DTO TypeScript types for HTTP responses and still treats **server responses** as authoritative.

## Drift check

When bumping the pin, diff:

- `packages/contracts/src/errors.ts` → `src/shared/contracts/errors.ts`
- `packages/contracts/src/limits.ts` → `src/shared/contracts/limits.ts`
