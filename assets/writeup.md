# Title
Sage: grow your awareness

# Subtitle
An AI agent that reads your unstructured daily notes and routes them into journal, time, habits, expenses, sleep, symptoms, and nutrition

# Submission track
Concierge agent

# Desciption


## Problem Statement

Most people who try to track their life — time, habits, spending, sleep, mood, symptoms, food — quit within a week. Not because they don't care, but because of friction: every domain lives in a different app, with a different form, a different set of taps. Logging "I ran 5k, slept badly, spent $40 on groceries, and felt anxious about tomorrow's presentation" today means opening four or five different apps and re-entering that same sentence four or five different ways.

That friction is the actual product problem. The data people want — *how does my sleep affect my mood? where is my money actually going? which habits am I actually keeping?* — only becomes visible if the logging happens consistently enough to accumulate. Consistency requires the lowest possible friction: one input, however messy, however unstructured.

## Why Agents

This is a problem that's a poor fit for a traditional form-based app and a great fit for an agent. A form asks the user to already know the taxonomy ("which category is this?"); an agent can *infer* it. The task is fundamentally one of understanding unstructured natural language and mapping it onto multiple, independent structured schemas at once — extraction, classification, and routing in a single step, done automatically instead of by the user.

Concretely, an agent is the right abstraction because:
- **The input is genuinely unstructured.** A brain dump can mention zero, one, or all six domains in any order, with information density that varies wildly per entry.
- **The output requires structured, schema-conformant extraction**, not free text — a good fit for an LLM agent constrained to an output schema, rather than a classic chatbot.
- **The domains are independent of each other** once the router has parsed intent, which maps naturally onto a fan-out/fan-in agent workflow rather than one monolithic prompt trying to do everything serially.

## Solution: The 6-R Pillar System

Sage organizes a person's life into six pillars, and a single agent pipeline routes every brain dump across all of them simultaneously:

- **Reflections** — journal entries & mood
- **Rhythms** — habits & time use
- **Resources** — expenses & finances
- **Rest** — sleep
- **Reactions** — somatic/symptom logs
- **Replenish** — nutrition & intake

#### The user types one entry. The agent decides what's relevant to which pillar. Nothing the user didn't mention gets invented — the router agent is explicitly instructed not to fabricate fields it can't ground in the text.

## Architecture
```
┌─────────────────────────┐        raw input         ┌─────────────────────────┐
│  client/ (React + Vite) │ ───────────────────────> │  server/ (Node/Express) │
│  (Optimistic UI state)  │ <─────────────────────── │   (Main Orchestrator)   │
└─────────────────────────┘    structured response   └─────────────────────────┘
                                                       ▲           │
                                       save / retrieve │           │ forward payload /
                                       clean data data │           │ invoke agent tools
                                                       ▼           ▼
                                             ┌───────────┐┌─────────────────────────┐
                                             │  MongoDB  ││  agent/ (Python + ADK)  │
                                             │(Mongoose) ││           │             │
                                             └───────────┘│           ▼             │
                                                          │        Gemini           │
                                                          └─────────────────────────┘
```


The agent (`agent/app/agent.py`) is a Google ADK **`Workflow`** graph, not a single LLM call:

1. A `router_agent` (`LlmAgent`, Gemini 3.1 Flash Lite, JSON-schema-constrained output) reads the brain dump and extracts a `SageAgentOutput` covering all six pillars at once.
2. The router's output fans out to **seven parallel `FunctionNode`s** — one processor per domain (nutrition, expenses, time, habits, sleep, somatic, journal) — each only doing work if its slice of the router's output is non-empty.
3. A `JoinNode` merges the parallel results back into one combined event.

The Express server (`server/src/services/agent.service.ts`) calls this agent over HTTP, and — importantly — **re-validates the agent's JSON response against a shared Zod schema** (`BrainDumpResponseSchema`) before persisting anything. The agent is treated as an untrusted boundary: if it hallucinates a malformed shape, the server rejects it rather than writing bad data to Mongo. Validated entries are then persisted as `Entry`/`HabitLog` documents and rendered back to the user in an activity feed.

Client, server, and a shared Zod schema package (`@sage/shared`) form a pnpm workspace; the agent is a separate Python/`uv` project so it can be developed, tested, and deployed independently of the JS stack.

## Concepts Demonstrated

1. **Agent / Multi-agent system (ADK):** the router + 7-node fan-out/fan-in `Workflow` described above (`agent/app/agent.py`) is a genuine multi-node agentic pipeline built on Google's Agent Development Kit, not a thin LLM wrapper.

2. **Deployability:** the agent service is containerized (`agent/Dockerfile`, Python 3.12-slim via `uv`) with Terraform (`agent/deployment/terraform/`) provisioning Cloud Run and supporting GCP infra (IAM, storage, telemetry) — generated and maintained through `agents-cli infra`. For this submission the project is run locally rather than deployed live; setup instructions are in the repo README.

3. **Agent skills (e.g. Agents CLI):** two concrete examples ship in the repo. 
First, a custom, cross-agent-compatible **skill** (`git-committer`, mirrored under `.claude/skills/`, `.agents/skills/`, and `.gemini/skills/`) enforces Conventional Commits formatting on every commit made to this repo by any coding agent. 
Second, the entire `agent/` service itself was scaffolded, iterated on, evaluated, and deployed through Google's **`agents-cli`** workflow (`install` → `playground` → `eval generate`/`grade` → `deploy`), with `agent/GEMINI.md` as the standing guide that keeps a coding agent aligned with that workflow.

## The Build

- **Client:** React 19, Vite 6, TypeScript, TailwindCSS, Zod, Vitest.
- **Server:** Node.js, Express, TypeScript, Mongoose/MongoDB (with `mongodb-memory-server` auto-starting an embedded database for zero-config local dev), JWT auth, `express-rate-limit`, Helmet, Vitest/Supertest.
- **Agent:** Python 3.11–3.13, Google ADK 2.0, FastAPI/uvicorn, Gemini 3.1 Flash Lite, `agents-cli` for scaffolding/eval/deploy, pytest.
- **Shared:** a single Zod schema package consumed by both the client and server, so the API contract has one source of truth instead of drifting between frontend and backend types.

The project was built as a monorepo specifically so the "AI part" (agent/) and the "product part" (client/server) could evolve at different speeds and in different languages, connected by one narrow, validated HTTP contract.

## Track Fit: Concierge Agents

Sage is, by design, a personal agent: it only ever processes one user's own data, keeps it in their own database, and never needs the user to expose that data to anyone else in order to be useful. It fits the Concierge Agents track's brief directly — freeing time and mental overhead ("which app do I log this in?") for something that actually matters, while keeping personal information (health, mood, spending) contained to a single, user-owned pipeline.
