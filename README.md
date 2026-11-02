# ReachInbox – Enterprise Full-Stack Email Scheduler

[![Architecture: Clean Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-blue.svg)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
[![Frontend: Next.js 15 App Router](https://img.shields.io/badge/Frontend-Next.js%2015%20App%20Router-black.svg)](https://nextjs.org/)
[![React: 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Queue: BullMQ + Redis](https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-red.svg)](https://bullmq.io/)
[![Search: Elasticsearch 8](https://img.shields.io/badge/Search-Elasticsearch%208-yellow.svg)](https://www.elastic.co/)
[![Database: PostgreSQL + Prisma](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Prisma-336791.svg)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ReachInbox is a production-grade, distributed email scheduling platform engineered to schedule and dispatch thousands of personalized emails reliably. It guarantees **zero dropped emails** through dynamic rate-limit rollovers, survives server and container restarts via Redis AOF persistence, and provides an end-to-end SaaS experience with real-time queue observability, sub-10ms Elasticsearch queries, and Slack alerting.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
   - [System Architecture Diagram](#system-architecture-diagram)
   - [How Scheduling Works](#how-scheduling-works)
   - [How Persistence on Restart is Handled](#how-persistence-on-restart-is-handled)
   - [How Rate Limiting & Concurrency are Implemented](#how-rate-limiting--concurrency-are-implemented)
2. [List of Features Implemented](#2-list-of-features-implemented)
   - [Backend Features](#backend-features)
   - [Frontend Features](#frontend-features)
3. [How to Run the Application](#3-how-to-run-the-application)
   - [Method 1: One-Command Launch (Docker Compose)](#method-1-one-command-launch-docker-compose-recommended)
   - [Method 2: Manual Local Setup](#method-2-manual-local-setup)
     - [Running Backend (Express, Redis, DB, BullMQ Worker)](#1-running-the-backend)
     - [Running Frontend (Next.js 15)](#2-running-the-frontend)
4. [Ethereal Email Setup & Environment Variables](#4-ethereal-email-setup--environment-variables)
   - [Ethereal Email Setup](#ethereal-email-setup)
   - [Backend Environment Variables (`backend/.env`)](#backend-environment-variables)
   - [Frontend Environment Variables (`frontend/.env.local`)](#frontend-environment-variables)
5. [Database Schema & ER Diagram](#5-database-schema--er-diagram)
6. [Testing & Verification](#6-testing--verification)

---

## 1. Architecture Overview

### System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (Next.js 15 App Router + React 19 + Tailwind CSS)"]
        UI["Dashboard / Composer / Scheduled / Sent / Queue Engine / Search / Settings / Profile"]
        Zustand["Zustand Store (Session & Token Storage)"]
        ReactQuery["TanStack React Query v5 (Real-time 3s/5s Polling & Cache)"]
        UI --> Zustand
        UI --> ReactQuery
    end

    subgraph API["Backend API Gateway (Express.js + TypeScript)"]
        Middleware["Security Middleware (Helmet, CORS, Express RateLimiter, CookieParser)"]
        AuthModule["Auth Module (Google OAuth 2.0 / Demo JWT Auth)"]
        CampModule["Campaign Module (CSV/TXT Parsing, RFC-5322 Validator, Deduplication)"]
        SchedModule["Email Scheduler & Next-Hour Rollover Engine"]
        SearchModule["Elasticsearch 8 Engine (Edge-NGram Autocomplete & Fuzzy Match)"]
        SlackModule["Slack Alerting Engine (OAuth & Incoming Webhooks)"]
        
        Middleware --> AuthModule
        Middleware --> CampModule
        Middleware --> SchedModule
        Middleware --> SearchModule
        Middleware --> SlackModule
    end

    subgraph Storage["Persistence & Broker Layer"]
        PG[("PostgreSQL 16\n(Prisma ORM - ScheduledEmails, Campaigns, Logs)")]
        RedisBroker[("Redis 7 Broker\n(AOF Persistence & Atomic Rate Bucket Counters)")]
        ESCluster[("Elasticsearch 8\n(reachinbox-emails Edge-NGram Index)")]
    end

    subgraph Workers["Distributed Execution Pool"]
        WorkerPool["BullMQ Email Worker (Configurable Concurrency & Rate Limiter)"]
        DLQ["Dead Letter Queue (DLQ)\n(Exponential Backoff: 5s, 10s, 20s, 40s, 80s)"]
        NodemailerClient["Nodemailer (Ethereal SMTP Sandbox / Multi-Sender)"]
        
        WorkerPool --> NodemailerClient
        WorkerPool --> DLQ
    end

    subgraph External["External Services"]
        GoogleOAuth["Google Cloud Identity (OAuth 2.0)"]
        SlackAPI["Slack Incoming Webhook API"]
        EtherealSMTP["Ethereal SMTP Virtual Mail Server"]
    end

    ReactQuery -->|"REST / Bearer JWT"| Middleware
    CampModule --> PG
    SchedModule -->|"Delayed Jobs"| RedisBroker
    SchedModule --> PG
    WorkerPool -->|"Consume Stream"| RedisBroker
    WorkerPool -->|"Update Status"| PG
    WorkerPool -->|"Index Document"| ESCluster
    SearchModule --> ESCluster
    SchedModule -->|"Threshold Exceeded"| SlackModule
    SlackModule --> SlackAPI
    AuthModule --> GoogleOAuth
    NodemailerClient --> EtherealSMTP
```

---

### How Scheduling Works

Traditional cron jobs (`node-cron`, `setInterval`) store timer callbacks in Node.js heap memory; if the process crashes or scales across containers, all scheduled timers disappear.

ReachInbox implements **BullMQ Delayed Jobs** backed by Redis Sorted Sets (`zset`):
1. **Timestamp Calculation**: When a campaign is submitted, each recipient is assigned an exact delivery timestamp:
   $$\text{DeliveryTime}_i = \text{BaseScheduleTime} + (i \times \text{DelaySeconds})$$
2. **Delay Offset**: The scheduler calculates the exact millisecond offset:
   $$\text{delayMs} = \max(0, \text{DeliveryTime}_i - \text{Date.now()})$$
3. **Queue Enqueueing**: The job is enqueued with a unique deterministic ID (`email-${scheduledEmailId}`) and delayed execution:
   ```typescript
   await emailQueue.add('send-email', jobPayload, {
     delay: delayMs,
     jobId: `email-${emailRecord.id}`,
   });
   ```
4. **State Lifecycle**:
   - `PENDING`: Stored in PostgreSQL awaiting queue assignment.
   - `DELAYED`: Sleeping inside Redis Sorted Sets until its target timestamp arrives.
   - `PROCESSING`: Picked up by the BullMQ worker for SMTP transmission.
   - `SENT`: Delivered successfully with `200 OK` from SMTP, message ID recorded, and synced to Elasticsearch.
   - `FAILED`: Placed in Dead-Letter Queue if all 5 exponential retry attempts fail.

---

### How Persistence on Restart is Handled

ReachInbox ensures 100% crash resilience through dual-layer persistence:

1. **Redis AOF (Append-Only File) Persistence**:
   - Redis is configured with `appendonly yes` and `appendfsync everysec`.
   - Every delayed job, payload, and retry state is persisted to disk. If Docker restarts or the host reboots, Redis reconstructs the exact queue state with millisecond accuracy.
2. **PostgreSQL Relational Ground Truth**:
   - All email dispatches are tracked in the `ScheduledEmail` table with their `bullJobId`, status, scheduled time, and campaign ID.
   - Audit transitions are permanently recorded in the `QueueLog` table.
3. **Automatic Startup State Sync**:
   - On backend boot, `elasticsearchService.syncFromDatabase()` cross-checks PostgreSQL with Elasticsearch and Redis, ensuring zero orphan records and repairing any discrepancies.

---

### How Rate Limiting & Concurrency are Implemented

1. **Atomic Redis Hour Buckets**:
   - Every dispatch hour is bucketed as `YYYY-MM-DD-HH` in UTC.
   - Redis tracks two atomic counters using `.multi().get().exec()`:
     - **Global hourly limit**: `rate:global:<YYYY-MM-DD-HH>`
     - **Per-sender hourly limit**: `rate:sender:<senderEmail>:<YYYY-MM-DD-HH>`
2. **Dynamic Next-Hour Rollover Algorithm**:
   - When a sender reaches `MAX_EMAILS_PER_SENDER` (e.g. 50/hour) or the global system hits `MAX_EMAILS_PER_HOUR` (e.g. 200/hour):
     - **Zero emails are dropped or rejected.**
     - The scheduler dynamically rolls candidate delivery to the top of the next hour window (`00:00:00` UTC).
     - Recipient ordering is preserved.
     - An automatic Slack alert is dispatched alerting operations of the rollover.
3. **Worker Pool Concurrency**:
   - The BullMQ worker is instantiated with a dedicated concurrency pool:
     ```typescript
     this.worker = new Worker(EMAIL_QUEUE_NAME, processJob, {
       connection: redisConnection,
       concurrency: config.scheduler.workerConcurrency, // default 5 parallel async threads
       limiter: {
         max: config.scheduler.maxEmailsPerHour,
         duration: 3600 * 1000,
       },
     });
     ```
   - Multiple emails are processed simultaneously without exceeding the SMTP provider's connection ceiling.

---

## 2. List of Features Implemented

### Backend Features

| Category | Implemented Capabilities |
|---|---|
| **Scheduler** | • Dynamic millisecond delay calculation via BullMQ delayed streams<br>• Job cancellation (`cancelJob`) with immediate Redis and PostgreSQL deletion<br>• Zero-drop next-hour rollover engine<br>• Custom inter-email pacing (`EMAIL_DELAY_SECONDS`) |
| **Persistence** | • Redis AOF disk-backed delayed job broker<br>• PostgreSQL schema managed via Prisma ORM (7 relational models)<br>• Permanent `QueueLog` audit trail for every status transition<br>• Automatic database-to-Elasticsearch bulk synchronization on startup |
| **Rate Limiting** | • Global hourly cap enforcement (`MAX_EMAILS_PER_HOUR`)<br>• Per-sender hourly cap enforcement (`MAX_EMAILS_PER_SENDER`)<br>• Atomic Redis counter increments with 48h TTL<br>• Real-time Slack rate-limit rollover webhook alerts |
| **Concurrency & Workers** | • Configurable worker pool concurrency (`WORKER_CONCURRENCY`, 1x–50x)<br>• Exponential backoff retries (5 attempts: 5s, 10s, 20s, 40s, 80s)<br>• Dead-Letter Queue (`email-dlq`) for unrecoverable failures<br>• Pause & Resume queue controls exposed via REST API |
| **Search Engine** | • Elasticsearch 8 cluster integration (`reachinbox-emails` index)<br>• Custom `edge_ngram` analyzer (min 2, max 20) for sub-10ms autocomplete<br>• Multi-field fuzzy matching (`fuzziness: 'AUTO'`) across recipients & subjects<br>• Automatic fallback to PostgreSQL `ILIKE` if Elasticsearch is offline |
| **Authentication** | • Google OAuth 2.0 via Passport.js with real Google Consent Screen<br>• Instant Developer Demo Sign-In generating signed JWT tokens<br>• Secure httpOnly cookie session management & CSRF protection |

---

### Frontend Features

| Page / Component | Implemented Capabilities |
|---|---|
| **Login (`/login`)** | • Google OAuth 2.0 redirection to `accounts.google.com`<br>• One-click Instant Engineer Demo Sign-In<br>• Client-side session hydration via Zustand store |
| **Dashboard (`/dashboard`)** | • 4 real-time KPI metric cards (Scheduled, Dispatched, Concurrency, DLQ)<br>• Background polling every 5 seconds (`GET /api/queue/stats`)<br>• Quick action shortcuts (Compose, Queue Status, View All) |
| **Compose (`/compose`)** | • Internal campaign name & subject line inputs<br>• Rich HTML body editor with live rendered **Preview** tab<br>• Recipient ingestion via drag-and-drop CSV/TXT file upload or direct text paste<br>• Real-time client-side RFC-5322 regex validation & duplicate detection metrics<br>• Start-time datepicker and customizable inter-email delay setting |
| **Scheduled Queue (`/scheduled`)** | • Interactive delayed queue table with countdown execution times<br>• Live recipient and subject search bar with instant debounce<br>• Status filter pills (`All Active`, `Pending`, `Delayed`, `Queued`, `Failed`)<br>• **Job Cancellation**: One-click cancel button removing jobs from Redis & DB immediately |
| **Sent Emails (`/sent`)** | • Delivered emails table with ISO timestamps and unique SMTP Message IDs<br>• **1-Click "View Preview"**: Opens rendered email inside the Ethereal Mail Sandbox |
| **Queue Engine (`/queue`)** | • 8 live broker KPI cards (Pending, Delayed, Active, Completed, DLQ, Retrying, Pool, Concurrency)<br>• Interactive **Pause Queue** / **Resume Queue** toggle controls<br>• Real-Time Queue Event Audit Trail table with live status badges<br>• Direct button opening the embedded **Bull-Board visual dashboard** (`:5000/admin/queues`) |
| **Global Search (`/search`)** | • Full-text fuzzy search powered by Elasticsearch 8<br>• **Edge-NGram Autocomplete Popover**: 100% opaque dropdown with arrow key navigation & Enter key submission<br>• Typo-tolerant matching (`fuzziness: AUTO`)<br>• Status filter pills and pagination controls (`Page 1 of N`) |
| **Settings (`/settings`)** | • Dynamic rate limit adjustments (`MAX_EMAILS_PER_HOUR`, `MAX_EMAILS_PER_SENDER`, `EMAIL_DELAY_SECONDS`, `WORKER_CONCURRENCY`)<br>• Default outbound sender email and sender name configuration<br>• Slack integration: OAuth connection, Instant Demo Slack Sandbox, and manual Webhook URL input with live **"Send Test Alert"** testing |
| **Profile (`/profile`)** | • Authenticated Google identity details, avatar, and role badges (`ADMIN` / `USER`)<br>• Cryptographic session verification info<br>• Secure **Sign Out** clearing cookies, tokens, and redirecting with protected route enforcement |

---

## 3. How to Run the Application

### Method 1: One-Command Launch (Docker Compose) — *Recommended*

The entire multi-container stack (Next.js frontend, Express backend, PostgreSQL, Redis, Elasticsearch) is orchestrated via Docker Compose.

```bash
# 1. Clone the repository
git clone https://github.com/your-username/reachinbox.git
cd reachinbox

# 2. Start all 5 services with live build
docker compose up --build
```

#### Access Points
| Service | URL |
|---|---|
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) |
| **Backend REST API** | [http://localhost:5000](http://localhost:5000) |
| **Swagger API Documentation** | [http://localhost:5000/api/docs](http://localhost:5000/api/docs) |
| **Bull-Board Queue Dashboard** | [http://localhost:5000/admin/queues](http://localhost:5000/admin/queues) |
| **Health Check Endpoint** | [http://localhost:5000/api/health](http://localhost:5000/api/health) |

---

### Method 2: Manual Local Setup

If running locally without Docker:

#### Prerequisites
- Node.js >= 20.x
- PostgreSQL 16 running on port `5432`
- Redis 7 running on port `6379`
- Elasticsearch 8 running on port `9200` (optional; falls back to PostgreSQL if unavailable)

---

#### 1. Running the Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Generate Prisma Client & push schema to PostgreSQL
npx prisma generate
npx prisma db push

# (Optional) Run test suite to verify scheduler & parser
npm test

# Start the Express API & BullMQ Background Worker
npm run dev
```

*The backend boots on port `5000`. The BullMQ worker starts automatically in the background alongside Express.*

---

#### 2. Running the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Start Next.js 15 development server
npm run dev
```

*Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 4. Ethereal Email Setup & Environment Variables

### Ethereal Email Setup

ReachInbox uses **Ethereal Email** (`ethereal.email`) by default for safe sandbox testing:
- **Zero Manual Setup Required**: When `USE_ETHEREAL_EMAIL=true`, Nodemailer automatically provisions a virtual disposable SMTP test account upon server boot using `nodemailer.createTestAccount()`.
- **Zero Spam Risk**: Outbound emails are captured by the virtual SMTP server and never sent to real recipient inboxes.
- **One-Click Previews**: When an email is dispatched, Nodemailer returns a preview URL via `nodemailer.getTestMessageUrl(info)`. This URL is saved in PostgreSQL (`etherealUrl`) and surfaced as a clickable **"View Preview"** button on the `/sent` page.
- **Custom Production SMTP**: To use a real SMTP service (e.g. AWS SES, SendGrid, Gmail SMTP), simply set `USE_ETHEREAL_EMAIL=false` and provide `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` in `backend/.env`.

---

### Backend Environment Variables

Located at `backend/.env` (and passed to the container in `docker-compose.yml`):

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for Express backend | `5000` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgrespassword@localhost:5432/reachinbox?schema=public` |
| `REDIS_HOST` | Redis hostname for BullMQ | `localhost` (or `redis` in Docker) |
| `REDIS_PORT` | Redis port | `6379` |
| `ELASTICSEARCH_NODE` | Elasticsearch endpoint | `http://localhost:9200` (or `http://elasticsearch:9200` in Docker) |
| `JWT_SECRET` | Secret key for signing JWTs | `super_production_secret_jwt_key_32_chars_reachinbox!` |
| `JWT_EXPIRES_IN` | JWT token validity | `7d` |
| `COOKIE_SECRET` | Secret for signing httpOnly cookies | `super_production_cookie_secret_reachinbox!` |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth Client ID | `your_google_client_id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Client Secret | `your_google_client_secret` |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI | `http://localhost:5000/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack App OAuth Client ID | `your_slack_client_id` (optional) |
| `SLACK_CLIENT_SECRET` | Slack App Secret | `your_slack_client_secret` (optional) |
| `MAX_EMAILS_PER_HOUR` | Global system-wide limit per hour | `200` |
| `MAX_EMAILS_PER_SENDER`| Hourly rate limit per sender address | `50` |
| `EMAIL_DELAY_SECONDS` | Inter-email dispatch spacing | `2` |
| `WORKER_CONCURRENCY` | Number of simultaneous BullMQ threads | `5` |
| `USE_ETHEREAL_EMAIL` | Enable Ethereal sandbox | `true` |

---

### Frontend Environment Variables

Located at `frontend/.env.local`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend REST API base URL | `http://localhost:5000` |
| `NEXT_PUBLIC_SLACK_CLIENT_ID` | Optional Slack Client ID for OAuth | `""` |

---

## 5. Database Schema & ER Diagram

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
        string email UK "Unique Email"
        string name "Full Name"
        string avatar "Profile Image URL"
        string role "USER | ADMIN"
        datetime createdAt
        datetime updatedAt
    }

    EmailCampaign {
        string id PK "UUID"
        string userId FK
        string title "Campaign Name"
        string subject "Email Subject"
        text htmlBody "Rich HTML Content"
        string senderEmail "Sender Address"
        string status "DRAFT | SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED"
        datetime scheduledAt "Scheduled Delivery Start"
        int delaySeconds "Inter-Email Delay Pacing"
        int hourlyLimit "Hourly Cap"
        int totalRecipients
        int sentCount
        int failedCount
        datetime createdAt
    }

    ScheduledEmail {
        string id PK "UUID"
        string campaignId FK
        string recipientEmail "Target Email (Indexed)"
        string recipientName
        string subject
        text htmlBody
        string senderEmail "Sender (Indexed)"
        string status "PENDING | QUEUED | DELAYED | PROCESSING | SENT | FAILED"
        string bullJobId UK "Redis Delayed Job ID"
        datetime scheduledAt "Target Execution Time"
        datetime sentAt "Actual Dispatch Time"
        int attemptCount
        int maxAttempts
        string messageId "SMTP Message ID"
        string etherealUrl "Ethereal Preview URL"
    }

    EmailRecipient {
        string id PK "UUID"
        string campaignId FK
        string email "Recipient Email"
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
        string bullJobId "BullMQ Job ID"
        string event "ENQUEUED | ROLLOVER | PROCESSING | COMPLETED | DLQ"
        string level "INFO | WARN | ERROR"
        string message
        json details
        datetime createdAt "Timestamp"
    }

    AuditLog {
        string id PK "UUID"
        string userId FK
        string action "Event Type"
        string entity "Affected Model"
        string entityId "Model UUID"
        json metadata
        datetime createdAt
    }
```

---

## 6. Testing & Verification

The backend includes a comprehensive **Jest test suite** testing the CSV/TXT recipient parser, RFC-5322 regex validation, duplicate detection, hourly rate limit rollovers, and API health endpoints.

```bash
# Run all backend unit & integration tests
npm --prefix backend test
```

### Verified Test Output
```text
PASS tests/api.test.ts
  API Integration Tests
    ✓ GET / should return 200 with service information
    ✓ GET /api/health should return UP status
    ✓ GET /api/non-existent-route should return 404

PASS tests/scheduler.test.ts
  EmailScheduler Rate Limiting & Rollover Logic
    ✓ should format UTC hour keys consistently
    ✓ should calculate inter-email delay correctly
    ✓ should roll over timestamp into next full hour when limit reached

PASS tests/email-parser.test.ts
  EmailParser Unit Tests
    ✓ should parse valid emails from CSV format with headers
    ✓ should detect and remove duplicate emails
    ✓ should flag malformed email addresses
    ✓ should handle semicolon and tab delimited content

Test Suites: 3 passed, 3 total
Tests:       10 passed, 10 total
Snapshots:   0 total
```

---

## 7. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
