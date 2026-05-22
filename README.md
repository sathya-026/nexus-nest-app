# Nexus — NestJS Backend

REST API for agent configuration, knowledge base management, tool registry, and analytics.

## Stack

| Layer | Tech |
|---|---|
| Framework | NestJS 10 + TypeScript |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Auth | JWT (passport-jwt) |
| File storage | AWS S3 (pre-signed URLs) |
| Docs | Swagger (dev only) |

---

## Getting Started

### 1. Start infrastructure
```bash
docker-compose up -d
# Postgres (with pgvector) on :5432, Redis on :6379
# The initial schema SQL runs automatically on first boot.
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in JWT_SECRET, ENCRYPTION_KEY, and AWS credentials
```

### 3. Install and run
```bash
npm install
npm run start:dev
```

Swagger UI: http://localhost:3001/api/docs

---

## Project Structure

```
src/
├── config/               # Typed env config
├── database/
│   ├── database.module.ts
│   ├── data-source.ts    # TypeORM CLI entry point
│   └── migrations/
│       └── 001_initial_schema.sql
├── redis/                # Global cache module
├── common/
│   ├── decorators/       # @CurrentUser, @Roles
│   ├── filters/          # Global HTTP exception filter
│   └── guards/           # JwtAuthGuard, RolesGuard
├── auth/                 # Register, login, JWT strategy
├── organizations/        # Org entity + service
├── users/                # User entity + service
├── agents/               # Agent CRUD + embed code generation
├── documents/            # S3 upload flow + indexing status
├── tools/                # Tool CRUD with AES-256 header encryption
├── conversations/        # Conversation + message service (cursor pagination)
├── analytics/            # Event logging + summary queries
├── app.module.ts
└── main.ts
```

---

## API Endpoints

All endpoints are prefixed `/api/v1`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create org + owner account |
| POST | `/auth/login` | Login, get JWT |
| GET | `/agents` | List agents for org |
| POST | `/agents` | Create agent |
| GET | `/agents/:id` | Get agent |
| PATCH | `/agents/:id` | Update agent |
| DELETE | `/agents/:id` | Delete agent |
| GET | `/agents/:id/embed-code` | Get script tag + React snippet |
| POST | `/agents/:agentId/documents/upload-url` | Get S3 pre-signed upload URL |
| POST | `/agents/:agentId/documents/:id/confirm` | Confirm upload → triggers indexing |
| GET | `/agents/:agentId/documents` | List documents |
| DELETE | `/agents/:agentId/documents/:id` | Delete document |
| POST | `/agents/:agentId/tools` | Add tool to agent |
| GET | `/agents/:agentId/tools` | List tools |
| PATCH | `/agents/:agentId/tools/:toolId` | Update tool |
| DELETE | `/agents/:agentId/tools/:toolId` | Delete tool |
| GET | `/analytics/summary` | Aggregated stats |
| GET | `/analytics/events` | Recent event log |

---

## Key Design Decisions

**Tenant isolation** — Every service method takes `orgId` as its first argument and verifies resource ownership before any DB operation. An agent from another org always returns 403, never 404.

**UUID v7 for external IDs** — Agent IDs appear in embed codes, conversation IDs are sent to the widget. Both use UUID v7 (time-sortable, non-guessable) to prevent IDOR enumeration.

**Message ordering via Postgres trigger** — `sequence_number` is set by a `BEFORE INSERT` trigger, not the application layer. This guarantees strict per-conversation ordering regardless of async write timing.

**Tool header encryption** — Headers (which may contain API keys) are AES-256-GCM encrypted before storage. The encryption key lives in env only. Decrypted headers are only returned internally by `findForExecution()`, never in API responses.

**Document upload via pre-signed URLs** — The backend never handles raw file bytes. It returns a pre-signed S3 URL; the frontend uploads directly to S3, then calls `/confirm` to trigger indexing via FastAPI agent-core.

**pgvector HNSW index** — The `document_chunks.embedding` column uses an HNSW index (`vector_cosine_ops`) for approximate nearest-neighbour search, which is significantly faster than IVFFlat at query time once you have thousands of chunks.

---

## Next Steps

- FastAPI agent-core (RAG pipeline, ReAct planner, tool executor)
- WebSocket gateway for widget ↔ backend real-time messaging
- React dashboard frontend
