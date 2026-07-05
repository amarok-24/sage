# Technical Design Document: Bodhi

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

Bodhi's architecture is governed by three immutable constraints derived from the Brand Identity and PRD:

1. **Zero-friction entry** — The user interacts with a single text input. All structural intelligence lives server-side.
2. **Cloud-first AI** — Zero LLM weights reside on the client or backend. All cognitive processing is offloaded to Google Gemini via the ADK 2.0 agent runtime.
3. **Decoupled media storage** — Binary assets (images, videos) live in Cloudflare R2, keeping MongoDB small and performant for multi-year journaling.

### 1.2 High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              BODHI — SYSTEM ARCHITECTURE                         │
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
  │  │ Dashboard     │  │                              │  ┌────────▼───────────┐  │
  │  │ Views         │  │                              │  │ API Router Layer   │  │
  │  └───────────────┘  │                              │  │ /api/braindump     │  │
  │  ┌───────────────┐  │                              │  │ /api/dashboard     │  │
  │  │ Journal &     │  │                              │  │ /api/media         │  │
  │  │ Media Upload  │  │                              │  │ /api/habits        │  │
  │  └───────────────┘  │                              │  └────────┬───────────┘  │
  └─────────────────────┘                              │           │              │
                                                       │  ┌────────▼───────────┐  │
                                                       │  │ ADK 2.0 Agent      │  │
                                                       │  │ Service Layer      │  │
                                                       │  │ (Bodhi Router      │  │
                                                       │  │  Agent)            │  │
                                                       │  └────────┬───────────┘  │
                                                       └───────────┼──────────────┘
                                                                   │
                                        ┌──────────────────────────┼──────────────────┐
                                        │                          │                  │
                                ┌───────▼─────────┐      ┌────────▼────────┐         │
                                │  MongoDB Atlas   │      │  Cloudflare R2  │         │
                                │  (Data Store)    │      │  (Media Bucket) │         │
                                │                  │      │                 │         │
                                │  • Users         │      │  • images/      │         │
                                │  • Entries       │      │  • videos/      │         │
                                │  • Habits        │      │                 │         │
                                │  • Sessions      │      └─────────────────┘         │
                                └──────────────────┘                                  │
                                                                                      │
                              ┌───────────────────────────────────────────────────┐   │
                              │         Google Gemini 3.5 Flash API               │◄──┘
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
                                  │  cultivator (LlmAgent)   │
                                  │    │                     │
                                  │    ▼                     │
                                  │  persist_all (Function)  │
                                  └────────────┬─────────────┘
                                               │
                                  ┌────────────▼─────────────┐
                                  │  MongoDB Atlas (writes)   │
                                  └───────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Stack Matrix

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Frontend Framework** | React (via Vite) | React 19+ / Vite 6+ | Lightning-fast HMR, zero-config TypeScript, tree-shaking. No SSR overhead for a personal SPA. |
| **Frontend Language** | TypeScript | 5.x | Type safety across shared Zod schemas, IDE autocompletion, reduced runtime bugs. |
| **CSS Framework** | Tailwind CSS | 4.x | Utility-first, enabling rapid implementation of Bodhi's organic design language (earth tones, fluid transitions). |
| **Backend Runtime** | Node.js | 26 LTS | Unified TypeScript ecosystem. Native `fetch`, `crypto`, and ESM support. |
| **Backend Framework** | Express.js | 5.x | Mature middleware ecosystem (JWT, rate limiting, CORS). Lightweight and well-understood. |
| **Validation** | Zod | 3.x | Runtime schema validation on client and server. Drives the ADK agent's structured output contract. |
| **AI Agent Runtime** | Google ADK 2.0 | ≥ 2.0.0 | Graph-based `Workflow` engine with fan-out/fan-in, conditional routing, and Pydantic `output_schema` for deterministic structured output. |
| **LLM Model** | Gemini 3.5 Flash | Latest | High-speed structured output, excellent multilingual + Indian food corpus coverage. |
| **Database** | MongoDB Atlas | 8.x (M0 Free Tier) | Flexible document schema for heterogeneous entry types. Native JSON storage aligns with LLM outputs. |
| **ODM** | Mongoose | 10.x | Schema enforcement, middleware hooks, population. Mature TypeScript support. |
| **Media Storage** | Cloudflare R2 | S3-compatible | Zero egress fees, global edge caching, S3-compatible SDK. |
| **Authentication** | JWT (jsonwebtoken) | 9.x | Stateless auth for SPA. Short-lived access tokens + HTTP-only refresh tokens. |
| **Rate Limiting** | express-rate-limit | 7.x | IP-based + user-based rate limiting to protect the AI endpoint. |

### 2.2 Development Tooling

| Tool | Purpose |
|------|---------|
| pnpm | Package management (workspace-aware monorepo) |
| Vitest | Unit and integration testing (Vite-native) |
| ESLint + Prettier | Code quality and formatting |
| Docker Compose | Local MongoDB + development services |
| GitHub Actions | CI/CD pipeline |

---

## 3. Core Workflows

### 3.1 Workflow 1: Universal Input ("Brain Dump") Processing

This is the primary interaction pathway. A single unstructured text input is transformed into multiple structured database records simultaneously.

#### Sequence Diagram

```
┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌────────────┐
│  User   │   │  React   │   │  Node.js     │   │ ADK 2.0  │   │  MongoDB   │
│         │   │  Client  │   │  Backend     │   │  Agent   │   │  Atlas     │
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
     │             │                │ Invoke Workflow  │               │
     │             │                │─────────────────►               │
     │             │                │                 │ Gemini Flash  │
     │             │                │                 │ Structured    │
     │             │                │                 │ Output        │
     │             │                │                 │               │
     │             │                │                 │ persist_all   │
     │             │                │                 │───────────────►
     │             │                │ Structured result│               │
     │             │                │◄─────────────────│               │
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
4. **Node.js backend** validates the JWT, applies rate limiting, then calls the ADK 2.0 `bodhi_router` Workflow via the Python agent microservice.
5. **ADK Workflow** executes: `START → cultivator (LlmAgent) → persist_all`.
6. **Response** returns structured entries; client reconciles optimistic state with confirmed data.

### 3.2 Workflow 2: Indian Food Macro Estimation

#### The Problem

Existing nutrition APIs index heavily on Western food databases (USDA, FatSecret). They fail on Indian colloquial terms — *"2 katori rajma chawal"*, *"3 rotis with dal makhani"*, *"1 plate poha with sev"*.

#### The Solution

Bodhi leverages Gemini 3.5 Flash's internal training corpus, which covers Indian nutritional data extensively. The ADK agent's system prompt embeds a **calibrated reference table** for common Indian measurements, ensuring consistent estimation without any third-party API.

#### Measurement Reference Table (Embedded in Agent Prompt)

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

```
┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌───────────────┐
│  User   │   │  React   │   │  Node.js     │   │ Cloudflare R2 │
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

1. Client requests pre-signed upload URLs (`GET /api/media/presign?count=N`).
2. Backend generates Cloudflare R2 signed PUT URLs (5-minute expiry, max 50 MB/file).
3. Client uploads **directly to R2** — backend is never a media proxy.
4. Client submits journal entry with the R2 public URLs.
5. Backend persists the entry and enqueues async AI enrichment (mood score, tags, summary snippet).

### 3.4 Workflow 4: Habit Streak Tracking

```
Input: "Did my morning meditation and workout today"

ADK Agent:
  1. Fetches user's habit list via tool: ["meditation", "workout", "reading"]
  2. Fuzzy NLP match: "meditation" ✓  |  "workout" ✓  |  "reading" ✗
  3. Returns: habits_completed: ["meditation", "workout"]

Backend (habit.service.ts):
  1. Upsert HabitLog: { meditation: completed, workout: completed }
  2. Recalculate streaks:
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

### 4.2 Agent Persona: "The Bodhi Cultivator"

```
SYSTEM PROMPT (Bodhi Cultivator Agent):
────────────────────────────────────────
You are The Cultivator — the intelligent core of the Bodhi system.
Your role is to receive raw, unstructured user input (a "seed") and
nurture it into structured, categorized data (the "roots" of the
user's Second Brain).

BEHAVIOR DIRECTIVES:
1. Parse the input into ALL applicable categories simultaneously.
   A single sentence may contain nutrition, expense, time, habit,
   AND journal data. Extract all of them.
2. NEVER ask for clarification. Make your best inference and commit.
3. For Indian food items, use the calibrated reference table below.
   Never refuse to estimate — always provide your best approximation
   with a confidence indicator (high / medium / low).
4. Default currency is INR (₹) unless explicitly stated otherwise.
5. Time references are relative to the user's local timezone.
6. Habit matching should be fuzzy — "worked out" matches "workout",
   "meditated" matches "meditation", "read a chapter" matches "reading".
7. For SLEEP data, extract bedtime, wake time, duration, and subjective
   quality. Infer quality from phrases like "slept well" (deep),
   "tossed and turned" (poor), "okay sleep" (moderate).
8. For SOMATIC LOGS, extract symptom name, severity (1–10), affected
   body area, any remedy taken, and whether it resolved. Always log
   these — even minor mentions like "slight headache" or "felt nauseous".

INDIAN FOOD REFERENCE TABLE:
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
2. Frontend type safety via the `@bodhi/shared` package.
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

### 4.4 ADK 2.0 Workflow Graph Definition (Python)

```python
# agent/agent.py

from google.adk.agents import LlmAgent
from google.adk.workflow import Workflow, RetryConfig
from google.genai import types as genai_types
from pydantic import BaseModel, Field
from typing import Optional
from agent.prompts import CULTIVATOR_SYSTEM_PROMPT
from agent.schemas import (
    NutritionOutput, ExpenseOutput, TimeLogOutput,
    HabitMatch, SleepLog, SomaticLog, JournalMetadata,
)
from agent.tools import get_user_habits, persist_entries


# ── Unified Pydantic Output Schema ──────────────────────────────────

class FullParsedOutput(BaseModel):
    nutrition:         list[NutritionOutput]  = []
    expenses:          list[ExpenseOutput]    = []
    time_logs:         list[TimeLogOutput]    = []
    habits_completed:  list[HabitMatch]       = []
    sleep:             Optional[SleepLog]     = None
    somatic_logs:      list[SomaticLog]       = []
    journal:           Optional[JournalMetadata] = None


# ── LLM Agent: The Cultivator ───────────────────────────────────────

cultivator = LlmAgent(
    name="cultivator",
    model="gemini-3.5-flash",
    instruction=CULTIVATOR_SYSTEM_PROMPT,
    output_schema=FullParsedOutput,
    output_key="parsed_result",
    generate_content_config=genai_types.GenerateContentConfig(
        temperature=0.1,          # Low temperature for determinism
        max_output_tokens=4096,
    ),
    tools=[get_user_habits],      # Read-only: fetch user's defined habits
)


# ── Persistence Node ────────────────────────────────────────────────

def persist_all(ctx, node_input: dict) -> dict:
    """
    Receives the fully parsed output from the cultivator and writes
    all entity types to MongoDB via pre-defined tool functions.
    Returns a summary of created entry IDs.
    """
    result = FullParsedOutput(**node_input)
    created_ids = []

    for entity_list, persist_fn in [
        (result.nutrition,        persist_entries.nutrition),
        (result.expenses,         persist_entries.expense),
        (result.time_logs,        persist_entries.time_log),
        (result.habits_completed, persist_entries.habit),
    ]:
        for item in entity_list:
            entry_id = persist_fn(ctx, item)
            created_ids.append(entry_id)

    if result.sleep:
        entry_id = persist_entries.sleep(ctx, result.sleep)
        created_ids.append(entry_id)

    for s in result.somatic_logs:
        entry_id = persist_entries.somatic(ctx, s)
        created_ids.append(entry_id)

    if result.journal:
        entry_id = persist_entries.journal(ctx, result.journal)
        created_ids.append(entry_id)

    return {"entries_created": created_ids}


# ── ADK 2.0 Workflow Definition ─────────────────────────────────────

root_agent = Workflow(
    name="bodhi_router",
    description=(
        "Bodhi's Universal Input Router — parses unstructured text "
        "into structured life data across nutrition, expenses, time, "
        "habits, and journaling."
    ),
    edges=[
        ('START', cultivator),
        (cultivator, persist_all),
    ],
    retry_config=RetryConfig(
        max_attempts=3,
        initial_delay=1.0,
        backoff_factor=2.0,
        jitter=0.5,
    ),
)
```

### 4.5 Hybrid Multi-Agent Architecture

Bodhi uses a **hybrid multi-agent pattern** — a fast synchronous core agent for real-time parsing, backed by asynchronous specialist agents for background enrichment.

#### Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                          bodhi_router Workflow                                │
│                                                                               │
│  ┌─────────┐     ┌───────────────────────┐     ┌───────────────────────────┐  │
│  │  START  │────►│   cultivator          │────►│     persist_all           │  │
│  │         │     │   (LlmAgent)          │     │     (Function)            │  │
│  │ User    │     │                       │     │                           │  │
│  │ text    │     │ Model: gemini-3.5-    │     │ • Write nutrition entries  │  │
│  │ + userId│     │        flash          │     │ • Write expense entries    │  │
│  │         │     │                       │     │ • Write time log entries   │  │
│  │         │     │ Schema: FullParsed    │     │ • Write sleep logs         │  │
│  │         │     │         Output        │     │ • Write somatic logs       │  │
│  │         │     │                       │     │ • Upsert habit logs        │  │
│  │         │     │ Parses ALL 7 domains  │     │ • Save journal entry       │  │
│  │         │     │ in one LLM call       │     │                           │  │
│  │         │     │                       │     │ Enqueues async tasks ─────┐│  │
│  │         │     │ Tool: get_user_habits │     │                          ││  │
│  └─────────┘     └───────────────────────┘     └──────────────────────────┘│  │
│                                                                            │  │
│  Synchronous — p95 latency target: < 5s                                   │  │
└───────────────────────────────────────────────────────────────────────────┘│
                                                                             │
  ┌──────────────────────────────────────────────────────────────────────────┘
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
| **Synchronous Core** | `cultivator` (single LlmAgent) | Inline — blocks the HTTP response | 2–4s (one Gemini round-trip) |
| **Async Specialists** | `journal_enricher`, `sleep_analyzer`, `somatic_correlator`, `expense_analyzer`, `time_analyzer`, `insight_synthesizer` | Background — queued after persist / end of day | 0s (invisible to user) |

This architecture preserves the **zero-friction, instant-feedback** promise of the Brand Identity while enabling deep, multi-domain intelligence that runs silently in the background.

### 4.6 Async Specialist Agent Definitions

```python
# agent/specialists.py

from google.adk.agents import LlmAgent
from agent.schemas import (
    JournalMetadata, SleepAnalysis, SomaticCorrelation,
    ExpenseAnalysis, TimeAnalysis, WeeklyInsight,
)


journal_enricher = LlmAgent(
    name="journal_enricher",
    model="gemini-3.5-flash",
    instruction="""
    You are a reflective journaling assistant. Given a raw journal entry, produce:
    1. mood_score (1–10, where 10 is peak positivity)
    2. 3–5 thematic tags (e.g. "fitness", "deep-work", "stress", "family")
    3. summary_snippet: a single-sentence TL;DR of the day

    Be empathetic but objective. Do not project emotions not present in the text.
    """,
    output_schema=JournalMetadata,
    output_key="journal_enrichment",
)


sleep_analyzer = LlmAgent(
    name="sleep_analyzer",
    model="gemini-3.5-flash",
    instruction="""
    You are a sleep quality analyst. Given a user's sleep log and their
    recent 7-day sleep history, produce:
    1. consistency_score (1–10): How regular is their sleep/wake schedule?
    2. circadian_alignment: "aligned", "slightly_shifted", or "misaligned"
    3. recommendation: A single actionable tip (e.g., "Consider a consistent
       10:30 PM bedtime to align with your natural wake pattern.")
    """,
    output_schema=SleepAnalysis,
    output_key="sleep_analysis",
)


somatic_correlator = LlmAgent(
    name="somatic_correlator",
    model="gemini-3.5-flash",
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
    output_key="somatic_correlation",
)


expense_analyzer = LlmAgent(
    name="expense_analyzer",
    model="gemini-3.5-flash",
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
    output_key="expense_analysis",
)


time_analyzer = LlmAgent(
    name="time_analyzer",
    model="gemini-3.5-flash",
    instruction="""
    You are a productivity and flow state analyst. Given a user's daily time logs,
    produce:
    1. deep_work_ratio: Ratio of focused work vs shallow/admin work.
    2. time_drain: Identify the biggest time sink (e.g., "doomscrolling").
    3. optimization_tip: A single tip (e.g., "You logged 2 hours of deep focus
       in the morning; protect this window tomorrow.")
    """,
    output_schema=TimeAnalysis,
    output_key="time_analysis",
)


insight_synthesizer = LlmAgent(
    name="insight_synthesizer",
    model="gemini-3.5-flash",
    instruction="""
    You are Bodhi's weekly insight engine. Given a user's aggregated data
    across all 7 domains (nutrition, expenses, time, habits, sleep, somatic,
    journal) for the past 7 days, produce:
    1. top_insight: The single most impactful cross-domain correlation.
    2. supporting_data: 2–3 data points that support the insight.
    3. growth_area: One area where the user can improve next week.
    4. celebration: One thing the user did well this week.
    """,
    output_schema=WeeklyInsight,
    output_key="weekly_insight",
)
```

### 4.7 Agent Orchestration: Sync vs. Async Flow

```
User submits brain dump
        │
        ▼
┌─── SYNCHRONOUS (blocks response) ───────────────────────────┐
│                                                              │
│   cultivator (LlmAgent)  →  persist_all (Function)          │
│   • 1 LLM call                                              │
│   • Parses all 7 domains                                    │
│   • Returns structured entries to client                     │
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
│       → Updates: mood_score, tags, summary_snippet           │
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

export type EntryType = 'nutrition' | 'expense' | 'time_log' | 'sleep' | 'somatic_log' | 'journal';

export interface IEntry extends Document {
  userId:       Types.ObjectId;
  type:         EntryType;
  date:         Date;          // Logical date (user's local date at midnight)
  raw_text:     string;        // Original brain dump text
  braindump_id: string;        // Groups all entries from one brain dump
  data:         Record<string, any>;   // Polymorphic payload
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
    enum: ['nutrition', 'expense', 'time_log', 'sleep', 'somatic_log', 'journal'],
    required: true, index: true,
  },
  date:         { type: Date, required: true, index: true },
  raw_text:     { type: String, required: true },
  braindump_id: { type: String, required: true, index: true },
  data:         { type: Schema.Types.Mixed, required: true },
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
| `sleep` | `{ bedtime, wake_time, duration_hours, quality, notes?, consistency_score?, circadian_alignment? }` |
| `somatic_log` | `{ symptom, severity, body_area?, remedy_taken?, duration_minutes?, resolved, potential_triggers?[], suggestion? }` |
| `journal` | `{ text, media_urls[], mood_score, tags[], summary_snippet, ai_enriched }` |

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
  createdAt:     Date;
}

const HabitLogSchema = new Schema<IHabitLog>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  habitName: { type: String, required: true },
  date:      { type: Date, required: true },
  completed: { type: Boolean, required: true, default: true },
  currentStreak: { type: Number, default: 1 },
  source:    { type: String, enum: ['braindump', 'manual'], default: 'braindump' },
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

### 6.2 Core Data

| Method | Endpoint | Auth | Request / Query | Response |
|--------|----------|------|-----------------|----------|
| `POST` | `/api/braindump` | JWT | `{ text, timestamp? }` | `{ braindump_id, entries_created[], habits_updated[] }` |
| `GET` | `/api/dashboard/today` | JWT | — | `{ nutrition[], expenses[], time_logs[], journal, habits[] }` |
| `GET` | `/api/dashboard/summary` | JWT | `?range=week\|month&date=` | `{ totals: { calories, expenses, hours }, streaks[] }` |
| `GET` | `/api/entries` | JWT | `?type=&from=&to=&page=1&limit=20` | `{ entries[], pagination }` |
| `GET` | `/api/entries/:id` | JWT | — | `{ entry }` |
| `PATCH` | `/api/entries/:id` | JWT | `{ data: Partial<EntryData> }` | `{ entry }` |
| `DELETE` | `/api/entries/:id` | JWT | — | `{ success: true }` |

### 6.3 Habits

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| `GET` | `/api/habits` | JWT | — | `{ habits: [{ name, icon, streak, completedToday }] }` |
| `POST` | `/api/habits` | JWT | `{ name, aliases?, icon? }` | `{ habit }` |
| `DELETE` | `/api/habits/:name` | JWT | — | `{ success: true }` |
| `POST` | `/api/habits/:name/toggle` | JWT | — | `{ log: HabitLog }` |

### 6.4 Journal & Media

| Method | Endpoint | Auth | Request / Query | Response |
|--------|----------|------|-----------------|----------|
| `POST` | `/api/journal` | JWT | `{ text, media_urls? }` | `{ entry }` |
| `GET` | `/api/journal/recent` | JWT | `?limit=10&offset=0` | `{ entries[] }` |
| `GET` | `/api/media/presign` | JWT | `?count=1&types=image/jpeg` | `{ urls: [{ uploadUrl, publicUrl, expiresAt }] }` |

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

#### React Hook Implementation

```typescript
// client/src/hooks/useBrainDump.ts

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { api } from '../lib/api';
import { BrainDumpResponse } from '@bodhi/shared';

type SubmissionState = 'idle' | 'pending' | 'confirmed' | 'failed';

export function useBrainDump() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SubmissionState>('idle');

  const mutation = useMutation({
    mutationFn: (text: string) =>
      api.post<BrainDumpResponse>('/braindump', { text }),

    onMutate: async (text: string) => {
      setState('pending');
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'today'] });

      const previous = queryClient.getQueryData(['dashboard', 'today']);

      // Optimistic: append pending entry to feed
      queryClient.setQueryData(['dashboard', 'today'], (old: any) => ({
        ...old,
        pendingEntries: [
          ...(old?.pendingEntries || []),
          { id: nanoid(), raw_text: text, status: 'processing' },
        ],
      }));

      return { previous };
    },

    onSuccess: () => {
      setState('confirmed');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setTimeout(() => setState('idle'), 2000);
    },

    onError: (_err, _text, context) => {
      setState('failed');
      if (context?.previous) {
        queryClient.setQueryData(['dashboard', 'today'], context.previous);
      }
    },
  });

  return {
    submit: mutation.mutate,
    state,
    error: mutation.error,
    reset: () => { mutation.reset(); setState('idle'); },
  };
}
```

### 7.4 Performance Budget

| Metric | Target | Strategy |
|--------|--------|----------|
| First Contentful Paint | < 1.5 s | Vite code splitting, preloaded critical CSS |
| Brain dump round-trip | < 5 s (p95) | Gemini Flash low-latency, ADK schema validation short-circuits |
| Dashboard load | < 800 ms | MongoDB compound indexes, React Query caching, `.lean()` queries |
| Media upload | Direct-to-R2 | Client uploads bypass backend — no proxy hop |
| JS bundle size | < 250 KB gzipped | Tree-shaking, dynamic imports for chart components |

### 7.5 Error Handling Matrix

| Scenario | Client Behavior | Server Behavior |
|----------|----------------|-----------------|
| LLM returns malformed JSON | Show "partially processed" + retry CTA | Zod catches; return 422 with partial results |
| LLM timeout (> 30 s) | Retain text; show timeout toast | ADK `RetryConfig` tries 3×; if all fail, return 504 |
| MongoDB write failure | Rollback optimistic UI | Return 500; use Mongoose sessions for atomicity |
| R2 upload failure | Client retries 3× | Pre-signed URL still valid; client retries directly |
| JWT expired | Silent refresh via cookie | Return 401; client calls `/api/auth/refresh` |
| Rate limit exceeded | Show cool-down timer | Return 429 with `Retry-After` header |

### 7.6 Prompt Injection Mitigation

1. **Schema enforcement** — ADK 2.0's `output_schema` forces the LLM to return valid Pydantic-typed JSON. Injected instructions that attempt to alter the output format are rejected by the schema validator before the response reaches the backend.
2. **Input sanitization** — Strip HTML/script tags from user text via `xss` library before sending to the agent.
3. **Output bounds validation** — Zod validates every field. Out-of-bounds values (e.g., `calories: -500`, `mood_score: 99`) are rejected at the backend layer.
4. **No destructive tools** — The agent's only tool is `get_user_habits` (read-only). All writes occur in the `persist_all` backend function after schema validation, not inside the agent.

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

# ── MongoDB ───────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/bodhi?retryWrites=true&w=majority

# ── Google AI / ADK ───────────────────────
GOOGLE_GENAI_API_KEY=<gemini-api-key>
ADK_AGENT_URL=http://localhost:8001    # Python agent microservice
ADK_MODEL=gemini-3.5-flash

# ── Cloudflare R2 ─────────────────────────
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET_NAME=bodhi-media
R2_PUBLIC_URL=https://media.bodhi.app
R2_PRESIGN_EXPIRY_SECONDS=300
```

### Appendix B: Project Directory Structure

```
bodhi/
├── client/                          # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Design system components
│   │   │   ├── dashboard/           # Dashboard widgets
│   │   │   ├── input/               # Universal Input Portal
│   │   │   └── journal/             # Journal & media upload
│   │   ├── hooks/
│   │   │   ├── useBrainDump.ts
│   │   │   ├── useAuth.ts
│   │   │   └── useDashboard.ts
│   │   ├── lib/                     # API client, utilities
│   │   ├── pages/                   # Route-level components
│   │   ├── stores/                  # Zustand state management
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                # Tailwind directives + design tokens
│   ├── tailwind.config.ts
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
│   │   │   ├── agent.service.ts     # ADK 2.0 HTTP invocation
│   │   │   ├── habit.service.ts     # Streak calculation
│   │   │   └── media.service.ts     # R2 signed URL generation
│   │   ├── config/db.ts
│   │   └── app.ts
│   └── tsconfig.json
│
├── agent/                           # ADK 2.0 Python microservice
│   ├── __init__.py
│   ├── agent.py                     # root_agent (Workflow)
│   ├── schemas.py                   # Pydantic output schemas
│   ├── tools.py                     # get_user_habits, persist_entries
│   ├── prompts.py                   # CULTIVATOR_SYSTEM_PROMPT
│   ├── server.py                    # FastAPI wrapper
│   └── .env
│
├── shared/                          # @bodhi/shared — Zod schemas + TS types
│   ├── schemas/braindump.ts
│   ├── schemas/auth.ts
│   └── package.json
│
├── docker-compose.yml               # Local MongoDB
├── .env.example
├── pnpm-workspace.yaml
└── README.md
```

### Appendix C: Tailwind Design Token Configuration

```typescript
// client/tailwind.config.ts

import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bodhi: {
          cream:    '#FAF8F5',   // Primary background
          sand:     '#F0EBE3',   // Secondary background / cards
          bark:     '#8B7355',   // Accent brown
          forest:   '#2D5016',   // Primary green (deep forest)
          sage:     '#87A96B',   // Secondary green
          moss:     '#4A7C59',   // Tertiary green
          charcoal: '#2C2C2C',   // Text primary
          stone:    '#6B6B6B',   // Text secondary
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],         // Journaling / reflective
        sans:  ['Inter', 'system-ui', 'sans-serif'], // Data / dashboard
      },
      animation: {
        'breathe':  'breathe 3s ease-in-out infinite',
        'absorb':   'absorb 0.6s ease-out forwards',
        'fade-up':  'fadeUp 0.4s ease-out forwards',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.02)' },
        },
        absorb: {
          '0%':   { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-10px) scale(0.95)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### Appendix D: ADK Agent ↔ Node.js Integration Pattern

ADK 2.0 is a Python framework; the backend is Node.js. The recommended integration is an **HTTP microservice**:

```python
# agent/server.py  (FastAPI wrapper)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from agent.agent import root_agent

app = FastAPI()
session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name="bodhi",
    session_service=session_service,
)

class BrainDumpRequest(BaseModel):
    user_id: str
    text:    str

@app.post("/process")
async def process_braindump(payload: BrainDumpRequest):
    session = await session_service.create_session(
        app_name="bodhi",
        user_id=payload.user_id,
    )
    user_message = types.Content(
        role="user",
        parts=[types.Part(text=payload.text)]
    )
    result = None
    async for event in runner.run_async(
        session_id=session.id,
        user_id=payload.user_id,
        new_message=user_message,
    ):
        if event.actions and event.actions.state_delta:
            if "parsed_result" in event.actions.state_delta:
                result = event.actions.state_delta["parsed_result"]

    if result is None:
        raise HTTPException(status_code=500, detail="Agent produced no output")

    return result
```

```typescript
// server/src/services/agent.service.ts

import { BrainDumpResponseSchema } from '@bodhi/shared';

const ADK_AGENT_URL = process.env.ADK_AGENT_URL ?? 'http://localhost:8001';

export async function processBrainDump(userId: string, text: string) {
  const response = await fetch(`${ADK_AGENT_URL}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, text }),
    signal: AbortSignal.timeout(30_000),   // 30s hard timeout
  });

  if (!response.ok) {
    throw new Error(`Agent service error: ${response.status}`);
  }

  // Validate agent output before trusting it
  return BrainDumpResponseSchema.parse(await response.json());
}
```

---

*End of Technical Design Document*

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | July 5, 2026 | System Architecture Team | Initial draft |
| 1.1 | July 5, 2026 | System Architecture Team | Added Sleep & Somatic Logs domains; restructured to hybrid multi-agent architecture (sync core + 4 async specialists) |
| 1.2 | July 5, 2026 | System Architecture Team | Added expense_analyzer and time_analyzer async specialist agents |
