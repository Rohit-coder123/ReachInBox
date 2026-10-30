# ReachInbox – Production Grade Full Stack Email Scheduler

[![Architecture: Clean Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-blue.svg)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
[![Frontend: Next.js 15 App Router](https://img.shields.io/badge/Frontend-Next.js%2015%20App%20Router-black.svg)](https://nextjs.org/)
[![React: 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Queue: BullMQ + Redis](https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-red.svg)](https://bullmq.io/)
[![Search: Elasticsearch 8](https://img.shields.io/badge/Search-Elasticsearch%208-yellow.svg)](https://www.elastic.co/)
[![Database: PostgreSQL + Prisma](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Prisma-336791.svg)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ReachInbox is an enterprise-grade, distributed email scheduling platform engineered to schedule and deliver thousands of emails reliably while respecting strict rate limits, surviving server restarts and network crashes, and delivering a modern SaaS experience.

---

## 1. System Architecture

ReachInbox follows **Clean Architecture** principles with strict separation of concerns across presentation, domain logic, and persistence layers.

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (Next.js 15 + React 19 + Tailwind CSS)"]
        UI["Dashboard / Composer / Scheduled / Sent / Queue Monitor / Search / Settings"]
        Zustand["Zustand Store (Auth & Local State)"]
        ReactQuery["TanStack React Query v5 (Server State & Polling)"]
        UI --> Zustand
        UI --> ReactQuery
    end

    subgraph API["Backend API Gateway (Express.js + TypeScript)"]
        Middleware["Security (Helmet, CORS, Express RateLimiter, RequestId)"]
        AuthModule["Auth Module (Google OAuth 2.0 / JWT Cookies)"]
        CampModule["Campaign & File Parsing Module (CSV/TXT RFC-5322 Validator)"]
        SchedModule["BullMQ Scheduler & Next-Hour Rollover Engine"]
        SearchModule["Elasticsearch 8 Engine (Edge-NGram Autocomplete)"]
        SlackModule["Slack Alerting Engine (OAuth & Incoming Webhooks)"]
        
        Middleware --> AuthModule
        Middleware --> CampModule
        Middleware --> SchedModule
        Middleware --> SearchModule
        Middleware --> SlackModule
    end

    subgraph Storage["Persistence & Broker Layer"]
        PG[("PostgreSQL\n(Prisma ORM)")]
        RedisBroker[("Redis Broker\n(AOF Persistence & Rate Counters)")]
        ESCluster[("Elasticsearch 8\n(Full-Text & Autocomplete Index)")]
    end

    subgraph Workers["Distributed Execution Pool"]
        WorkerPool["BullMQ Worker Pool (Configurable Concurrency)"]
        DLQ["Dead Letter Queue (DLQ)\n(Exponential Backoff Max 5 Retries)"]
        NodemailerClient["Nodemailer (Ethereal SMTP / Multi-Sender)"]
        
        WorkerPool --> NodemailerClient
        WorkerPool --> DLQ
    end

    subgraph External["External Services"]
        GoogleOAuth["Google Cloud OAuth 2.0"]
        SlackAPI["Slack Incoming Webhook / Bot API"]
        EtherealSMTP["Ethereal SMTP Servers"]
    end

    ReactQuery -->|"REST / Bearer JWT"| Middleware
    CampModule --> PG
    SchedModule -->|"Delayed Jobs"| RedisBroker
    SchedModule --> PG
    WorkerPool -->|"Fetch Delayed Jobs"| RedisBroker
    WorkerPool -->|"Update Status"| PG
    WorkerPool -->|"Index Document"| ESCluster
    SearchModule --> ESCluster
    SchedModule -->|"Trigger Threshold"| SlackModule
    SlackModule --> SlackAPI
    AuthModule --> GoogleOAuth
    NodemailerClient --> EtherealSMTP
```

---

## 2. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ EmailCampaign : "creates"
    User ||--o| SlackIntegration : "configures"
    User ||--o{ AuditLog : "triggers"
    EmailCampaign ||--o{ EmailRecipient : "contains"
    EmailCampaign ||--o{ ScheduledEmail : "dispatches"
    ScheduledEmail ||--o{ QueueLog : "records"

    User {
        string id PK "UUID"
        string googleId UK "Google Subject ID"
        string email UK "Indexed"
        string name
        string avatar
        string role "USER | ADMIN"
        datetime createdAt
        datetime updatedAt
    }

    EmailCampaign {
        string id PK "UUID"
        string userId FK
        string title
        string subject
        text htmlBody
        string senderEmail
        string status "DRAFT | SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED"
        datetime scheduledAt
        int delaySeconds "Inter-email delay"
        int hourlyLimit "Max emails per hour"
        int totalRecipients
        int sentCount
        int failedCount
        datetime createdAt
    }

    ScheduledEmail {
        string id PK "UUID"
        string campaignId FK
        string recipientEmail "Indexed"
        string recipientName
        string subject
        text htmlBody
        string senderEmail "Indexed"
        string status "PENDING | QUEUED | DELAYED | PROCESSING | SENT | FAILED"
        string bullJobId UK "Redis Delayed Job ID"
        datetime scheduledAt "Composite Indexed"
        datetime sentAt
        int attemptCount
        int maxAttempts
        string lastError
        string messageId
        string etherealUrl
    }

    EmailRecipient {
        string id PK "UUID"
        string campaignId FK
        string email "Indexed"
        string name
        boolean isValid
        datetime createdAt
    }

    SlackIntegration {
        string id PK "UUID"
        string userId FK UK
        string teamId
        string teamName
        string channelName
        string webhookUrl
        string accessToken
        boolean isConnected
        boolean alertOnRateLimit
        boolean alertOnFailure
    }

    QueueLog {
        string id PK "UUID"
        string scheduledEmailId FK
        string bullJobId "Indexed"
        string event "ENQUEUED | ROLLOVER | PROCESSING | COMPLETED | DLQ"
        string level "INFO | WARN | ERROR"
        string message
        json details
        datetime createdAt "Indexed"
    }

    AuditLog {
        string id PK "UUID"
        string userId FK
        string action
        string entity
        string entityId
        json metadata
        datetime createdAt "Indexed"
    }
```

---

## 3. Folder Structure

```
ReachInBox/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma              # Production relational schema with 7 models
│   ├── src/
│   │   ├── config/                    # Validated env (Zod), Redis, Elasticsearch, Swagger
│   │   ├── database/                  # Prisma Client singleton with connection hooks
│   │   ├── middleware/                # Helmet, CORS, JWT Auth, Error Handler, RateLimiter
│   │   ├── modules/
│   │   │   ├── auth/                  # Google OAuth 2.0 Strategy, JWT session service, Controller
│   │   │   ├── campaign/              # Campaign creation, recipient file parser, Service, Controller
│   │   │   ├── email/                 # Email history, Nodemailer Ethereal service, Controller
│   │   │   ├── queue/                 # Queue stats, pause/resume/retry controller
│   │   │   ├── search/                # Elasticsearch Edge-NGram service, autocomplete, Controller
│   │   │   ├── settings/              # Engine settings (rate limits, sender defaults) Controller
│   │   │   └── slack/                 # Slack OAuth, webhook dispatch, rate-limit alert service
│   │   ├── queue/
│   │   │   ├── email.queue.ts         # BullMQ queue & DLQ definitions with exponential backoff
│   │   │   └── bull-board.ts          # Bull-Board Express dashboard integration
│   │   ├── scheduler/
│   │   │   └── email.scheduler.ts     # Delayed jobs calculation & Next-Hour Rollover Engine
│   │   ├── workers/
│   │   │   └── email.worker.ts        # Distributed BullMQ Worker, DLQ handler, ES sync
│   │   ├── routes/                    # Express route registrations
│   │   ├── shared/                    # ApplicationError classes, standard ApiResponse
│   │   ├── utils/                     # Winston logger, RFC-5322 EmailParser
│   │   ├── app.ts                     # Express application factory
│   │   └── server.ts                  # Server entry point with graceful shutdown
│   ├── tests/
│   │   ├── api.test.ts                # API integration & health tests
│   │   ├── email-parser.test.ts       # CSV/TXT parser and duplicate detection tests
│   │   └── scheduler.test.ts          # Rate limit calculation & rollover tests
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── compose/page.tsx       # Composer (CSV dropzone, live metrics, scheduling)
│   │   │   ├── dashboard/page.tsx     # Overview metrics, delivery rate, recent activity
│   │   │   ├── login/page.tsx         # Google OAuth & instant demo login
│   │   │   ├── profile/page.tsx       # User identity & cryptographic session details
│   │   │   ├── queue/page.tsx         # 8 metric cards, pause/resume, DLQ, real-time event logs
│   │   │   ├── scheduled/page.tsx     # Scheduled emails table, search, filters, cancel action
│   │   │   ├── search/page.tsx        # Elasticsearch instant autocomplete & query engine
│   │   │   ├── sent/page.tsx          # Delivered emails with Ethereal preview links
│   │   │   ├── settings/page.tsx      # Slack OAuth/webhook, rate limit tuning, SMTP config
│   │   │   └── layout.tsx             # ThemeProvider, React Query, Toaster
│   │   ├── components/
│   │   │   ├── layout/                # Sidebar, Header, AppShell, ThemeToggle
│   │   │   └── ui/                    # Button, Card, Badge, Input, Label, Skeleton
│   │   ├── services/
│   │   │   └── api.ts                 # Axios client with interceptors
│   │   ├── store/
│   │   │   └── authStore.ts           # Zustand authentication store
│   │   └── styles/
│   │       └── globals.css            # TailwindCSS theme tokens
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
│
├── docker-compose.yml                 # Orchestrates frontend, backend, postgres, redis, elasticsearch
└── README.md
```

---

## 4. Setup & Quickstart Guide

### Prerequisites
- Node.js >= 20.x
- Docker and Docker Compose (for containerized execution)
- Git

### One-Command Launch (Docker Compose)
To start all 5 services (`frontend`, `backend`, `postgres`, `redis`, `elasticsearch`):
```bash
docker compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend REST API: `http://localhost:5000`
- Swagger Documentation: `http://localhost:5000/api/docs`
- Bull-Board Queue Dashboard: `http://localhost:5000/admin/queues`

---

### Local Development Setup

#### 1. Backend Setup
```bash
cd backend
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma Client
npx prisma generate

# Run database migrations or push schema
npx prisma db push

# Run unit and integration tests
npm test

# Start backend development server
npm run dev
```

#### 2. Frontend Setup
```bash
cd frontend
npm install

# Setup environment variables
cp .env.example .env.local

# Run Next.js 15 development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend listening port | `5000` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/reachinbox` |
| `REDIS_HOST` | Redis host for BullMQ | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `ELASTICSEARCH_NODE` | Elasticsearch cluster endpoint | `http://localhost:9200` |
| `JWT_SECRET` | Signing secret for JWT access tokens | `super_secret_jwt_key_32_chars_min` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your_id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret | `your_secret` |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI | `http://localhost:5000/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack OAuth App Client ID | `your_slack_client_id` |
| `SLACK_CLIENT_SECRET` | Slack OAuth App Secret | `your_slack_client_secret` |
| `DEFAULT_SLACK_WEBHOOK_URL`| Fallback Slack incoming webhook | `""` |
| `MAX_EMAILS_PER_HOUR` | Global limit across all campaigns | `200` |
| `MAX_EMAILS_PER_SENDER`| Maximum emails per hour per sender | `50` |
| `EMAIL_DELAY_SECONDS` | Inter-email dispatch spacing | `2` |
| `WORKER_CONCURRENCY` | Parallel BullMQ job workers | `5` |
| `USE_ETHEREAL_EMAIL` | Auto-generate Ethereal test inbox | `true` |

---

## 6. BullMQ Queue Architecture & Rate Limit Rollover

### Delayed Jobs Instead of Crons
Traditional cron libraries (`node-cron`, `node-schedule`, `agenda`) store timers in Node.js process memory. If the server crashes or restarts, all scheduled jobs are lost.
ReachInbox uses **BullMQ Delayed Jobs** backed by Redis `AOF` (Append-Only File) persistence:
- Jobs survive crashes, restarts, and deployments.
- Exact millisecond delivery timing via Redis Sorted Sets (`zset`).

### Dynamic Next-Hour Rollover Algorithm
When scheduling a campaign:
1. Hourly slots are bucketed as `YYYY-MM-DD-HH`.
2. Redis tracks atomic usage counters:
   - Global hourly counter: `rate:global:<YYYY-MM-DD-HH>`
   - Per-sender hourly counter: `rate:sender:<senderEmail>:<YYYY-MM-DD-HH>`
3. If an hourly slot reaches capacity (`MAX_EMAILS_PER_HOUR` or `MAX_EMAILS_PER_SENDER`):
   - **Zero emails are dropped or failed.**
   - The scheduler dynamically rolls candidate delivery into the next available hour window: `candidateTime = candidateTime + 3600s`, aligned to `00:00`.
   - Preserves recipient queue order.
   - Automatically dispatches a rich Slack alert to the user.
4. Jobs are enqueued with `delay = scheduledDeliveryTime - Date.now()`.

### Dead Letter Queue (DLQ) & Exponential Backoff
- Failed deliveries retry up to **5 times** using exponential backoff:
  - Attempt 1: 5 seconds
  - Attempt 2: 10 seconds
  - Attempt 3: 20 seconds
  - Attempt 4: 40 seconds
  - Attempt 5: 80 seconds
- If all 5 attempts fail, the job is automatically moved to the `email-dlq` (Dead Letter Queue) and flagged as `FAILED` in PostgreSQL.

---

## 7. Elasticsearch 8 Search & Autocomplete

- **Index Name:** `reachinbox-emails`
- **Fields:** `recipient`, `recipientName`, `subject`, `sender`, `status`, `scheduledTime`, `sentAt`
- **Autocomplete Analyzer:** Custom `edge_ngram` filter (min 2, max 20) with lowercase normalization for sub-10ms suggestion queries as the user types.
- **Graceful Fallback:** If the Elasticsearch cluster is offline or starting up, the API automatically falls back to PostgreSQL `ILIKE` queries without crashing.

---

## 8. Architectural Tradeoffs & Decisions

| Decision | Tradeoff Chosen | Reason |
| :--- | :--- | :--- |
| **BullMQ over Kafka/RabbitMQ** | Used BullMQ on Redis | BullMQ natively supports delayed/scheduled jobs and retries with minimal operational overhead compared to Kafka. |
| **Prisma ORM over Raw SQL** | Used Prisma ORM | Provides end-to-end type safety, migration integrity, and clean relations while retaining `$queryRaw` capability. |
| **In-Memory Multer for CSVs** | In-memory buffer parsing | Eliminates disk I/O bottlenecks and temporary file cleanups during high concurrency. |
| **JWT with httpOnly Cookie** | Hybrid Bearer Header & Cookie | Protects against XSS attacks while permitting cross-origin API calls with Bearer tokens. |
| **Next.js 15 App Router** | App Router with React 19 | Server Component performance, instant client-side routing, and modern UI transitions. |

---

## 9. Horizontal Scaling Strategy

1. **Backend Statelessness:** The Express backend contains zero in-memory state. Scale horizontally by running multiple backend pods behind an AWS ALB or Nginx reverse proxy.
2. **Dedicated Worker Pools:** BullMQ worker processes can run on separate, dedicated worker containers independent of the HTTP API server.
3. **Database Read Replicas:** PostgreSQL can use read replicas for high-frequency dashboard queries while routing campaign inserts to the primary instance.
4. **Redis Clustering:** BullMQ supports Redis Cluster or Sentinel for high-availability queue broker fault tolerance.

---

## 10. Deployment Guide

### Frontend on Vercel
1. Push repository to GitHub.
2. Import project into Vercel. Set Root Directory to `frontend`.
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-domain.com`.
4. Deploy!

### Backend on Render / Railway
1. Create a new Web Service from the repository. Set Root Directory to `backend`.
2. Build Command: `npm install && npx prisma generate && npm run build`
3. Start Command: `npm start`
4. Attach PostgreSQL (e.g. Neon) and Redis (e.g. Upstash).
5. Add backend environment variables from `.env.example`.

### Managed Cloud Database & Cache
- **PostgreSQL:** [Neon PostgreSQL](https://neon.tech/) (Serverless Postgres with instant branching).
- **Redis:** [Upstash Redis](https://upstash.com/) (Low-latency serverless Redis for BullMQ).
