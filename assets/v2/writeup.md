# Title
Sage: grow your awareness

# Subtitle
An AI agent that reads your unstructured daily notes, routes them into journal, time, habits, expenses, sleep, symptoms, and nutrition — and quietly starts noticing patterns across all of them

# Submission track
Concierge agent

# Description

## Problem Statement

Most people who try to track their life — time, habits, spending, sleep, mood, symptoms, food — quit within a week. Not because they don't care, but because of friction: every domain lives in a different app, with a different form, a different set of taps. Logging "I ran 5k, slept badly, spent $40 on groceries, and felt anxious about tomorrow's presentation" today means opening four or five different apps and re-entering that same sentence four or five different ways.

That friction is the actual product problem. The data people want — *how does my sleep affect my mood? where is my money actually going? which habits am I actually keeping?* — only becomes visible if the logging happens consistently enough to accumulate. Consistency requires the lowest possible friction: one input, however messy, however unstructured.

## Why Agents

This is a problem that's a poor fit for a traditional form-based app and a great fit for an agent. A form asks the user to already know the taxonomy ("which category is this?"); an agent can *infer* it. The task is fundamentally one of understanding unstructured natural language and mapping it onto multiple, independent structured schemas at once — extraction, classification, and routing in a single step, done automatically instead of by the user.

Concretely, an agent is the right abstraction because:
- **The input is genuinely unstructured.** A brain dump can mention zero, one, or all six domains in any order, with information density that varies wildly per entry.
- **The output requires structured, schema-conformant extraction**, not free text — a good fit for an LLM agent constrained to an output schema, rather than a classic chatbot.
- **The domains are independent of each other** once the router has parsed intent, which maps naturally onto a fan-out/fan-in agent workflow rather than one monolithic prompt trying to do everything serially.
- **The value compounds asynchronously.** Once entries exist, a second layer of specialist agents can look back across them — correlating sleep with mood, spending with stress, symptoms with diet — work that has no business blocking the user's original submission.

## Solution: The 6-R Pillar System

Sage organizes a person's life into six pillars, and a single agent pipeline routes every brain dump across all of them simultaneously:

- **Reflections** — journal entries & mood
- **Rhythms** — habits & time use
- **Resources** — expenses & finances
- **Rest** — sleep
- **Reactions** — somatic/symptom logs
- **Replenish** — nutrition & intake

The user never has to say which pillar something belongs to — that's the agent's job. Nothing the user didn't mention gets invented — the router agent is explicitly instructed not to fabricate fields it can't ground in the text.

## Architecture

```
┌─────────────────────────┐        raw input         ┌─────────────────────────┐
│  client/ (React + Vite) │ ───────────────────────> │  server/ (Node/Express) │
│  optimistic UI, persisted│ <─────────────────────── │   main orchestrator     │
│  feed, async insights    │    structured response   └─────────────────────────┘
└─────────────────────────┘                            ▲    │           │
                                       read entries /    │    │ forward      │ invoke
                                       insights           │    │ payload      │ agent tools
                                                          │    ▼           ▼
                                                    ┌───────────┐ ┌─────────────────────────┐
                                                    │  MongoDB  │ │  agent/ (Python + ADK)  │
                                                    │(Mongoose) │ │           │             │
                                                    └───────────┘ │           ▼             │
                                                          ▲       │        Gemini           │
                                                          │       └─────────────────────────┘
                                                    ┌───────────────────┐
                                                    │  BullMQ / Redis   │
                                                    │  specialist queue │
                                                    └───────────────────┘
```

The agent (`agent/app/agent.py`) is a Google ADK **`Workflow`** graph, not a single LLM call:

1. A `router_agent` (`LlmAgent`, Gemini 3.1 Flash Lite, JSON-schema-constrained output) reads the brain dump and extracts a `SageAgentOutput` covering all six pillars at once.
2. The router's output fans out to **seven parallel `FunctionNode`s** — one processor per domain (nutrition, expenses, time, habits, sleep, somatic, journal) — each only doing work if its slice of the router's output is non-empty.
3. A `JoinNode` merges the parallel results back into one combined event.

The Express server (`server/src/services/agent.service.ts`) calls this agent over HTTP, and — importantly — **re-validates the agent's JSON response against a shared Zod schema** (`BrainDumpResponseSchema`) before persisting anything. The agent is treated as an untrusted boundary: if it hallucinates a malformed shape, the server rejects it rather than writing bad data to Mongo. Validated entries are persisted as `Entry`/`HabitLog` documents, stamped with the user's *logical local date* — computed from their stored IANA timezone (`server/src/utils/timezone.ts`), not the server's own clock, so a brain dump logged at 11pm in Mumbai and one logged at 11pm in New York both land on the correct calendar day for that user, no matter where the process happens to be running.

That synchronous path is only half the pipeline. Saving an entry also enqueues work onto a second, asynchronous layer:

- **Per-entry specialists** (`sleep-analyze`, `somatic-correlate`, `journal-enrich`) fire immediately after a matching entry is saved, attaching a focused analysis (e.g. a sleep-quality recommendation, a possible symptom correlation) back onto that entry.
- **Daily specialists** (`expense-analyze`, `time-analyze`) run once per user at their own local end-of-day, comparing the day's activity against a rolling baseline.
- **A weekly synthesizer** (`insight-synthesize`) runs once per user at their local week's end, reading back a full week of entries across every pillar and producing one cross-domain "here's what I noticed" summary.

All of this runs on BullMQ over Redis (`redis-memory-server` auto-starting an embedded instance for local dev, mirroring the same zero-config pattern as the embedded Mongo) — entirely decoupled from the request/response cycle that created the underlying entries. A dedicated `GET /api/dashboard/insights` endpoint surfaces whatever specialist output has accumulated so far; the client polls it independently of the main feed, so insights simply *appear* once they exist, with no loading state blocking anything else.

Client, server, and a shared Zod schema package (`@sage/shared`) form a pnpm workspace; the agent is a separate Python/`uv` project so it can be developed, tested, and deployed independently of the JS stack.

## Product Experience

The interface (internally "Nova") is a single glassmorphic composer over a soft violet-to-cyan gradient, in either a light or dark theme, built to feel like a quiet, focused space rather than a dashboard full of widgets:

- **Optimistic, non-blocking submission.** The moment a brain dump is sent, it appears in the feed immediately in a pending state ("Sage is reading this one...") while the agent pipeline works in the background — the composer is free to accept the next entry right away rather than making the user wait on one round trip before starting another.
- **A feed that survives a refresh.** Entries are hydrated from `GET /api/dashboard/today` on load, so a page reload — or coming back the next morning — doesn't silently lose the day's activity the way a purely client-side optimistic state would.
- **Graceful, recoverable failure.** If the agent call fails, the entry doesn't vanish — it turns into an inline card with the original text and a one-tap Retry, plus a toast pointing the user at it. Nothing typed is ever silently lost.
- **An insights panel that earns its place.** Rather than a stats page nobody opens, cross-pillar analysis surfaces directly in the main feed: a weekly "top insight" card with a celebration and a growth area, plus focused cards for sleep, symptom, spending, and time patterns whenever the async specialists have something to say.
- **Voice, when typing isn't convenient.** The composer supports live dictation via the Web Speech API for hands-free logging.

## Why the Insights Compound

A single brain dump only ever states a fact: slept 7 hours, spent $45, felt anxious. A *pattern* — sleep quality tracking with next-day mood, spending drifting upward on stressful days, a symptom that keeps recurring alongside a particular habit — isn't visible in any one entry. It only exists once enough entries accumulate for something to look backward across them, which is exactly what the specialist layer is for.

Twice, the app looks back rather than just forward. The immediate specialists (`sleep-analyze`, `somatic-correlate`, `journal-enrich`) attach a focused read on a single entry shortly after it's saved — a sleep-quality note, a possible symptom correlation, a reflection on a journal entry's mood. The weekly synthesizer (`insight-synthesize`) goes further: once a week, it reads back a full week of entries across every pillar at once and produces one top insight, one thing to celebrate, and one honest growth area, grounded in that week's actual data rather than a generic platitude.

This is deliberately a feature that gets *more* useful the longer someone uses it, not less. The first day, there's nothing to notice yet — a single entry is just a fact. By the end of a week, the weekly synthesis has something real to say because it has real history to draw from. A month in, the sleep and symptom correlations aren't guesses; they're patterns that have shown up more than once. Nothing about this asks the user to do extra work to unlock it — it accrues automatically from the same brain dumps they were already going to write.

This is also, concretely, what "Grow your awareness" means as more than a tagline. Awareness isn't a single dashboard number — it's the specific, surfaced correlation the user couldn't reasonably have noticed themselves from a week of scattered notes across six different areas of their life. It grows the way any awareness does: gradually, from repeated small observations rather than one big analysis, and it's the Insights panel's entire reason for existing.

## Concepts Demonstrated

1. **Agent / Multi-agent system (ADK):** the router + 7-node fan-out/fan-in `Workflow` (`agent/app/agent.py`) is a genuine multi-node agentic pipeline built on Google's Agent Development Kit, not a thin LLM wrapper. A second tier of specialist agents (sleep, somatic, expense, time, journal, and weekly-insight synthesizers), invoked asynchronously via BullMQ rather than inline, extends that same agent-per-domain pattern to cross-entry analysis.

2. **Deployability:** the agent service is containerized (`agent/Dockerfile`, Python 3.12-slim via `uv`) with Terraform (`agent/deployment/terraform/`) provisioning Cloud Run and supporting GCP infra (IAM, storage, telemetry) — generated and maintained through `agents-cli infra`. For this submission the project is run locally rather than deployed live; setup instructions are in the repo README.

3. **Agent skills (e.g. Agents CLI):** two concrete examples ship in the repo.
First, a custom, cross-agent-compatible **skill** (`git-committer`, mirrored under `.claude/skills/`, `.agents/skills/`, and `.gemini/skills/`) enforces Conventional Commits formatting on every commit made to this repo by any coding agent.
Second, the entire `agent/` service itself was scaffolded, iterated on, evaluated, and deployed through Google's **`agents-cli`** workflow (`install` → `playground` → `eval generate`/`grade` → `deploy`), with `agent/GEMINI.md` as the standing guide that keeps a coding agent aligned with that workflow.

## The Build

- **Client:** React 19, Vite 6, TypeScript, TailwindCSS, Zod, Framer Motion, Lucide icons, Vitest.
- **Server:** Node.js, Express, TypeScript, Mongoose/MongoDB (with `mongodb-memory-server` auto-starting an embedded database for zero-config local dev), BullMQ over Redis (with `redis-memory-server` doing the same for the specialist job queues), JWT auth, `express-rate-limit`, Helmet, Vitest/Supertest.
- **Agent:** Python 3.11–3.13, Google ADK 2.0, FastAPI/uvicorn, Gemini 3.1 Flash Lite, `agents-cli` for scaffolding/eval/deploy, pytest.
- **Shared:** a single Zod schema package consumed by both the client and server, so the API contract has one source of truth instead of drifting between frontend and backend types.

The project was built as a monorepo specifically so the "AI part" (agent/) and the "product part" (client/server) could evolve at different speeds and in different languages, connected by one narrow, validated HTTP contract. The async specialist layer follows the same philosophy at a smaller scale: it's additive infrastructure bolted onto the existing entry pipeline via a queue, not a rewrite of it.

## Track Fit: Concierge Agents

Sage is, by design, a personal agent: it only ever processes one user's own data, keeps it in their own database, and never needs the user to expose that data to anyone else in order to be useful. It fits the Concierge Agents track's brief directly — freeing time and mental overhead ("which app do I log this in?") for something that actually matters, while keeping personal information (health, mood, spending) contained to a single, user-owned pipeline. The async insight layer pushes that further: the concierge doesn't just take dictation, it eventually notices things on the user's behalf.
