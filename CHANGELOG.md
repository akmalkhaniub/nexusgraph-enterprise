# Changelog

## [Unreleased]

### Migrated to TypeScript (2026-09-18)
- Ported the server, knowledge-graph engine, and hybrid GraphRAG retriever from
  JavaScript to **TypeScript** (strict) with typed nodes/edges/paths and RAG results.
- Toolchain: `tsconfig.json` (build `src` → `dist`), `tsconfig.test.json` (typecheck),
  `tsx` for dev/test, `scripts/copy-public.mjs` bundles static assets to `dist/`.
- `server.ts` refactored into a `createNexusGraphServer()` factory (listens only when
  run directly) so the HTTP layer is testable.

### Added
- Server integration suite (`test/server_integration.ts`, 10 assertions) driving the
  real server: health, graph, GraphRAG query, and security guards.
- Security: path-traversal guard (403) and 64 KB request-body cap (413).
- Input validation (400 on missing query), graceful SIGTERM/SIGINT shutdown.
- GitHub Actions CI (typecheck + build + tests on Node 18/20/22).
- Multi-stage Dockerfile (compile, then ship `dist/` + prod deps).

### Notes
- Retrieval remains an in-memory hybrid vector+graph model over a seeded topology;
  live connectors (Jira/Slack/GitHub) and a persistent Neo4j/pgvector store are not
  wired. See SPECIFICATION.md for the honest status.
