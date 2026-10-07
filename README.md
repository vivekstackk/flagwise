# Feature Flag Platform

A full-stack feature flag and experimentation platform built from scratch. Create flags, target users with attribute-based rules or reusable segments, roll out gradually with deterministic percentage bucketing, and measure outcomes with built-in A/B experiment tracking — all managed through a real-time dashboard.

## Features

- **Flag Management** — Create, update, toggle, and delete feature flags via REST API or dashboard UI
- **Targeting Rules** — Route users based on attributes (`equals`, `notEquals`, `in`, `contains`) with first-match evaluation
- **Reusable Segments** — Define user segments with multiple AND-conditions, reference them in flag rules via `inSegment`
- **Percentage Rollouts** — Deterministic SHA-256 hashing ensures the same user always gets the same variant, no randomness per request
- **A/B Experimentation** — Log exposures automatically on evaluation, track conversion events, view per-variant stats
- **Redis Caching** — Write-through cache on the hot evaluation path with TTL-based expiry and Pub/Sub invalidation
- **Real-time Updates** — Flag changes propagate to connected clients via Server-Sent Events within ~1–2 seconds
- **Node SDK** — Client library with local evaluation, SSE subscription, and automatic polling fallback if the stream drops
- **Audit Log** — Every flag and segment mutation is recorded with action type, change details, and timestamp
- **Health Monitoring** — `/health` endpoint reports Postgres and Redis connectivity without requiring authentication
- **Graceful Degradation** — If Redis goes down, the system falls through to Postgres directly instead of crashing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Node.js, TypeScript, Fastify |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Dashboard** | React, TypeScript, Vite, Tailwind CSS v4 |
| **Testing** | Jest, ts-jest (60 tests against real Postgres/Redis) |
| **CI** | GitHub Actions (lint, format check, tests) |
| **Infrastructure** | Docker Compose |

## Architecture

```
┌──────────────────┐     HTTP + API Key     ┌──────────────────────────┐
│  React Dashboard │ ◄──────────────────►  │     Fastify REST API      │
│  (localhost:5173) │                       │     (localhost:3000)       │
└──────────────────┘                       ├──────────────────────────┤
                                           │  Evaluation Engine        │
┌──────────────────┐                       │  ├─ Rule matching          │
│    Node SDK      │ ◄── SSE Stream ──►    │  ├─ Segment resolution     │
│  (client apps)   │                       │  └─ Deterministic rollout  │
└──────────────────┘                       ├──────────────────────────┤
                                           │  CachedFlagStore          │
                                           │  ├─ Redis (cache + pubsub)│
                                           │  └─ PgFlagStore (persist) │
                                           └──────────────────────────┘
                                                    │           │
                                              ┌─────┘           └─────┐
                                              ▼                       ▼
                                        ┌──────────┐          ┌──────────┐
                                        │ Postgres │          │  Redis   │
                                        │   :5432  │          │  :6379   │
                                        └──────────┘          └──────────┘
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres and Redis)

## Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd feature-flag-platform
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start Postgres and Redis
docker compose up -d

# 4. Load database schema
# PowerShell:
Get-Content db/schema.sql | docker exec -i feature-flag-platform-postgres-1 psql -U ffp -d feature_flags
# Bash:
cat db/schema.sql | docker exec -i feature-flag-platform-postgres-1 psql -U ffp -d feature_flags

# 5. Run tests
npm test

# 6. Start the API server
npx ts-node src/index.ts

# 7. Start the dashboard (separate terminal)
cd dashboard
npm install
npm run dev
```

## API Endpoints

### Flags
| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/flags` | Create a flag |
| `GET` | `/flags` | List all flags |
| `GET` | `/flags/:id` | Get a flag by ID |
| `PATCH` | `/flags/:id` | Update description/enabled/defaultValue |
| `DELETE` | `/flags/:id` | Delete a flag |
| `PUT` | `/flags/:id/rules` | Set targeting rules |
| `PUT` | `/flags/:id/rollout` | Set percentage rollout |

### Evaluation & Experiments
| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/evaluate/:key` | Evaluate a flag for a user (logs exposure) |
| `POST` | `/outcomes` | Log a conversion event |
| `GET` | `/experiments/:key/stats?event=` | Per-variant exposure/conversion stats |

### Segments
| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/segments` | Create a segment |
| `GET` | `/segments` | List all segments |
| `GET` | `/segments/:id` | Get a segment by ID |
| `PUT` | `/segments/:id` | Update segment conditions |
| `DELETE` | `/segments/:id` | Delete a segment |

### System
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/health` | No | Postgres + Redis health check |
| `GET` | `/stream` | Yes | SSE stream of flag changes |
| `GET` | `/audit-log` | Yes | Last 50 audit entries |
| `GET` | `/audit-log/:type/:id` | Yes | Audit entries for a specific entity |

## Dashboard

The management dashboard provides:

- **Flags list** — View all flags with status, rollout percentage, and last updated time
- **Flag detail** — Rollout slider, targeting rules editor, experiment stats viewer, activity log
- **Segments** — Create, view, and edit user segments with a condition builder
- **Real-time toggle** — Enable/disable flags instantly with optimistic UI updates
- **Delete** — Remove flags and segments with confirmation dialogs

## SDK Usage

```typescript
import { FeatureFlagClient } from './src/sdk/client';

const client = new FeatureFlagClient({ baseUrl: 'http://localhost:3000' });
await client.start(); // Fetches all flags + connects SSE stream

const enabled = client.evaluate('dark-mode', {
  userId: 'user-123',
  attributes: { plan: 'pro', country: 'IN' },
});

// When done:
client.stop();
```

The SDK evaluates flags locally (zero network calls per evaluation), subscribes to real-time updates via SSE, and falls back to polling with automatic reconnection if the stream drops.

## Testing

All 60 tests run against real Postgres and Redis containers via Docker — no mocks for persistence or caching. The evaluation engine and SDK are pure unit tests with no external dependencies.

```bash
npm test
```

## Project Structure

```
feature-flag-platform/
├── src/
│   ├── server.ts              # Fastify API with all routes
│   ├── index.ts               # Entry point
│   ├── config.ts              # Environment config
│   ├── types/index.ts         # Domain types and interfaces
│   ├── services/
│   │   ├── evaluation.ts      # Flag evaluation engine
│   │   └── evaluation.test.ts # Evaluation tests
│   ├── repositories/
│   │   ├── pgFlagStore.ts     # Postgres flag persistence
│   │   ├── cachedFlagStore.ts # Redis cache layer
│   │   ├── store.ts           # In-memory store (tests)
│   │   ├── segmentStore.ts    # Segment persistence
│   │   ├── experimentStore.ts # Exposure/outcome tracking
│   │   └── auditStore.ts      # Audit log persistence
│   └── sdk/client.ts          # Node SDK
├── dashboard/                  # React + Vite dashboard
│   └── src/
│       ├── App.tsx            # Flags list page
│       ├── FlagDetail.tsx     # Flag detail + rules + rollout
│       ├── Segments.tsx       # Segments list
│       ├── SegmentDetail.tsx  # Segment condition editor
│       └── api.ts             # API client helper
├── db/schema.sql              # Database schema
├── docker-compose.yml         # Local Postgres + Redis
└── .github/                   # CI configuration
```