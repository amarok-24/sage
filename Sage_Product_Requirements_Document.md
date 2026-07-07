# Product Requirements Document (PRD)

**Project Name:** Sage — Unified Personal "Second Brain" Assistant  
**Document Version:** 1.0  
**Date:** July 5, 2026  

---

## 1. Executive Summary

### 1.1 Problem Statement
Tracking personal metrics—expenses, time allocation, daily habits, nutritional intake, and journaling—typically requires switching context between five different applications. This friction leads to cognitive fatigue, inconsistent tracking, and missing data. Furthermore, existing nutrition applications heavily index on Western datasets, requiring manual deconstruction for regional Indian meals.

### 1.2 The Solution
A unified, zero-friction web application designed around a "Universal Input Portal." Instead of navigating discrete menus, the user provides a single unstructured brain-dump (via text). A cloud-hosted Large Language Model (LLM) utilizing Structured JSON Outputs acts as an intelligent router, parsing the unstructured input into distinct database objects representing the user's journal, time, expenses, sleep, somatic, and nutrition pillars.

---

## 2. Core Principles
* **Zero-Friction Entry:** The interface must prioritize a single, prominent input field.
* **Cloud-First AI:** Offload all heavy inferencing (LLM routing, macro estimation, tagging) to a cloud API (e.g., Gemini 3.1 Flash Lite) to preserve local system RAM and compute.
* **Text-First, Multi-Entity Routing:** A single input string (e.g., *"Spent 150 INR on paneer tikka, spent 1 hour coding, checked off my study habits, slept 8 hours, felt great."*) must concurrently update the database records across all seven domains (nutrition, expenses, time, habits, sleep, somatic, journal).

---

## 3. Feature Specifications

### 3.1 The Universal Input Portal
* **Description:** A primary text input console where the user logs their day conversationally. 
* **Mechanics:**
  * Accepts raw text input, including via free browser-based voice dictation (Web Speech API) that transcribes into the same field.
  * Sends text to the Cloud LLM configured with a strict, multi-entity JSON response schema.
  * Backend routes the returned JSON objects to their respective database collections.

### 3.2 Nutrition (Replenish)
* **Description:** Logs daily food intake and translates plain text into macronutrients and calories.
* **Key Capabilities:**
  * **No Multimodal/Image Input:** Strictly text-based to keep architecture lean.
  * **Native Indian Food Support:** Relies on the LLM's internal corpus to estimate macros for Indian cuisine (e.g., *katori*, *roti*, *dal makhani*) without requiring commercial third-party APIs.
* **AI Output Schema:**
  * `food_items`: Array of objects (`name`, `quantity`, `calories`, `protein_g`, `carbs_g`, `fat_g`).
  * `total_nutrition_summary`: Aggregated daily macros.

### 3.3 Expenses (Resources)
* **Description:** Extracts financial transactions from conversational text.
* **Key Capabilities:**
  * Auto-categorization (e.g., Food, Utility, Entertainment).
  * Merchant inference.
* **AI Output Schema:**
  * `amount` (Float), `currency` (String), `category` (String), `merchant_inferred` (String).

### 3.4 Time (Rhythms)
* **Description:** Retroactive time logging without the use of strict stopwatches.
* **Key Capabilities:**
  * Parses natural language durations (e.g., "Spent the last two hours...").
* **AI Output Schema:**
  * `duration_minutes` (Integer), `activity_category` (String), `description` (String).

### 3.5 Habits (Rhythms)
* **Description:** Maintains consistency streaks based on natural language confirmations.
* **Key Capabilities:**
  * Validates if a defined habit was mentioned in the text block.
  * Automatically flags the habit as `completed = true` for the current date.
  * Also supports a manual toggle path, independent of the brain dump, for marking a habit complete/incomplete directly.

### 3.6 Sleep (Rest)
* **Description:** Logs rest patterns from natural language input and tracks sleep quality over time.
* **Key Capabilities:**
  * Parses bedtime, wake rhythms, and subjective quality from conversational text.
  * Computes rest duration automatically.
  * Tracks rest consistency trends over weeks/months.
* **AI Output Schema:**
  * `bedtime` (ISO8601 timestamp), `wake_time` (ISO8601 timestamp), `duration_hours` (Float), `quality` (Enum: "deep", "moderate", "light", "poor"), `notes` (String, optional).

### 3.7 Somatic (Reactions)
* **Description:** Captures physical symptoms, their severity, and any remedies taken.
* **Key Capabilities:**
  * Extracts symptom type, body location, severity, and duration from text.
  * Logs medications or remedies with timestamps.
  * Enables long-term correlation with nutrition, sleep, and stress data.
* **AI Output Schema:**
  * `symptom` (String), `severity` (Integer, 1–10), `body_area` (String, optional), `remedy_taken` (String, optional), `duration_minutes` (Integer, optional), `resolved` (Boolean).

### 3.8 Journal (Reflections)
* **Description:** A reflective diary capturing subjective experiences, combined with media attachments and automated insights.
* **Key Capabilities:**
  * **Media Uploads:** Backend supports image and video attachments via a presign/upload API; local disk storage is used for development, with a cloud storage bucket (e.g. Cloudflare R2) as the production target. No client UI is wired up to this flow yet — journal entries are currently created via the brain dump or the standalone `/api/journal` endpoint, without media.
  * **AI Asynchronous Enrichment:** Once a journal entry is saved, a background specialist agent (`journal_enricher`) processes the text to generate supplementary insights (mood, tags, summary), surfaced via `GET /api/dashboard/insights`. The mood/tags/summary shown on the entry itself come from the synchronous router call at braindump time.
* **AI Output Schema (Metadata):**
  * `mood_score`: Integer from 1 to 10.
  * `tags`: Array of 3-5 thematic strings (e.g., "fitness", "deep-work").
  * `summary_snippet`: A 1-sentence TL;DR of the day.

---

## 4. Technical Architecture

### 4.1 Frontend Layer
* **Platform:** Web Application (Accessible via desktop/mobile browsers).
* **Framework:** React 19 + Vite 6 + Tailwind CSS 3.
* **Media Handling:** Backend presign/upload API for decoupled cloud storage uploads (local disk today; Cloudflare R2 or another S3-compatible store planned for production). No client UI is wired up to this yet.

### 4.2 Backend Layer
* **Framework:** Node.js (Express).
* **Role:**
  1. Serve the frontend application's REST APIs.
  2. Manage signed URLs / local storage for media uploads.
  3. Communicate with the Cloud LLM agent (Gemini 3.1 Flash Lite) via an HTTP microservice.
  4. Route LLM outputs to the database, and queue background specialist agent jobs (BullMQ + Redis) for enrichment and weekly insights.

### 4.3 Data Storage Layer
* **Database:** MongoDB (Atlas free tier in production; an embedded in-process MongoDB for local dev). Stores textual data, JSON metadata, and relationships.
* **Blob/Media Storage:** Local disk today; a cloud object store (e.g. Cloudflare R2) is the planned production target.

### 4.4 Artificial Intelligence Layer
* **Model:** Google Gemini 3.1 Flash Lite.
* **Technique:** `response_schema` enforcement using Pydantic (Python) or Zod (TypeScript) validation objects to ensure 100% predictable JSON outputs. Note: the Pydantic and Zod schemas have drifted on one field — `ExpenseData.currency` defaults to `"USD"` on the Python/agent side but `"INR"` on the Zod/Node side (and `"INR"` is the user preference default) — this should be reconciled given the product's India-centric framing.

---

## 5. Non-Functional Requirements
* **Performance:**
  * The frontend must remain unblocked while the AI processes data.
  * Text logging should instantly update the UI optimistically, while AI processing and routing happen asynchronously in the background.
* **Resource Efficiency:**
  * The application must remain highly performant on hardware with limited unified memory (e.g., 8GB RAM). Zero LLM weights will be loaded locally; 100% of the cognitive processing is offloaded to the cloud API.
* **Scalability:**
  * Decoupled storage for media ensures the primary database remains small and fast, avoiding storage bloat over years of journaling.

---

## 6. Future Scope
* Reintroduce Multimodal (Image) support for automated receipt scanning and visual food plate analysis.
* Predictive Analytics: "Your productivity score correlates positively with 80g+ of protein intake."
* Native mobile applications built on React Native/Flutter once the web logic is battle-tested.
