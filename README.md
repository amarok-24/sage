# Sage

**One daily brain dump in, six areas of your life organized out.**

Sage is a personal "second brain" assistant. Instead of juggling a habit tracker, a food log, a budgeting app, a sleep journal, and a diary, you type (or paste) one free-form entry describing your day — *"Slept 6.5hrs, kinda restless. Spent $12 on coffee and $40 on groceries. Ran 5k. Journaled about the presentation, felt anxious, 6/10 mood. Skipped meditation again."* — and an AI agent parses it and routes the pieces into the right place automatically.

## The problem

Life-tracking apps force you to context-switch into a different app, a different form, a different mental mode for every domain — one tap for habits, another app for expenses, another for sleep, another for journaling. That friction is why most people abandon tracking within a week. The data people actually want to reflect on (mood, sleep, money, health) lives in six different silos that never talk to each other.

## The solution

Sage collapses that friction to a single input: **the brain dump**. An LLM-based agent reads the unstructured text once and classifies/extracts data across Sage's **6-R Pillar System**:

| Pillar | Domain |
|---|---|
| **R**eflections | Journal entries & mood |
| **R**hythms | Habits & time use |
| **R**esources | Expenses & finances |
| **R**est | Sleep |
| **R**eactions | Somatic/symptom logs |
| **R**eplenish | Nutrition & intake |

The user never has to say which pillar something belongs to — that's the agent's job.

## Architecture

### Monorepo layout

```
sage/
├── client/    React 19 + Vite + TS single-page app (brain dump input, activity feed, dashboards)
├── server/    Node/Express + TS REST API (auth, braindump orchestration, entries, habits, journal, media)
├── shared/    @sage/shared — Zod schemas shared by client & server (single source of truth for API shapes)
└── agent/     Python + Google ADK 2.0 microservice (FastAPI) — the brain-dump parsing agent
```

`client`, `server`, and `shared` are a pnpm workspace (`pnpm-workspace.yaml`). `agent/` is a separate Python project managed with `uv`, generated and maintained with Google's `agents-cli`.

### Request flow for a single brain dump

```
client/   React app — user submits free-text brain dump
   │  POST /api/braindump
   ▼
server/   Node/Express API — forwards the raw text to the agent
   │  POST /process
   ▼
agent/    Python + Google ADK
   │  1. router_agent (LlmAgent, Gemini 3.1 Flash Lite) parses the text into a
   │     structured schema covering all 6 pillars at once
   │  2. Workflow fans out to 7 parallel FunctionNodes, one per domain
   │     (nutrition, expenses, time, habits, sleep, somatic, journal)
   │  3. JoinNode merges the parallel results into one response
   ▼
server/   re-validates the agent's JSON against BrainDumpResponseSchema
   │  (the agent is treated as an untrusted boundary — malformed output
   │   is rejected rather than persisted)
   │  Mongoose
   ▼
MongoDB   Entry / HabitLog documents persisted (embedded instance for local dev)
   │
   ▼
client/   saved entries rendered in the Activity Feed
```

The agent is a real multi-node ADK pipeline (`agent/app/agent.py`) — a router `LlmAgent` plus a fan-out/fan-in `Workflow` graph — not a single prompt call.

## Deployment

The agent service is containerized (`agent/Dockerfile`, Python 3.12-slim via `uv`), with Terraform (`agent/deployment/terraform/`) provisioning Cloud Run and supporting GCP infra (APIs, IAM, storage, telemetry), generated and maintained via `agents-cli infra`. `client` and `server` don't yet have their own deploy configs — see [Setup](#setup--running-locally) to run everything locally instead.

## Agent tooling

- **Skills**: a custom, cross-agent-compatible `git-committer` skill (mirrored under `.claude/skills/`, `.agents/skills/`, `.gemini/skills/`) enforces Conventional Commits formatting on every commit in this repo.
- **Agents CLI**: `agent/` was scaffolded, iterated on, evaluated, and is deployed through Google's `agents-cli` workflow (`install` → `playground` → `eval generate`/`grade` → `deploy`), with `agent/GEMINI.md` as the standing guide for that workflow and `agent/agents-cli-manifest.yaml` tracking the scaffold version.

Security middleware (JWT auth, rate limiting, Zod input/output validation, Helmet/CORS) lives in `server/` — see `Sage_Technical_Design_Document.md` for details.

## Setup — running locally

Requires: Node.js 20+, [pnpm](https://pnpm.io/), Python 3.11–3.13, [`uv`](https://docs.astral.sh/uv/getting-started/installation/), and a Gemini API key ([get one here](https://aistudio.google.com/apikey)).

### 1. Install JS dependencies (client + server + shared)

```bash
pnpm install
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Fill in `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` with any long random strings. Leave `MONGODB_URI` unset — the server auto-starts a persistent embedded MongoDB for local dev (no Docker or local `mongod` needed). Similarly, leave `REDIS_URL` unset — the server auto-starts an in-memory Redis (`redis-memory-server`) for the BullMQ specialist-job queues; set `REDIS_URL` to point at a real instance (Docker, ElastiCache, etc.) for staging/production. Leave `ADK_AGENT_URL` as `http://localhost:8001`.

### 3. Configure the agent

Create `agent/.env` with:
```
GEMINI_API_KEY=your-key-here
```
(Or configure `GOOGLE_CLOUD_PROJECT` + Application Default Credentials to use Vertex AI instead of an API key — see `agent/app/agent.py`.)

**Never commit `agent/.env`** — it's already gitignored; double-check before pushing if you ever move or copy it.

### 4. Install and run the agent (port 8001)

```bash
cd agent
uv sync
uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8001
```

(Alternative for interactive agent-only development: `agents-cli playground`, after `uv tool install google-agents-cli` and `agents-cli install` — see `agent/README.md`.)

### 5. Run the server (port 3000)

```bash
cd server
pnpm dev
```

### 6. Run the client (port 5173)

```bash
cd client
pnpm dev
```

Open `http://localhost:5173`. In development the client auto-logs in as a seeded demo user, so you land straight on the dashboard — submit a brain dump right away. (A production build shows a real Login/Register screen instead — see `Sage_Technical_Design_Document.md` for the auth flow.)

## Testing

```bash
# JS (server/client)
pnpm --filter server test
pnpm --filter client test

# Agent
cd agent && uv run pytest tests/unit tests/integration
```

## Docs

- [`Sage_Product_Requirements_Document.md`](Sage_Product_Requirements_Document.md) — full product spec
- [`Sage_Technical_Design_Document.md`](Sage_Technical_Design_Document.md) — full technical design (data model, API, security, auth)
- [`Sage_Brand_Identity.md`](Sage_Brand_Identity.md) — brand/visual identity
