# Pulse

Privacy-first, self-hosted web analytics. Track pageviews, custom events, and uptime across multiple sites — without cookies and with full respect for Do Not Track.

## Features

- **Multi-site analytics** — manage multiple websites under one organization with role-based access (owner / admin / viewer)
- **Pageview & event tracking** — lightweight script (`t.js`) that supports SPAs, `sendBeacon`, and works cross-origin
- **Dashboard** — overview, pages, events, acquisition, and technology breakdowns with interactive charts
- **Goals, funnels & revenue** — conversion tracking, funnel drop-off, and ecommerce revenue attribution
- **Uptime monitoring** — periodic HTTP health checks with incidents, alerts, and public status pages
- **Performance monitoring** — optional Core Web Vitals collection for real-user page health
- **AI assistant & insights** — ask natural-language questions and generate proactive findings
- **Auth** — email/password and Google OAuth via NextAuth v5
- **Docker-ready** — standalone Next.js build with a multi-stage Dockerfile and Compose file
- **Privacy by default** — no cookies, DNT respected, data stays on your server

- **Agent access** - scoped, revocable API tokens plus MCP tools for AI agents and custom report workflows

## Tech Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Framework | Next.js 16 (App Router, standalone output)      |
| UI        | React 19, Framer Motion, Recharts, Three.js     |
| Auth      | NextAuth v5 (JWT sessions)                      |
| Database  | PostgreSQL via Prisma 6                          |
| AI        | OpenAI-compatible SDK, Anthropic Messages API, MCP |
| Runtime   | Node 20                                         |

## Getting Started

### Prerequisites

- **Node.js 20+**
- **PostgreSQL** instance

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in at least:

| Variable             | Description                                     |
| -------------------- | ----------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                    |
| `NEXTAUTH_SECRET`    | Random secret (`openssl rand -base64 32`)       |
| `NEXTAUTH_URL`       | App URL (e.g. `http://localhost:3000`)           |
| `NEXT_PUBLIC_APP_URL`| Same as above (used client-side)                |

Optional variables:

| Variable              | Description                                    |
| --------------------- | ---------------------------------------------- |
| `GOOGLE_CLIENT_ID`    | Google OAuth client ID                         |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                    |
| `PULSE_AI_PROVIDER`   | `openai`, `anthropic`, or `perplexity` for the in-app assistant |
| `OPENAI_API_KEY`      | Enables OpenAI for the AI assistant            |
| `ANTHROPIC_API_KEY`   | Enables Anthropic for the AI assistant         |
| `PERPLEXITY_API_KEY`  | Enables Perplexity Sonar for the AI assistant  |
| `PULSE_MCP_RESOURCE_URL` | Public MCP resource URL, usually `https://your-pulse-host/api/mcp` |
| `REDIS_URL`           | Enables MCP SSE transport in addition to Streamable HTTP |
| `UPTIME_CHECK_SECRET` | Bearer token for the uptime cron endpoint      |
| `INSIGHTS_CRON_SECRET` | Bearer token for the insights cron endpoint   |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Enables email alert channels |

### 3. Set up the database

```bash
npx prisma migrate dev
```

Optionally seed demo data (creates `demo@pulse.dev` / `password123` with sample pageviews and events):

```bash
npm run db:seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

### Option A — Node

```bash
npm run build
npm run start
```

### Option B — Docker

```bash
docker compose up -d --build
```

The app is served on port **3010** by default (mapped from container port 3000). Make sure `DATABASE_URL` and the other required env vars are set — the Compose file reads them from your environment or `.env`.

> **Note:** The Compose file only runs the app. You need to provide your own PostgreSQL instance and run `prisma migrate deploy` against the production database before starting.

## Tracker Script

Add the following snippet to any site you want to track:

```html
<script defer src="https://your-pulse-host/t.js" data-token="SITE_TOKEN"></script>
```

- `data-token` — the site token shown in your Pulse dashboard under **Settings > Sites**
- `data-endpoint` (optional) — override the collection URL if it differs from the script origin
- `data-web-vitals="true"` (optional) — collect Core Web Vitals when the site setting is enabled

Custom events can include revenue metadata:

```html
<script>
  window.pulse('event', 'purchase', {
    value: 49,
    currency: 'USD',
    orderId: 'ord_123'
  });
</script>
```

## Uptime Monitoring

Trigger uptime checks via a cron job or external scheduler:

```bash
curl -X POST https://your-pulse-host/api/uptime/check \
  -H "Authorization: Bearer $UPTIME_CHECK_SECRET"
```

Generate proactive insights with a cron job:

```bash
curl -X POST https://your-pulse-host/api/insights/generate \
  -H "Authorization: Bearer $INSIGHTS_CRON_SECRET"
```

## Agent and MCP Access

Pulse exposes read-only analytics to external agents without giving them database access.

1. In the dashboard, go to **Settings > Agent Tokens**.
2. Create a token scoped to an organization or one site.
3. Copy the token immediately; Pulse stores only a SHA-256 hash.
4. Give the token to your agent as a Bearer token.

Supported scopes:

| Scope | Allows |
| ----- | ------ |
| `analytics:read` | Overview, pages, and acquisition reports |
| `events:read` | Custom event reports |
| `uptime:read` | Uptime reports and summaries |
| `reports:generate` | Multi-report bundles for custom reports and charts |

### MCP

Use Streamable HTTP at:

```text
https://your-pulse-host/api/mcp
```

Set the Authorization header:

```text
Authorization: Bearer pulse_at_...
```

Registered MCP tools:

- `get_overview`
- `get_pages_report`
- `get_events_report`
- `get_acquisition_report`
- `get_uptime_summary`
- `generate_report_data`

OAuth protected-resource metadata is available at:

```text
https://your-pulse-host/.well-known/oauth-protected-resource
```

If you need the older HTTP/SSE MCP transport, configure `REDIS_URL`; the SSE endpoint is `/api/sse`.

### Scoped REST Reports

Agents that do not speak MCP can call REST report endpoints with the same Bearer token:

```bash
curl "https://your-pulse-host/api/agent/reports/overview?siteId=SITE_ID" \
  -H "Authorization: Bearer pulse_at_..."
```

Available report names are `overview`, `pages`, `events`, `acquisition`, `uptime`, and `uptime_summary`.

Generate a multi-report payload:

```bash
curl -X POST "https://your-pulse-host/api/agent/reports/generate" \
  -H "Authorization: Bearer pulse_at_..." \
  -H "Content-Type: application/json" \
  -d '{"siteId":"SITE_ID","reports":["overview","events","uptime_summary"]}'
```

## AI Provider BYOK

The in-app assistant uses the provider configured by `PULSE_AI_PROVIDER`. For self-hosted installs, each business should use its own provider keys:

- OpenAI: `PULSE_AI_PROVIDER=openai`, `OPENAI_API_KEY`, optional `OPENAI_MODEL`
- Anthropic: `PULSE_AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`
- Perplexity: `PULSE_AI_PROVIDER=perplexity`, `PERPLEXITY_API_KEY`, optional `PERPLEXITY_MODEL`

External agents can also ignore Pulse's in-app assistant and connect directly to `/api/mcp` with their own OpenAI, Anthropic, or Perplexity account.

## Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `npm run dev`      | Start dev server                   |
| `npm run build`    | Production build                   |
| `npm run start`    | Start production server            |
| `npm run lint`     | Run ESLint                         |
| `npm run test`     | Run Vitest unit tests              |
| `npm run db:generate` | Generate Prisma client          |
| `npm run db:push`  | Push schema without migrations     |
| `npm run db:migrate` | Run Prisma migrations (dev)      |
| `npm run db:studio` | Open Prisma Studio                |
| `npm run db:seed`  | Seed demo data                     |

## Project Structure

```
pulse/
├── prisma/             # Schema, migrations, seed script
├── public/             # Static assets including tracker (t.js)
├── src/
│   ├── app/
│   │   ├── (auth)/     # Login & register pages
│   │   ├── (dashboard)/# Analytics dashboard pages
│   │   ├── api/        # API routes (collect, reports, auth, chat, uptime)
│   │   └── onboarding/ # First-run org setup
│   ├── components/     # UI components (dashboard, 3D, motion, shared)
│   ├── lib/            # Auth, Prisma client, validation, utilities
│   └── types/          # Shared TypeScript types
├── Dockerfile          # Multi-stage production build
├── docker-compose.yaml # App service definition
└── .env.example        # Environment variable template
```

## License

This project is private. See the repository for license details.
