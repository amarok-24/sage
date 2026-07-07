# Technical Design Document: Sage

**Project:** Unified Personal "Second Brain" Assistant  
**Document Version:** 1.0  
**Classification:** Internal — Engineering  
**Date:** July 5, 2026  
**Author:** System Architecture Team  
**Status:** Draft — Pending Engineering Review  

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)  
2. [Technology Stack](#2-technology-stack)  
3. [Core Workflows](#3-core-workflows)  
4. [AI Agent Strategy (ADK 2.0)](#4-ai-agent-strategy-adk-20)  
5. [Database Schema](#5-database-schema)  
6. [API Endpoints](#6-api-endpoints)  
7. [Security & Performance](#7-security--performance)  
8. [Appendices](#8-appendices)  

---

## 1. System Architecture Overview

### 1.1 Design Philosophy

Sage's architecture is governed by three immutable constraints derived from the Brand Identity and PRD:

1. **Zero-friction entry** — The user interacts with a single text input. All structural intelligence lives server-side.
2. **Cloud-first AI** — Zero LLM weights reside on the client or backend. All cognitive processing is offloaded to Google Gemini via the ADK 2.0 agent runtime.
3. **Decoupled media storage** — Binary assets (images, videos) are kept outside the primary MongoDB documents. Today this is local disk storage via `multer` for development; the presign/media service layer is structured so a production S3-compatible store (e.g. Cloudflare R2) can be swapped in without changing the API contract.

### 1.2 High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              SAGE — SYSTEM ARCHITECTURE                         │
└──────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────┐         HTTPS/REST          ┌──────────────────────────┐
  │                     │ ──────────────────────────►  │                          │
  │   React/Vite SPA    │                              │    Node.js Backend       │
  │   (TypeScript)      │  ◄──────────────────────────  │    (Express.js)          │
  │                     │      JSON Responses          │                          │
  │  ┌───────────────┐  │                              │  ┌────────────────────┐  │
  │  │ Universal     │  │                              │  │ Auth Middleware     │  │
  │  │ Input Portal  │  │                              │  │ (JWT + Rate Limit) │  │
  │  └───────────────┘  │                              │  └────────┬───────────┘  │
  │  ┌───────────────┐  │                              │           │              │
  │  │ Dashboard &   │  │                              │  ┌────────▼───────────┐  │
  │  │ Insights      │  │                              │  │ API Router Layer   │  │
  │  └───────────────┘  │                              │  │ /api/braindump     │  │
  │                     │                              │  │ /api/dashboard     │  │
  │                     │                              │  │ /api/media         │  │
  │                     │                              │  │ /api/habits        │  │
  │                     │                              │  └────────┬───────────┘  │
  └─────────────────────┘                              │           │              │
                                                       │  ┌────────▼───────────┐  │
                                                       │  │ Agent Service      │  │
                                                       │  │ (HTTP → FastAPI    │  │
                                                       │  │  microservice,     │  │
                                                       │  │  ADK 2.0 Workflow) │  │
                                                       │  └────────┬───────────┘  │
                                                       │           │              │
                                                       │  ┌────────▼───────────┐  │
                                                       │  │ BullMQ / Redis     │  │
                                                       │  │ (async specialist  │  │
                                                       │  │  job queues)       │  │
                                                       │  └────────┬───────────┘  │
                                                       └───────────┼──────────────┘
                                                                   │
                                        ┌──────────────────────────┼──────────────────┐
                                        │                          │                  │
                                ┌───────▼─────────┐      ┌────────▼────────┐         │
                                │  MongoDB         │      │  Local Disk     │         │
                                │  (Data Store)    │      │  (Media, dev;   │         │
                                │                  │      │  cloud object   │         │
                                │  • Users         │      │  store planned  │         │
                                │  • Entries       │      │  for prod)      │         │
                                │  • HabitLogs     │      └─────────────────┘         │
                                └──────────────────┘                                  │
                                                                                      │
                              ┌───────────────────────────────────────────────────┐   │
                              │         Google Gemini 3.1 Flash Lite API               │◄──┘
                              │         (Cloud LLM — Structured Output)           │
                              └───────────────────────────────────────────────────┘
```

### 1.3 Data Flow Summary

```
User Input (text)
  │
  ▼
React Client ──► POST /api/braindump ──► Node.js Server
                                               │
                                  ┌────────────▼────────────┐
                                  │  ADK 2.0 Workflow Agent  │
                                  │                          │
                                  │  START                   │
                                  │    │                     │
                                  │    ▼                     │
                                  │  router_agent (LlmAgent) │
                                  │    │                     │
                                  │    ▼                     │
                                  │  fan-out to 7 domain      │
                                  │  FunctionNodes → JoinNode │
                                  │  ("merge") → combine_results │
                                  └────────────┬─────────────┘
                                               │
                                  ┌────────────▼─────────────┐
                                  │  Node.js persists parsed  │
                                  │  entries to MongoDB, then │
                                  │  enqueues async specialist │
                                  │  jobs (BullMQ/Redis)       │
                                  └───────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Stack Matrix

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Frontend Framework** | React (via Vite) | React 19+ / Vite 6+ | Lightning-fast HMR, zero-config TypeScript, tree-shaking. No SSR overhead for a personal SPA. |
| **Frontend Language** | TypeScript | 6.x (client) / 5.x (server) | Type safety across shared Zod schemas, IDE autocompletion, reduced runtime bugs. |
| **CSS Framework** | Tailwind CSS | 3.x | Utility-first, driving the "Nova" glassmorphic violet/cyan design language (see Brand Identity). |
| **Backend Runtime** | Node.js | 20+ | Unified TypeScript ecosystem. Native `fetch`, `crypto`, and ESM support. |
| **Backend Framework** | Express.js | 4.x | Mature middleware ecosystem (JWT, rate limiting, CORS). Lightweight and well-understood. |
| **Validation** | Zod | 3.x | Runtime schema validation on client and server. Drives the ADK agent's structured output contract. |
| **AI Agent Runtime** | Google ADK 2.0 | ≥ 2.0.0, < 3.0.0 | Graph-based `Workflow` engine with fan-out/fan-in, conditional routing, and Pydantic `output_schema` for deterministic structured output. |
| **LLM Model** | Gemini 3.1 Flash Lite | Latest | High-speed structured output, excellent multilingual + Indian food corpus coverage. |
| **Database** | MongoDB | 8.x (Atlas free tier in production; embedded `mongodb-memory-server` for local dev) | Flexible document schema for heterogeneous entry types. Native JSON storage aligns with LLM outputs. |
| **ODM** | Mongoose | 8.x | Schema enforcement, middleware hooks, population. Mature TypeScript support. |
| **Job Queue** | BullMQ + Redis | — | Background specialist agent processing (sleep/somatic/expense/time/insight enrichment); embedded `redis-memory-server` for local dev. |
| **Media Storage** | Local disk (`multer`) | — | Development storage today; the presign/upload API is structured so an S3-compatible store (e.g. Cloudflare R2) can be swapped in for production. |
| **Authentication** | JWT (jsonwebtoken) | 9.x | Stateless auth for SPA. Short-lived access tokens + HTTP-only refresh tokens. |
| **Rate Limiting** | express-rate-limit | 7.x | IP-based + user-based rate limiting to protect the AI endpoint. |

### 2.2 Development Tooling

| Tool | Purpose |
|------|---------|
| pnpm | Package management (workspace-aware monorepo) |
| Vitest | Unit and integration testing (Vite-native) |
| ESLint + Prettier | Code quality and formatting |
| `mongodb-memory-server` / `redis-memory-server` | Auto-started embedded MongoDB and Redis for local dev — no Docker or local `mongod`/`redis-server` needed |
| Winston | Structured server-side logging |
| Swagger (`swagger-autogen` + `swagger-ui-express`) | Auto-generated API docs, served at `/api-docs` |
| GitHub Actions | CI/CD pipeline |

---

## 3. Core Workflows

### 3.1 Workflow 1: Universal Input ("Brain Dump") Processing

This is the primary interaction pathway. A single unstructured text input is transformed into multiple structured database records simultaneously.

#### Sequence Diagram

```
┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌────────────┐
│  User   │   │  React   │   │  Node.js     │   │ ADK 2.0  │   │  MongoDB   │
│         │   │  Client  │   │  Backend     │   │  Agent   │   │            │
└────┬────┘   └────┬─────┘   └──────┬───────┘   └────┬─────┘   └─────┬──────┘
     │             │                │                 │               │
     │ Types text  │                │                 │               │
     │─────────────►                │                 │               │
     │             │                │                 │               │
     │             │ Optimistic UI  │                 │               │
     │             │ update shown   │                 │               │
     │             │                │                 │               │
     │             │ POST /api/     │                 │               │
     │             │ braindump      │                 │               │
     │             │───────────────►│                 │               │
     │             │                │ POST /process    │               │
     │             │                │─────────────────►               │
     │             │                │                 │ Gemini Flash  │
     │             │                │                 │ Structured    │
     │             │                │                 │ Output (router│
     │             │                │                 │ + fan-out/join)│
     │             │                │ Structured result │              │
     │             │                │◄─────────────────│               │
     │             │                │ Persist entries + habit logs      │
     │             │                │───────────────────────────────────►
     │             │                │ Enqueue async specialist jobs (BullMQ) │
     │             │ 200 OK +       │                 │               │
     │             │ parsed entries │                 │               │
     │             │◄───────────────│                 │               │
     │             │                │                 │               │
     │ ◄───────────│                │                 │               │
     │ Confirmed   │ Reconcile UI   │                 │               │
     │ entries     │                │                 │               │
```

#### Step-by-Step

1. **User submits text** via the Universal Input Portal.
2. **React client** performs an **optimistic UI update** — the raw text appears in the activity feed with a pulsing "processing" animation (per Brand Identity's "breathing transitions").
3. **POST `/api/braindump`** sends `{ text: string, timestamp: ISO8601 }`.
4. **Node.js backend** validates the JWT, applies rate limiting, then calls `POST /process` on the Python agent microservice.
5. **ADK Workflow** executes: `START → router_agent (LlmAgent) → 7 domain FunctionNodes → JoinNode`; the FastAPI wrapper returns the router's structured JSON.
6. **Node.js** persists the structured entries and habit logs to MongoDB, enqueues async specialist jobs, and returns the result; client reconciles optimistic state with confirmed data.

### 3.2 Workflow 2: Indian Food Macro Estimation

#### The Problem

Existing nutrition APIs index heavily on Western food databases (USDA, FatSecret). They fail on Indian colloquial terms — *"2 katori rajma chawal"*, *"3 rotis with dal makhani"*, *"1 plate poha with sev"*.

#### The Solution

Sage leverages Gemini 3.1 Flash Lite's internal training corpus, which covers Indian nutritional data extensively, without any third-party API. Today the router agent's instruction is intentionally generic and does not embed a reference table — estimation relies purely on the base model's implicit knowledge. The table below is a proposed calibration reference that has not yet been added to the agent's system prompt.

#### Measurement Reference Table (Proposed — Not Yet Embedded in Agent Prompt)

| Measurement | Approx. Weight / Volume | Notes |
|-------------|------------------------|-------|
| 1 katori (small bowl) | ~150 ml / ~150 g | Standard for dal, sabzi, rice |
| 1 roti / chapati | ~30 g flour | ~75 kcal each |
| 1 paratha (plain) | ~45 g flour + 5 g ghee | ~150 kcal each |
| 1 dosa (plain) | ~80 g batter | ~120 kcal |
| 1 idli | ~40 g | ~55 kcal |
| 1 glass / cup | ~200 ml | Chai, lassi, buttermilk |
| 1 plate | ~250–300 g | Biryani, rice, poha |
| 1 bowl (large) | ~250 ml | Soups, curries |
| 1 piece (sweet) | ~30–50 g | Ladoo, barfi, gulab jamun |

#### Estimation Example

```
Input: "Had 2 rotis with dal makhani and a katori of raita for lunch"

ADK Agent (Nutrition Processing):
  ├── roti × 2:            ~160 kcal, 4g protein, 30g carbs, 2g fat
  ├── dal makhani (1 katori): ~235 kcal, 9g protein, 24g carbs, 12g fat
  └── raita (1 katori):    ~70 kcal, 3g protein, 6g carbs, 4g fat
      ────────────────────────────────────────────────────────────
      Total:                ~465 kcal, 16g protein, 60g carbs, 18g fat
      meal_type:            "lunch"
      confidence:           "high"
```

### 3.3 Workflow 3: Journal Entry with Media Upload

**Status:** The backend endpoints below exist and work, but no client UI is wired up to this flow yet — the composer creates journal entries only from parsed brain-dump text, with no file picker. Media storage is currently local disk, not Cloudflare R2 (see §2.1).

```
┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌───────────────┐
│  User   │   │  React   │   │  Node.js     │   │ Object Storage│
└────┬────┘   └────┬─────┘   └──────┬───────┘   └───────┬───────┘
     │             │                │                    │
     │ Selects     │                │                    │
     │ files       │                │                    │
     │─────────────►                │                    │
     │             │ GET /api/      │                    │
     │             │ media/presign  │                    │
     │             │───────────────►│                    │
     │             │                │ Generate           │
     │             │                │ signed URLs        │
     │             │                │───────────────────►│
     │             │                │◄───────────────────│
     │             │ Signed URLs    │                    │
     │             │◄───────────────│                    │
     │             │                │                    │
     │             │ PUT directly   │                    │
     │             │ to R2 (client) │                    │
     │             │────────────────────────────────────►│
     │             │                │                    │
     │             │ POST /api/     │                    │
     │             │ journal        │                    │
     │             │ {text,urls}    │                    │
     │             │───────────────►│                    │
     │             │                │ Save + async AI    │
     │             │                │ enrichment queued  │
     │             │ 201 Created    │                    │
     │             │◄───────────────│                    │
```

1. Client requests upload URLs (`GET /api/media/presign?count=N`).
2. Today, the backend returns a mock presign response pointing at its own `POST /api/media/upload` endpoint (local disk); in production this would generate real object-storage signed PUT URLs.
3. Client uploads the file (to the backend in dev; directly to object storage in the planned production design).
4. Client submits the journal entry (`POST /api/journal`) with the resulting public URL(s).
5. Backend persists the entry and enqueues the `journal_enrich` job for async AI enrichment (mood score, tags, summary snippet), written to the entry's `enrichment` field.

### 3.4 Workflow 4: Habit Streak Tracking

```
Input: "Did my morning meditation and workout today"

router_agent (single LLM call, no tools):
  1. Matches mentions against the user's defined habits (fuzzy, in-context — the
     model is not given a separate habit-lookup tool call)
  2. Returns habits: [{ habit_name: "meditation", matched_phrase: "morning meditation", completed: true },
                       { habit_name: "workout", matched_phrase: "workout", completed: true }]

Backend (braindump.routes.ts, inline — no dedicated habit.service.ts):
  1. For each completed habit, look up today's and yesterday's HabitLog
  2. Create today's HabitLog with currentStreak = yesterday's streak + 1 (or 1 if none)
     meditation  → 14 days → 15 days ✓
     workout     →  3 days →  4 days ✓
```

---

## 4. AI Agent Strategy (ADK 2.0)

### 4.1 Why ADK 2.0 Over Simple API Calls

| Concern | Simple Gemini API Call | ADK 2.0 Workflow Agent |
|---------|----------------------|------------------------|
| **Multi-entity routing** | All routing logic in application code | Graph-based fan-out with typed nodes per entity |
| **Schema enforcement** | Manual Zod validation; failure recovery ad hoc | Pydantic `output_schema` enforced at LLM node level |
| **Error handling** | Manual try/catch with ad-hoc retry | Built-in `RetryConfig` with exponential backoff per node |
| **Observability** | Console logs | Cloud Trace integration, event-level audit trail |
| **Extensibility** | Adding a new entity type requires refactoring the monolithic prompt | Add a new branch node — zero impact on existing nodes |
| **Testing** | Must mock the entire API response | Test individual nodes in isolation with typed inputs/outputs |

### 4.2 Agent Instruction: `router_agent`

The actual router agent instruction (`agent/app/agent.py`) is intentionally short and generic — it does not (yet) implement the elaborate persona, Indian food reference table, or explicit behavior directives originally envisioned. The current instruction:

```
SYSTEM PROMPT (router_agent):
────────────────────────────────────────
You are the Sage Universal Input Router.
The user will provide an unstructured daily log. Your task is to extract
and route the information into the appropriate structured schemas
(Nutrition, Expenses, Time, Habits, Sleep, Somatic, Journal).
Do not make up information. Only fill in the fields if they are
explicitly mentioned or strongly implied.
```

Structured output is enforced via `output_schema=SageAgentOutput` (a Pydantic model, `agent/app/schemas.py`) rather than a hand-written prompt directive. The agent has no tools — all matching (including habit fuzzy-matching and Indian food macro estimation) is done implicitly by the model in this single call, not via an embedded reference table or a habit-lookup tool.

The Indian food measurement/macro tables below are a **proposed calibration reference** for a future prompt revision — they are not currently part of the agent's instruction:

```
INDIAN FOOD REFERENCE TABLE (proposed, not yet implemented):
┌─────────────────────┬──────────────┬──────────────────────────┐
│ Measurement         │ Weight/Vol   │ Notes                    │
├─────────────────────┼──────────────┼──────────────────────────┤
│ 1 katori            │ ~150 ml/150g │ Standard small bowl      │
│ 1 roti/chapati      │ ~30g flour   │ ~75 kcal each            │
│ 1 paratha (plain)   │ ~45g + ghee  │ ~150 kcal each           │
│ 1 dosa (plain)      │ ~80g batter  │ ~120 kcal                │
│ 1 idli              │ ~40g         │ ~55 kcal                 │
│ 1 glass/cup         │ ~200ml       │ Chai, lassi, buttermilk  │
│ 1 plate             │ ~250–300g    │ Rice/biryani dishes      │
│ 1 bowl (large)      │ ~250ml       │ Soups, curries           │
│ 1 piece (sweet)     │ ~30–50g      │ Ladoo, barfi, gulab jamun│
└─────────────────────┴──────────────┴──────────────────────────┘

Common Indian Dish Macros (per katori / standard serving):
• Dal (any):        ~130 kcal, 8g protein, 20g carbs, 4g fat
• Dal Makhani:      ~235 kcal, 9g protein, 24g carbs, 12g fat
• Rajma:            ~155 kcal, 8g protein, 24g carbs, 3g fat
• Chole:            ~180 kcal, 9g protein, 26g carbs, 5g fat
• Paneer Sabzi:     ~230 kcal, 13g protein, 10g carbs, 16g fat
• Rice (1 katori):  ~180 kcal,  3g protein, 40g carbs,  0.5g fat
• Raita:             ~70 kcal,  3g protein,  6g carbs,  4g fat
• Poha (1 plate):   ~275 kcal,  5g protein, 45g carbs,  8g fat
• Upma (1 plate):   ~225 kcal,  5g protein, 38g carbs,  6g fat
```

### 4.3 Zod Schema Contract (TypeScript)

These schemas define the structural contract between the ADK agent's output and the Node.js backend. They are used for:
1. Runtime validation on the Node.js backend.
2. Frontend type safety via the `@sage/shared` package.
3. The Pydantic mirror on the Python ADK side.

```typescript
// shared/schemas/braindump.ts

import { z } from 'zod';

export const NutritionItemSchema = z.object({
  name:       z.string(),
  quantity:   z.string(),
  calories:   z.number(),
  protein_g:  z.number(),
  carbs_g:    z.number(),
  fat_g:      z.number(),
  confidence: z.enum(['high', 'medium', 'low']),
});

export const NutritionOutputSchema = z.object({
  food_items:       z.array(NutritionItemSchema),
  total_calories:   z.number(),
  total_protein_g:  z.number(),
  total_carbs_g:    z.number(),
  total_fat_g:      z.number(),
  meal_type: z.enum(['breakfast','lunch','dinner','snack','unspecified']),
});

export const ExpenseOutputSchema = z.object({
  amount:            z.number(),
  currency:          z.string().default('INR'),
  category: z.enum([
    'food','groceries','transport','utility','entertainment',
    'health','education','shopping','investment','savings',
    'rent','subscription','gift','other',
  ]),
  merchant_inferred: z.string(),
  description:       z.string(),
});

export const TimeLogOutputSchema = z.object({
  duration_minutes:  z.number().int().positive(),
  activity_category: z.enum([
    'deep-work','study','exercise','commute','meeting',
    'creative','chores','social','rest','other',
  ]),
  description: z.string(),
});

export const HabitMatchSchema = z.object({
  habit_name:     z.string(),
  matched_phrase: z.string(),
  completed:      z.boolean().default(true),
});

export const JournalMetadataSchema = z.object({
  mood_score:       z.number().int().min(1).max(10),
  tags:             z.array(z.string()).min(1).max(5),
  summary_snippet:  z.string().max(200),
});

export const SleepLogSchema = z.object({
  bedtime:        z.string().datetime(),
  wake_time:      z.string().datetime(),
  duration_hours: z.number().positive(),
  quality:        z.enum(['deep', 'moderate', 'light', 'poor']),
  notes:          z.string().optional(),
});

export const SomaticLogSchema = z.object({
  symptom:          z.string(),
  severity:         z.number().int().min(1).max(10),
  body_area:        z.string().optional(),
  remedy_taken:     z.string().optional(),
  duration_minutes: z.number().int().optional(),
  resolved:         z.boolean(),
});

export const BrainDumpResponseSchema = z.object({
  nutrition:         z.array(NutritionOutputSchema).default([]),
  expenses:          z.array(ExpenseOutputSchema).default([]),
  time_logs:         z.array(TimeLogOutputSchema).default([]),
  habits_completed:  z.array(HabitMatchSchema).default([]),
  sleep:             SleepLogSchema.optional().nullable(),
  somatic_logs:      z.array(SomaticLogSchema).default([]),
  journal:           JournalMetadataSchema.optional().nullable(),
  raw_text:          z.string(),
  parsed_at:         z.string().datetime(),
});

export type BrainDumpResponse = z.infer<typeof BrainDumpResponseSchema>;
```

**Known drift:** the Pydantic mirror of `ExpenseData` (`agent/app/schemas.py`) currently defaults `currency` to `"USD"`, not `"INR"` — inconsistent with this Zod schema and with `User.preferences.defaultCurrency` (§5.2). This should be reconciled.

### 4.4 ADK 2.0 Workflow Graph Definition (Python)

```python
# agent/app/agent.py (abridged — see the file for env/auth setup)

from google.adk.workflow import Workflow, JoinNode, FunctionNode
from google.adk.agents import LlmAgent
from google.adk.apps import App
from app.schemas import SageAgentOutput

# 1. LLM Router Node
router_agent = LlmAgent(
    name="router",
    model="gemini-3.1-flash-lite",
    instruction="""You are the Sage Universal Input Router.
The user will provide an unstructured daily log. Your task is to extract and route the information into the appropriate structured schemas (Nutrition, Expenses, Time, Habits, Sleep, Somatic, Journal).
Do not make up information. Only fill in the fields if they are explicitly mentioned or strongly implied.
""",
    output_schema=SageAgentOutput,
)

# 2. Domain Processing Nodes — format each domain into a summary line
#    (these do NOT write to MongoDB; persistence happens in Node.js
#    after the agent's HTTP response returns, see §4.7 and braindump.routes.ts)
def process_nutrition_impl(node_input: dict) -> str | None: ...
def process_expense_impl(node_input: dict) -> str | None: ...
def process_time_impl(node_input: dict) -> str | None: ...
def process_habit_impl(node_input: dict) -> str | None: ...
def process_sleep_impl(node_input: dict) -> str | None: ...
def process_somatic_impl(node_input: dict) -> str | None: ...
def process_journal_impl(node_input: dict) -> str | None: ...

process_nutrition = FunctionNode(func=process_nutrition_impl, name="process_nutrition")
process_expense   = FunctionNode(func=process_expense_impl, name="process_expense")
process_time      = FunctionNode(func=process_time_impl, name="process_time")
process_habit     = FunctionNode(func=process_habit_impl, name="process_habit")
process_sleep     = FunctionNode(func=process_sleep_impl, name="process_sleep")
process_somatic   = FunctionNode(func=process_somatic_impl, name="process_somatic")
process_journal   = FunctionNode(func=process_journal_impl, name="process_journal")

# 3. Join & Combiner
join_node = JoinNode(name="merge")

def combine_results_impl(node_input: dict):
    """Concatenates all non-empty domain summaries into one Event."""
    ...
combine_results = FunctionNode(func=combine_results_impl, name="combine_results")

# 4. Graph Definition — unconditional fan-out to all 7 processors, then fan-in
root_agent = Workflow(
    name="root_agent",
    edges=[
        ('START', router_agent),
        (router_agent, (
            process_nutrition, process_expense, process_time, process_habit,
            process_sleep, process_somatic, process_journal,
        )),
        ((
            process_nutrition, process_expense, process_time, process_habit,
            process_sleep, process_somatic, process_journal,
        ), join_node),
        (join_node, combine_results),
    ],
)

app = App(root_agent=root_agent, name="app")
```

Note: this graph has no retry/backoff configuration and no read/write tools — it is purely a routing + text-summarization graph. All MongoDB persistence happens on the Node.js side (`server/src/routes/braindump.routes.ts`) after the FastAPI `/process` endpoint (Appendix D) returns the router's structured JSON, not inside the Python agent.

### 4.5 Hybrid Multi-Agent Architecture

Sage uses a **hybrid multi-agent pattern** — a fast synchronous core agent for real-time parsing, backed by asynchronous specialist agents for background enrichment.

#### Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                  root_agent Workflow (Python/ADK, in the agent service)      │
│                                                                               │
│  ┌─────────┐   ┌────────────────┐   ┌────────────────────┐   ┌─────────────┐ │
│  │  START  │──►│  router_agent  │──►│ 7 domain FunctionNodes│─►│ join ("merge")│ │
│  │         │   │  (LlmAgent)    │   │ (process_nutrition,   │  │ → combine_   │ │
│  │ User    │   │                │   │  process_expense, ...)│  │   results    │ │
│  │ text    │   │ Model: gemini- │   │ Format each domain's  │  │              │ │
│  │         │   │ 3.1-flash-lite │   │ parsed data into a    │  │ Concatenates │ │
│  │         │   │ Schema:        │   │ human-readable summary│  │ non-empty    │ │
│  │         │   │ SageAgentOutput│   │ line                  │  │ summary lines│ │
│  │         │   │ (no tools)     │   │                       │  │              │ │
│  └─────────┘   └────────────────┘   └────────────────────┘   └─────────────┘ │
│                                                                               │
│  Synchronous — p95 latency target: < 5s                                     │
└───────────────────────────────────────────────────────────────────────────────┘
              │
              │  Node.js (braindump.routes.ts) persists the router's structured
              │  JSON to MongoDB, then enqueues async specialist jobs (BullMQ)
              ▼
  ┌──────────────────────────────────────────────────────────────────────────
  │
  │  ASYNC SPECIALIST AGENTS (Background — non-blocking to user)
  │
  │  ┌────────────────────────────┐    ┌────────────────────────────────┐
  ├─►│  journal_enricher          │    │  somatic_correlator            │
  │  │  (LlmAgent)                │    │  (LlmAgent)                    │
  │  │  • mood, tags, summary     │    │  • correlates triggers         │
  │  └────────────────────────────┘    └────────────────────────────────┘
  │
  │  ┌────────────────────────────┐    ┌────────────────────────────────┐
  ├─►│  sleep_analyzer            │    │  expense_analyzer              │
  │  │  (LlmAgent)                │    │  (LlmAgent)                    │
  │  │  • consistency, alignment  │    │  • flags impulse/creep         │
  │  └────────────────────────────┘    └────────────────────────────────┘
  │
  │  ┌────────────────────────────┐    ┌────────────────────────────────┐
  ├─►│  time_analyzer             │    │  insight_synthesizer           │
  │  │  (LlmAgent)                │    │  (LlmAgent)                    │
  │  │  • flow state, time drains │    │  • weekly cross-domain sync    │
  │  └────────────────────────────┘    └────────────────────────────────┘
```

#### Design Rationale: Why Hybrid?

| Layer | Agents | Execution | Latency Impact |
|-------|--------|-----------|----------------|
| **Synchronous Core** | `router_agent` (single LlmAgent) + 7 domain `FunctionNode`s + `JoinNode` | Inline — blocks the HTTP response | 2–4s (one Gemini round-trip; node fan-out/join is local, near-instant) |
| **Async Specialists** | `journal_enricher`, `sleep_analyzer`, `somatic_correlator`, `expense_analyzer`, `time_analyzer`, `insight_synthesizer` | Background — queued after persist / end of day | 0s (invisible to user) |

This architecture preserves the **zero-friction, instant-feedback** promise of the Brand Identity while enabling deep, multi-domain intelligence that runs silently in the background.

### 4.6 Async Specialist Agent Definitions

```python
# agent/app/specialists.py

from google.adk.agents import LlmAgent
from google.adk.workflow import Workflow
from google.adk.apps import App

from app.schemas import (
    JournalMetadata, SleepAnalysis, SomaticCorrelation,
    ExpenseAnalysis, TimeAnalysis, WeeklyInsight,
)

journal_enricher = LlmAgent(
    name="journal_enricher",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are a reflective journaling assistant. Given a raw journal entry, produce:
    1. mood_score (1-10, where 10 is peak positivity)
    2. 3-5 thematic tags (e.g. "fitness", "deep-work", "stress", "family")
    3. summary_snippet: a single-sentence TL;DR of the day

    Be empathetic but objective. Do not project emotions not present in the text.
    """,
    output_schema=JournalMetadata,
)

sleep_analyzer = LlmAgent(
    name="sleep_analyzer",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are a sleep quality analyst. Given a user's sleep log and their
    recent 7-day sleep history, produce:
    1. consistency_score (1-10): How regular is their sleep/wake schedule?
    2. circadian_alignment: "aligned", "slightly_shifted", or "misaligned"
    3. recommendation: A single actionable tip (e.g., "Consider a consistent
       10:30 PM bedtime to align with your natural wake pattern.")
    """,
    output_schema=SleepAnalysis,
)

somatic_correlator = LlmAgent(
    name="somatic_correlator",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are a health pattern analyst. Given a somatic symptom log and the
    user's recent nutrition, sleep, and stress data (from journal mood scores),
    identify potential correlations:
    1. potential_triggers: List of possible triggers (e.g., "High dairy intake",
       "Poor sleep last 2 nights", "Elevated stress from work")
    2. confidence: "high", "medium", or "low"
    3. suggestion: A gentle, non-medical observation.

    IMPORTANT: You are NOT a medical professional. Always frame insights as
    observations, never as diagnoses. Include a disclaimer.
    """,
    output_schema=SomaticCorrelation,
)

expense_analyzer = LlmAgent(
    name="expense_analyzer",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are a financial health analyst. Given a user's daily expenses and
    journal mood data, produce:
    1. anomaly_flag: True if spending velocity exceeds baseline or if impulse
       spending is detected.
    2. subscription_creep: Identify any potential duplicate or excessive subscriptions.
    3. insight: A single financial insight (e.g., "High food delivery spending today
       correlates with your 'stressed' mood tag.")
    """,
    output_schema=ExpenseAnalysis,
)

time_analyzer = LlmAgent(
    name="time_analyzer",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are a productivity and flow state analyst. Given a user's daily time logs,
    produce:
    1. deep_work_ratio: Ratio of focused work vs shallow/admin work.
    2. time_drain: Identify the biggest time sink (e.g., "doomscrolling").
    3. optimization_tip: A single tip (e.g., "You logged 2 hours of deep focus
       in the morning; protect this window tomorrow.")
    """,
    output_schema=TimeAnalysis,
)

insight_synthesizer = LlmAgent(
    name="insight_synthesizer",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are Sage's weekly insight engine. Given a user's aggregated data
    across all 7 domains (nutrition, expenses, time, habits, sleep, somatic,
    journal) for the past 7 days, produce:
    1. top_insight: The single most impactful cross-domain correlation.
    2. supporting_data: 2-3 data points that support the insight.
    3. growth_area: One area where the user can improve next week.
    4. celebration: One thing the user did well this week.
    """,
    output_schema=WeeklyInsight,
)

# Each specialist is a single LLM call, so it only needs a trivial one-node
# Workflow (no fan-out/join like the router's domain-processing graph).
SPECIALISTS = {
    "journal_enricher": journal_enricher,
    "sleep_analyzer": sleep_analyzer,
    "somatic_correlator": somatic_correlator,
    "expense_analyzer": expense_analyzer,
    "time_analyzer": time_analyzer,
    "insight_synthesizer": insight_synthesizer,
}

SPECIALIST_APPS = {
    name: App(root_agent=Workflow(name=f"{name}_workflow", edges=[("START", agent)]), name=name)
    for name, agent in SPECIALISTS.items()
}
```

Each specialist is invoked over HTTP via `POST /specialists/{name}` (Appendix D), keyed by request body, not ADK's `output_key` state mechanism — the Node.js caller (`agent.service.ts`) reads the specialist's JSON response directly and validates it against the matching Zod schema (`SPECIALIST_SCHEMAS[name]`) before writing it into the triggering entry's `enrichment` field (§5.3).

### 4.7 Agent Orchestration: Sync vs. Async Flow

```
User submits brain dump
        │
        ▼
┌─── SYNCHRONOUS (blocks response) ───────────────────────────┐
│                                                              │
│   router_agent (LlmAgent) → 7 domain FunctionNodes → JoinNode│
│   • 1 LLM call                                              │
│   • Parses all 7 domains                                    │
│   • Node.js persists structured entries to MongoDB and       │
│     returns them to the client                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
        │
        │  HTTP 200 returned to client (< 5s)
        │
        ▼
┌─── ASYNCHRONOUS (background queue) ─────────────────────────┐
│                                                              │
│   IF journal entry was created:                              │
│       → Enqueue journal_enricher                             │
│       → Writes to entry.enrichment.journal_enrichment only   │
│         (does NOT overwrite the entry's own mood_score/tags/  │
│         summary_snippet, which come from the router call)    │
│                                                              │
│   IF sleep log was created:                                  │
│       → Enqueue sleep_analyzer                               │
│       → Updates: consistency_score, circadian_alignment       │
│                                                              │
│   IF somatic log was created:                                │
│       → Enqueue somatic_correlator                           │
│       → Updates: potential_triggers, suggestion               │
│                                                              │
│   END OF DAY (cron: 11:59 PM user-local):                    │
│       → Enqueue expense_analyzer (if expenses logged)        │
│       → Enqueue time_analyzer (if time logged)               │
│                                                              │
│   WEEKLY (cron: Sunday 9 PM user-local):                     │
│       → Enqueue insight_synthesizer                          │
│       → Creates: weekly insight entry                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### 5.1 Entity Relationship Overview

```
┌──────────────┐         1:N        ┌──────────────────┐
│    Users     │────────────────────►│     Entries      │
│              │                     │  (Polymorphic)   │
│  _id         │                     │                  │
│  email       │         1:N         │  _id             │
│  name        │────────────┐        │  userId          │
│  habits[]    │            │        │  type (enum)     │
│  preferences │            │        │  date            │
│  createdAt   │            │        │  raw_text        │
└──────────────┘            │        │  braindump_id    │
                            │        │  data {}         │
                            │        └──────────────────┘
                            │
                            │  1:N   ┌──────────────────┐
                            └───────►│   HabitLogs      │
                                     │                  │
                                     │  _id             │
                                     │  userId          │
                                     │  habitName       │
                                     │  date            │
                                     │  completed       │
                                     │  currentStreak   │
                                     │  braindump_id    │
                                     └──────────────────┘
```

### 5.2 Users Collection

```typescript
// server/models/User.ts

import mongoose, { Schema, Document } from 'mongoose';

interface IHabitDefinition {
  name:      string;       // Normalized: "meditation", "workout"
  aliases:   string[];     // Fuzzy terms: ["meditated", "mindfulness"]
  icon?:     string;       // Emoji or icon key
  createdAt: Date;
}

interface IUserPreferences {
  defaultCurrency:   string;    // ISO 4217, default "INR"
  timezone:          string;    // IANA, default "Asia/Kolkata"
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
}

export interface IUser extends Document {
  email:                string;
  passwordHash:         string;
  name:                 string;
  habits:               IHabitDefinition[];
  preferences:          IUserPreferences;
  refreshTokenVersion:  number;   // Incremented on logout / password change
  createdAt:            Date;
  updatedAt:            Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String, required: true,
    unique: true, lowercase: true, trim: true, index: true,
  },
  passwordHash: { type: String, required: true },
  name:         { type: String, required: true, trim: true },
  habits: [{
    name:      { type: String, required: true },
    aliases:   [{ type: String }],
    icon:      { type: String, default: '🌱' },
    createdAt: { type: Date, default: Date.now },
  }],
  preferences: {
    defaultCurrency:   { type: String, default: 'INR' },
    timezone:          { type: String, default: 'Asia/Kolkata' },
    dailyCalorieGoal:  { type: Number },
    dailyProteinGoal:  { type: Number },
  },
  refreshTokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
```

### 5.3 Entries Collection (Unified Polymorphic Log)

```typescript
// server/models/Entry.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export type EntryType = 'nutrition' | 'expense' | 'time_log' | 'sleep' | 'somatic_log' | 'journal' | 'weekly_insight';

export interface IEntry extends Document {
  userId:       Types.ObjectId;
  type:         EntryType;
  date:         Date;          // Logical date (user's local date at midnight)
  raw_text:     string;        // Original brain dump text
  braindump_id: string;        // Groups all entries from one brain dump
  data:         Record<string, any>;   // Polymorphic payload
  enrichment:   Record<string, any> | null;  // Async specialist output (§4.6); null until background enrichment completes
  createdAt:    Date;
  updatedAt:    Date;
}

const EntrySchema = new Schema<IEntry>({
  userId: {
    type: Schema.Types.ObjectId, ref: 'User',
    required: true, index: true,
  },
  type: {
    type: String,
    enum: ['nutrition', 'expense', 'time_log', 'sleep', 'somatic_log', 'journal', 'weekly_insight'],
    required: true, index: true,
  },
  date:         { type: Date, required: true, index: true },
  raw_text:     { type: String, required: true },
  braindump_id: { type: String, required: true, index: true },
  data:         { type: Schema.Types.Mixed, required: true },
  enrichment:   { type: Schema.Types.Mixed, default: null },
}, { timestamps: true });

// Compound indexes
EntrySchema.index({ userId: 1, date: -1 });            // Dashboard: today's entries
EntrySchema.index({ userId: 1, type: 1, date: -1 });   // Filtered views
EntrySchema.index({ userId: 1, braindump_id: 1 });     // Braindump grouping

export const Entry = mongoose.model<IEntry>('Entry', EntrySchema);
```

**`data` field shape by entry type:**

| `type` | `data` shape |
|--------|-------------|
| `nutrition` | `{ food_items[], total_calories, total_protein_g, total_carbs_g, total_fat_g, meal_type }` |
| `expense` | `{ amount, currency, category, merchant_inferred, description }` |
| `time_log` | `{ duration_minutes, activity_category, description }` |
| `sleep` | `{ bedtime, wake_time, duration_hours, quality, notes? }` |
| `somatic_log` | `{ symptom, severity, body_area?, remedy_taken?, duration_minutes?, resolved }` |
| `journal` | `{ text, media_urls[], mood_score, tags[], summary_snippet, ai_enriched }` |
| `weekly_insight` | `{ top_insight, supporting_data[], growth_area, celebration }` |

**`enrichment` field:** `null` until the corresponding async specialist (§4.6) finishes background processing. Shape depends on entry `type`: `sleep` → `{ sleep_analysis: SleepAnalysis }`; `somatic_log` → `{ somatic_correlation: SomaticCorrelation }`; `expense` → `{ expense_analysis: ExpenseAnalysis }`; `time_log` → `{ time_analysis: TimeAnalysis }`; `journal` → `{ journal_enrichment: JournalMetadata }` (a *second*, richer mood/tags/summary pass — it does not overwrite the `mood_score`/`tags`/`summary_snippet` already present in `data`, which come from the synchronous router call). `nutrition` entries receive no `enrichment` payload; `weekly_insight` entries have no `enrichment` (they *are* the output of `insight_synthesizer`). Note: `journal_enrichment` is not currently surfaced anywhere in the client UI (`InsightsPanel.tsx` only reads the other three enrichment keys) — it is written but not yet displayed.

### 5.4 HabitLogs Collection

```typescript
// server/models/HabitLog.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHabitLog extends Document {
  userId:        Types.ObjectId;
  habitName:     string;            // Matches User.habits[].name
  date:          Date;              // Midnight of user's local date
  completed:     boolean;
  currentStreak: number;            // Running streak at time of log
  source:        'braindump' | 'manual';
  braindump_id?: string;            // Groups this log with the Entry docs from the same brain dump submission (absent for manual completions)
  createdAt:     Date;
}

const HabitLogSchema = new Schema<IHabitLog>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  habitName: { type: String, required: true },
  date:      { type: Date, required: true },
  completed: { type: Boolean, required: true, default: true },
  currentStreak: { type: Number, default: 1 },
  source:    { type: String, enum: ['braindump', 'manual'], default: 'braindump' },
  braindump_id: { type: String, index: true },
}, { timestamps: true });

// Unique: one log per habit per day per user
HabitLogSchema.index({ userId: 1, habitName: 1, date: 1 }, { unique: true });
HabitLogSchema.index({ userId: 1, date: -1 });

export const HabitLog = mongoose.model<IHabitLog>('HabitLog', HabitLogSchema);
```

### 5.5 Index Strategy Summary

| Collection | Index | Type | Purpose |
|-----------|-------|------|---------|
| `users` | `{ email: 1 }` | Unique | Login lookup |
| `entries` | `{ userId: 1, date: -1 }` | Compound | Dashboard — today's entries |
| `entries` | `{ userId: 1, type: 1, date: -1 }` | Compound | Filtered views (expenses this month) |
| `entries` | `{ userId: 1, braindump_id: 1 }` | Compound | Brain dump grouping |
| `habitlogs` | `{ braindump_id: 1 }` | Single | Brain dump grouping (join with Entries by braindump_id) |
| `habitlogs` | `{ userId: 1, habitName: 1, date: 1 }` | Compound Unique | Prevent duplicate logs per day |
| `habitlogs` | `{ userId: 1, date: -1 }` | Compound | Habit dashboard queries |

---

## 6. API Endpoints

### 6.1 Authentication

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| `POST` | `/api/auth/register` | None | `{ email, password, name }` | `{ user, accessToken }` |
| `POST` | `/api/auth/login` | None | `{ email, password }` | `{ user, accessToken }` |
| `POST` | `/api/auth/refresh` | Cookie | *(HTTP-only cookie)* | `{ accessToken }` |
| `POST` | `/api/auth/logout` | JWT | — | `{ success: true }` |
| `POST` | `/api/auth/demo-login` | None | — | `{ user, accessToken }` — logs in as the seeded demo user; disabled (404) when `NODE_ENV=production` |

### 6.2 Core Data

| Method | Endpoint | Auth | Request / Query | Response |
|--------|----------|------|-----------------|----------|
| `POST` | `/api/braindump` | JWT | `{ text, timestamp? }` | `{ braindump_id, entries_created[], habits_updated[], parsed_data }` |
| `GET` | `/api/dashboard/today` | JWT | — | `{ entries: Entry[], habits: HabitLog[] }` |
| `GET` | `/api/dashboard/summary` | JWT | `?range=week\|month&date=` | `{ totals: { calories, expenses, hours }, streaks[] }` |
| `GET` | `/api/dashboard/insights` | JWT | — | `{ weeklyInsight: { date, data } \| null, recentEnrichments: [{ entryId, type, date, enrichment }] }` |
| `GET` | `/api/entries` | JWT | `?type=&page=1&limit=20` (no `from`/`to` date-range filtering implemented yet) | `{ entries[], pagination }` |
| `GET` | `/api/entries/:id` | JWT | — | `{ entry }` |
| `PATCH` | `/api/entries/:id` | JWT | `{ data: Partial<EntryData> }` | `{ entry }` |
| `DELETE` | `/api/entries/:id` | JWT | — | `{ success: true }` |

**Notes:**
- `/api/dashboard/today`, `/api/dashboard/summary`, and the brain dump write path compute "today"/day boundaries using the requesting user's stored IANA timezone (`User.preferences.timezone`, §5.2), not the server process's local timezone. This is handled by DST-safe helpers in `server/src/utils/timezone.ts`: `getUserLocalMidnight`, `getUserLocalDayBounds`, `getLocalCalendarAnchor`. Previously, entries logged late at night could be attributed to the wrong logical day for any user not colocated with the server.
- `/today`'s `entries` and `habits` share a `braindump_id` when they originated from the same submission (§5.3, §5.4); the client uses this to reconstruct the activity feed, including after a page reload (§7.3).
- `/insights`'s `weeklyInsight.data` is the most recent `weekly_insight`-type Entry's `data` (§5.3), matching `insight_synthesizer`'s output (§4.6). `recentEnrichments` returns up to the last 20 Entries from the past 7 days with a non-null `enrichment` field (§5.3), each labeled by specialist `type` (`sleep_analysis`, `somatic_correlation`, `expense_analysis`, `time_analysis`; §4.6).

### 6.3 Habits

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| `GET` | `/api/habits` | JWT | — | `{ habits: [{ name, aliases, icon, createdAt, completedToday }] }` — note: no `streak` field is computed/returned here; streak values live on individual `HabitLog` documents, not this summary endpoint |
| `POST` | `/api/habits` | JWT | `{ name, aliases?, icon? }` | `{ habit }` |
| `DELETE` | `/api/habits/:name` | JWT | — | `{ success: true }` |
| `POST` | `/api/habits/:name/toggle` | JWT | — | `{ log: HabitLog }` |

### 6.4 Journal & Media

| Method | Endpoint | Auth | Request / Query | Response |
|--------|----------|------|-----------------|----------|
| `POST` | `/api/journal` | JWT | `{ text, media_urls? }` | `{ entry }` |
| `GET` | `/api/journal/recent` | JWT | `?limit=10&offset=0` | `{ entries[] }` |
| `GET` | `/api/media/presign` | JWT | `?count=1&types=image/jpeg` | `{ urls: [{ uploadUrl, publicUrl, expiresAt }] }` — currently returns mock URLs pointing at `/api/media/upload` (local disk); not real object-storage presigned URLs yet |
| `POST` | `/api/media/upload` | JWT | `multipart/form-data`, field `file` | `{ publicUrl }` — local-disk upload handler backing the mocked presign flow above |

### 6.5 User Settings

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| `GET` | `/api/user/profile` | JWT | — | `{ user }` |
| `PATCH` | `/api/user/preferences` | JWT | `{ timezone?, defaultCurrency?, dailyCalorieGoal? }` | `{ preferences }` |

### 6.6 Rate Limiting Configuration

| Endpoint Group | Window | Max Requests | Scope |
|---------------|--------|-------------|-------|
| `/api/auth/*` | 15 min | 10 | Per IP |
| `/api/braindump` | 1 min | 10 | Per User |
| `/api/media/presign` | 1 min | 5 | Per User |
| All other `/api/*` | 1 min | 60 | Per User |

---

## 7. Security & Performance

### 7.1 JWT Authentication Architecture

```
Login Request                    Token Pair Issued
┌──────────┐                     ┌───────────────────────────────┐
│ email    │                     │ Access Token (Bearer)         │
│ password │──► Verify ──────►   │ • In-memory (React state)     │
└──────────┘    bcrypt (cost 12) │ • Expires: 15 minutes         │
                                 │ • Payload: { userId, email }  │
                                 │                               │
                                 │ Refresh Token (HTTP-Only)     │
                                 │ • httpOnly, Secure cookie     │
                                 │ • SameSite: Strict            │
                                 │ • Expires: 7 days             │
                                 │ • Payload: { userId, version }│
                                 └───────────────────────────────┘
```

| Token | Storage | Lifetime | Rotation |
|-------|---------|----------|---------|
| **Access Token** | In-memory (React context) | 15 minutes | On every `/api/auth/refresh` |
| **Refresh Token** | HTTP-Only Secure cookie | 7 days | Rotated on each use (old token invalidated) |

#### Additional Security Measures

1. **Refresh Token Versioning** — `User.refreshTokenVersion` is stored in MongoDB. On password change or force logout, the version increments, instantly invalidating all outstanding refresh tokens.
2. **Helmet.js** — Standard HTTP security headers (CSP, X-Frame-Options, HSTS).
3. **CORS** — Strict origin whitelist; production domain only.
4. **Input Sanitization** — All user text is sanitized with `xss` library before reaching the LLM, preventing stored XSS-based prompt injection.
5. **bcrypt** — Password hashing at cost factor 12.

### 7.2 Rate Limiting Implementation

```typescript
// server/src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';

// IP-based — brute force protection for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

// User-based — protects the expensive AI endpoint
export const braindumpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  keyGenerator: (req) => (req as any).userId,
  message: { error: 'Processing limit reached. Please wait before submitting again.' },
});

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => (req as any).userId || req.ip,
});
```

### 7.3 Optimistic UI State Machine

```
            ┌─────────────┐
            │    IDLE     │
            └──────┬──────┘
                   │ User submits text
                   ▼
            ┌─────────────────────────────┐
            │         PENDING             │
            │  • Raw text shown in feed   │
            │  • Breathing pulse animation│
            │  • Input field cleared      │
            └───────────┬─────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
        Success                   Error
           │                         │
           ▼                         ▼
  ┌─────────────────┐       ┌──────────────────────┐
  │   CONFIRMED     │       │        FAILED         │
  │  • Replace with │       │  • Rollback feed      │
  │    real entries │       │  • Restore text       │
  │  • Green check  │       │  • Show retry CTA     │
  │  • 2s then IDLE │       │  • Manual IDLE reset  │
  └─────────────────┘       └──────────────────────┘
```

#### Optimistic Feed Contract (No React Query)

Sage does not use React Query — there is no `@tanstack/react-query` dependency in
the client. Optimistic UI is implemented directly with `useState` in
`client/src/components/Composer.tsx`, which drives a `FeedItem` union:

```typescript
// client/src/lib/feed.ts
export type FeedItem =
  | { status: 'pending'; id: string; raw_text: string }
  | { status: 'error';   id: string; raw_text: string; errorMessage: string }
  | { status: 'done';    id: string; data: BrainDumpResponse };
```

On submit, `Composer`: (1) clears the input immediately, without waiting on the
LLM round trip; (2) generates a local `id` and calls `onSubmitStart(id, rawText)`
so `Dashboard` (client/src/pages/Dashboard.tsx) renders a `{ status: 'pending' }`
item right away; (3) on the `POST /api/braindump` response, calls
`onSubmitSuccess(id, data)` or `onSubmitError(id, message)`. Errors also surface
via a toast (`client/src/contexts/ToastContext.tsx` + `client/src/hooks/useToast.ts`
— a plain React context, no external toast library) plus a retryable error card
rendered by `client/src/components/ActivityFeed.tsx`.

#### Feed Persistence Across Reload

The activity feed previously existed only in React state, populated from live
`POST /api/braindump` responses — refreshing the page silently lost the day's feed
even though it was already persisted in MongoDB. `Dashboard.tsx` now hydrates on
mount via `client/src/lib/hydrateFeed.ts`, which calls `GET /api/dashboard/today`
(§6.2) and reconstructs `FeedItem[]` by grouping the returned Entry/HabitLog docs
by their shared `braindump_id` (§5.3, §5.4).

### 7.4 Performance Budget

| Metric | Target | Strategy |
|--------|--------|----------|
| First Contentful Paint | < 1.5 s | Vite code splitting, preloaded critical CSS |
| Brain dump round-trip | < 5 s (p95) | Gemini Flash low-latency, ADK schema validation short-circuits |
| Dashboard load | < 800 ms | MongoDB compound indexes, single `/dashboard/today` fetch on mount (no client-side query cache), `.lean()` queries |
| Media upload | Local disk (dev) | Direct-to-object-storage upload is the production design target, not yet implemented |
| JS bundle size | < 250 KB gzipped | Tree-shaking, dynamic imports for chart components |

### 7.5 Error Handling Matrix

| Scenario | Client Behavior | Server Behavior |
|----------|----------------|-----------------|
| LLM returns malformed JSON | Show "partially processed" + retry CTA | Zod catches; return 422 with partial results |
| LLM timeout (> 30 s) | Retain text; show timeout toast | ADK `RetryConfig` tries 3×; if all fail, return 504 |
| MongoDB write failure | Rollback optimistic UI | Return 500; use Mongoose sessions for atomicity |
| Media upload failure | Client retries 3× | Local disk today; pre-signed URL retry model applies once object storage is implemented |
| JWT expired | Silent refresh via cookie | Return 401; client calls `/api/auth/refresh` |
| Rate limit exceeded | Show cool-down timer | Return 429 with `Retry-After` header |

### 7.6 Prompt Injection Mitigation

1. **Schema enforcement** — ADK 2.0's `output_schema` forces the LLM to return valid Pydantic-typed JSON. Injected instructions that attempt to alter the output format are rejected by the schema validator before the response reaches the backend.
2. **Input sanitization** — Strip HTML/script tags from user text via `xss` library before sending to the agent.
3. **Output bounds validation** — Zod validates every field. Out-of-bounds values (e.g., `calories: -500`, `mood_score: 99`) are rejected at the backend layer.
4. **No destructive tools** — `router_agent` has no tools at all (read or write); it only returns structured JSON. All MongoDB writes occur in the Node.js backend (`braindump.routes.ts`) after schema validation, not inside the agent.

---

## 8. Appendices

### Appendix A: Environment Variables

```bash
# .env.example

# ── Server ────────────────────────────────
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

# ── Authentication ────────────────────────
JWT_ACCESS_SECRET=<random-256-bit-hex>
JWT_REFRESH_SECRET=<random-256-bit-hex>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_COST_FACTOR=12

# ── MongoDB ────────────────────────────────
# Leave unset to auto-start a persistent embedded MongoDB for local dev.
# Set this to use a real instance instead (Atlas, staging, etc).
# MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/sage?retryWrites=true&w=majority

# ── Redis (BullMQ specialist job queues) ──
# Leave unset to auto-start an in-memory Redis for local dev.
# REDIS_URL=

# ── Google AI / ADK ───────────────────────
ADK_AGENT_URL=http://localhost:8001    # Python agent microservice

# agent/.env (separate service, not the server's .env):
# GEMINI_API_KEY=<gemini-api-key>       # or GOOGLE_CLOUD_PROJECT for Vertex AI

# ── Media Storage ─────────────────────────
# No env vars today — local disk storage under server/uploads/.
# Cloudflare R2 (or another S3-compatible store) is the planned production
# target; its credentials are not yet part of the configuration surface.
```

### Appendix B: Project Directory Structure

```
sage/
├── client/                          # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.tsx         # Page chrome, background, theme toggle mount
│   │   │   ├── Composer.tsx         # Universal Input Portal + optimistic submit
│   │   │   ├── ActivityFeed.tsx     # Renders FeedItem[] (pending/error/done)
│   │   │   ├── InsightsPanel.tsx    # Weekly insight + specialist pattern cards
│   │   │   ├── Logo.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── ToastContext.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useToast.ts
│   │   │   ├── useThemeMode.ts
│   │   │   └── useSpeechRecognition.ts
│   │   ├── lib/                     # API client, utilities (feed.ts, hydrateFeed.ts, braindump.ts)
│   │   ├── pages/                   # Dashboard.tsx, Login.tsx, Register.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                # Tailwind directives + theme tokens
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/                          # Node.js + Express backend
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verification
│   │   │   ├── rateLimiter.ts
│   │   │   └── validate.ts          # Zod request validation
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── braindump.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── entries.routes.ts
│   │   │   ├── habits.routes.ts
│   │   │   ├── journal.routes.ts
│   │   │   ├── media.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Entry.ts
│   │   │   └── HabitLog.ts
│   │   ├── services/
│   │   │   ├── agent.service.ts     # ADK 2.0 HTTP invocation (router + specialists)
│   │   │   └── media.service.ts     # Local-disk storage + mock presign (§2.1)
│   │   ├── queues/                  # BullMQ job definitions, Redis connection, Bull Board admin UI
│   │   │   └── handlers/            # journalEnrich, sleepAnalyze, somaticCorrelate, expenseAnalyze, timeAnalyze, insightSynthesize, dailySweep
│   │   ├── utils/
│   │   │   ├── timezone.ts          # getUserLocalMidnight, getUserLocalDayBounds, getLocalCalendarAnchor
│   │   │   └── logger.ts            # Winston logger
│   │   ├── config/db.ts
│   │   └── app.ts
│   └── tsconfig.json
│
├── agent/                           # ADK 2.0 Python microservice
│   ├── app/
│   │   ├── agent.py                 # root_agent (Workflow): router_agent + fan-out/join
│   │   ├── specialists.py           # Async specialist LlmAgents
│   │   ├── schemas.py                # Pydantic I/O schemas (SageAgentOutput, etc.)
│   │   ├── fast_api_app.py          # FastAPI wrapper (/process, /specialists/{name})
│   │   └── app_utils/               # a2a.py, telemetry.py, services.py, typing.py
│   ├── tests/                       # unit/, integration/, eval/
│   ├── deployment/terraform/        # Cloud Run infra
│   ├── Dockerfile
│   ├── agents-cli-manifest.yaml
│   ├── dataset.jsonl                # Eval dataset
│   └── .env
│
├── shared/                          # @sage/shared — Zod schemas + TS types
│   ├── schemas/braindump.ts
│   ├── schemas/auth.ts
│   └── package.json
│
├── .env.example
├── pnpm-workspace.yaml
└── README.md
```

### Appendix C: Tailwind Design Token Configuration

```javascript
// client/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px 0 rgba(139, 92, 246, 0.35)',
        'glow-lg': '0 0 80px 10px rgba(6, 182, 212, 0.25)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 6s ease infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
```

Color tokens themselves are not defined here — they live as CSS custom properties in `client/src/index.css`, switched by the `data-theme` attribute (`dark` | `light`) on `<html>`: `--nova-bg`, `--nova-surface`, `--nova-border`, `--nova-text-primary`, `--nova-text-muted`, `--nova-violet`, `--nova-cyan` (see Brand Identity §3 for the actual hex values per theme).

### Appendix D: ADK Agent ↔ Node.js Integration Pattern

ADK 2.0 is a Python framework; the backend is Node.js. The recommended integration is an **HTTP microservice**:

```python
# agent/app/fast_api_app.py (abridged)

@app.post("/process")
async def process_braindump(payload: BrainDumpRequest):
    session = await session_service.create_session(app_name="app", user_id=payload.user_id)
    user_message = types.Content(role="user", parts=[types.Part(text=payload.text)])

    # Read the router node's raw text output directly off the event stream
    # (author == "router"), rather than via ADK output_key/state_delta.
    router_output_str = None
    async for event in runner.run_async(
        session_id=session.id, user_id=payload.user_id, new_message=user_message,
    ):
        if event.author == "router" and event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    router_output_str = part.text

    if not router_output_str:
        raise HTTPException(status_code=500, detail="Agent produced no parsed output")

    router_output = json.loads(router_output_str)
    return {
        "nutrition": router_output.get("nutrition") or [],
        "expenses": router_output.get("expenses") or [],
        "time_logs": router_output.get("time_logs") or [],
        "habits_completed": router_output.get("habits") or [],
        "sleep": router_output.get("sleep"),
        "somatic_logs": router_output.get("somatic_logs") or [],
        "journal": router_output.get("journal"),
        "raw_text": payload.text,
        "parsed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


@app.post("/specialists/{name}")
async def run_specialist(name: str, request: Request, payload: SpecialistRequest):
    runner = request.app.state.specialist_runners.get(name)
    if runner is None:
        raise HTTPException(status_code=404, detail=f"Unknown specialist: {name}")
    # ... creates a session, sends payload.context as the user message,
    # reads the matching author's text output, and json.loads()s it — same
    # pattern as /process above.
```

```typescript
// server/src/services/agent.service.ts

import { BrainDumpResponseSchema, SPECIALIST_SCHEMAS, SpecialistName } from '@sage/shared';
import logger from '../utils/logger';

const ADK_AGENT_URL = process.env.ADK_AGENT_URL ?? 'http://localhost:8001';

export async function processBrainDump(userId: string, text: string) {
  const response = await fetch(`${ADK_AGENT_URL}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, text }),
    signal: AbortSignal.timeout(30_000),   // 30s hard timeout
  });
  if (!response.ok) throw new Error(`Agent service error: ${response.status}`);
  // Validate agent output before trusting it
  return BrainDumpResponseSchema.parse(await response.json());
}

export async function runSpecialist<T extends SpecialistName>(
  name: T, userId: string, context: object,
) {
  const response = await fetch(`${ADK_AGENT_URL}/specialists/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, context }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Specialist agent error (${name}): ${response.status}`);
  // Validate specialist output before trusting it
  return SPECIALIST_SCHEMAS[name].parse(await response.json());
}
```

Both `/process` and `/specialists/{name}` are called by BullMQ job handlers (`server/src/queues/handlers/*.ts`), not just the synchronous `/api/braindump` path — e.g. `sleepAnalyze.ts`, `somaticCorrelate.ts`, `expenseAnalyze.ts`, `timeAnalyze.ts`, `journalEnrich.ts`, and the weekly `insightSynthesize.ts` handler triggered by the recurring `dailySweep.ts` job.

---

*End of Technical Design Document*

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | July 5, 2026 | System Architecture Team | Initial draft |
| 1.1 | July 5, 2026 | System Architecture Team | Added Sleep & Somatic Logs domains; restructured to hybrid multi-agent architecture (sync core + 4 async specialists) |
| 1.2 | July 5, 2026 | System Architecture Team | Added expense_analyzer and time_analyzer async specialist agents |
| 1.3 | July 6, 2026 | System Architecture Team | Added braindump-linked habit logs, GET /api/dashboard/insights (weekly insight + specialist enrichment surfacing), timezone-safe day-boundary calculation, and persistent optimistic-UI activity feed (FeedItem, feed hydration on reload) |
| 1.4 | July 6, 2026 | System Architecture Team | Removed the v1/v2 dual-UI system; promoted the Nova UI to be the app's sole client (Composer, ActivityFeed, InsightsPanel, AppShell) |
| 1.5 | July 7, 2026 | System Architecture Team | Synced §1, §2, §3, §4, §5.3, §6, §7, and Appendices A–D with the actual implementation: replaced the fictional `cultivator`/`persist_all`/`tools.py`/`prompts.py` agent design with the real `router_agent` + `FunctionNode` fan-out/`JoinNode` graph (no tools); documented the BullMQ/Redis job queue subsystem; corrected media storage (local disk today, not Cloudflare R2), stack versions (Express 4.x, Mongoose 8.x, Tailwind 3.x, TS 6.x client / 5.x server, no Node 26 pin), and dropped the fictional Docker Compose dependency; fixed endpoint contracts (`/api/entries` has no date filter, `/api/habits` has no `streak` field, added `/api/auth/demo-login` and `/api/media/upload`); corrected the `journal` entry `enrichment` behavior and the ExpenseData currency (USD/INR) schema drift |
