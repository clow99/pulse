# Pulse

Privacy-first, self-hosted web analytics. Track pageviews, custom events, and uptime across multiple sites — without cookies and with full respect for Do Not Track.

## Features

- **Multi-site analytics** — manage multiple websites under one organization with role-based access (owner / admin / viewer)
- **Pageview & event tracking** — lightweight script (`t.js`) that supports SPAs, `sendBeacon`, and works cross-origin
- **Dashboard** — overview, pages, events, acquisition, and technology breakdowns with interactive charts
- **Uptime monitoring** — periodic HTTP health checks for each site with status history
- **AI assistant** — ask natural-language questions about your analytics (powered by OpenAI)
- **Auth** — email/password and Google OAuth via NextAuth v5
- **Docker-ready** — standalone Next.js build with a multi-stage Dockerfile and Compose file
- **Privacy by default** — no cookies, DNT respected, data stays on your server

## Tech Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Framework | Next.js 16 (App Router, standalone output)      |
| UI        | React 19, Framer Motion, Recharts, Three.js     |
| Auth      | NextAuth v5 (JWT sessions)                      |
| Database  | PostgreSQL via Prisma 6                          |
| AI        | OpenAI SDK                                      |
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
| `OPENAI_API_KEY`      | Enables the AI assistant                       |
| `UPTIME_CHECK_SECRET` | Bearer token for the uptime cron endpoint      |

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

## Uptime Monitoring

Trigger uptime checks via a cron job or external scheduler:

```bash
curl -X POST https://your-pulse-host/api/uptime/check \
  -H "Authorization: Bearer $UPTIME_CHECK_SECRET"
```

## Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `npm run dev`      | Start dev server                   |
| `npm run build`    | Production build                   |
| `npm run start`    | Start production server            |
| `npm run lint`     | Run ESLint                         |
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
