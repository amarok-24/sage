# Product Requirements Document (PRD)
**Project Name:** Unified Personal "Second Brain" Assistant  
**Document Version:** 1.0  
**Date:** June 20, 2026  

---

## 1. Executive Summary

### 1.1 Problem Statement
Tracking personal metrics—expenses, time allocation, daily habits, nutritional intake, and journaling—typically requires switching context between five different applications. This friction leads to cognitive fatigue, inconsistent tracking, and missing data. Furthermore, existing nutrition applications heavily index on Western datasets, requiring manual deconstruction for regional Indian meals.

### 1.2 The Solution
A unified, zero-friction web application designed around a "Universal Input Portal." Instead of navigating discrete menus, the user provides a single unstructured brain-dump (via text). A cloud-hosted Large Language Model (LLM) utilizing Structured JSON Outputs acts as an intelligent router, parsing the unstructured input into distinct database objects for expenses, time logs, habits, nutrition, sleep, and somatic symptoms. A journaling layer aggregates emotional and contextual metadata.

---

## 2. Core Principles
* **Zero-Friction Entry:** The interface must prioritize a single, prominent input field.
* **Cloud-First AI:** Offload all heavy inferencing (LLM routing, macro estimation, tagging) to a cloud API (e.g., Gemini 2.0 Flash) to preserve local system RAM and compute.
* **Text-First, Multi-Entity Routing:** A single input string (e.g., *"Spent $15 on paneer tikka, took 1 hour, checking off my study habit, felt great today."*) must concurrently update the financial, nutritional, time, habit, and journal databases.

---

## 3. Feature Specifications

### 3.1 The Universal Input Portal
* **Description:** A primary text input console where the user logs their day conversationally. 
* **Mechanics:** * Accepts raw text input.
  * Sends text to the Cloud LLM configured with a strict, multi-entity JSON response schema.
  * Backend routes the returned JSON objects to their respective database collections.

### 3.2 Nutrition & Food Tracking (Text-to-Macro)
* **Description:** Logs daily food intake and translates plain text into macronutrients and calories.
* **Key Capabilities:**
  * **No Multimodal/Image Input:** Strictly text-based to keep architecture lean.
  * **Native Indian Food Support:** Relies on the LLM's internal corpus to estimate macros for Indian cuisine (e.g., *katori*, *roti*, *dal makhani*) without requiring commercial third-party APIs.
* **AI Output Schema:**
  * `food_items`: Array of objects (`name`, `quantity`, `calories`, `protein_g`, `carbs_g`, `fat_g`).
  * `total_nutrition_summary`: Aggregated daily macros.

### 3.3 Expense Tracking
* **Description:** Extracts financial transactions from conversational text.
* **Key Capabilities:**
  * Auto-categorization (e.g., Food, Utility, Entertainment).
  * Merchant inference.
* **AI Output Schema:**
  * `amount` (Float), `currency` (String), `category` (String), `merchant_inferred` (String).

### 3.4 Time Auditing
* **Description:** Retroactive time logging without the use of strict stopwatches.
* **Key Capabilities:**
  * Parses natural language durations (e.g., "Spent the last two hours...").
* **AI Output Schema:**
  * `duration_minutes` (Integer), `activity_category` (String), `description` (String).

### 3.5 Habit Tracking
* **Description:** Maintains consistency streaks based on natural language confirmations.
* **Key Capabilities:**
  * Validates if a defined habit was mentioned in the text block.
  * Automatically flags the habit as `completed = true` for the current date.

### 3.6 Sleep & Restfulness Tracking
* **Description:** Logs sleep patterns from natural language input and tracks rest quality over time.
* **Key Capabilities:**
  * Parses bedtime, wake time, and subjective quality from conversational text.
  * Computes sleep duration automatically.
  * Tracks sleep consistency trends over weeks/months.
* **AI Output Schema:**
  * `bedtime` (ISO8601 timestamp), `wake_time` (ISO8601 timestamp), `duration_hours` (Float), `quality` (Enum: "deep", "moderate", "light", "poor"), `notes` (String, optional).

### 3.7 Somatic Logs & Symptom Tracking
* **Description:** Captures physical symptoms, their severity, and any remedies taken.
* **Key Capabilities:**
  * Extracts symptom type, body location, severity, and duration from text.
  * Logs medications or remedies with timestamps.
  * Enables long-term correlation with nutrition, sleep, and stress data.
* **AI Output Schema:**
  * `symptom` (String), `severity` (Integer, 1–10), `body_area` (String, optional), `remedy_taken` (String, optional), `duration_minutes` (Integer, optional), `resolved` (Boolean).

### 3.8 Daily Journaling & Media Integration
* **Description:** A reflective diary capturing subjective experiences, combined with media attachments and automated insights.
* **Key Capabilities:**
  * **Media Uploads:** Supports image and video attachments. Media is directly uploaded to a cloud storage bucket, and public URLs are saved to the database.
  * **AI Asynchronous Enrichment:** Once a journal entry is saved, a background worker passes the text to the LLM to generate insights.
* **AI Output Schema (Metadata):**
  * `mood_score`: Integer from 1 to 10.
  * `tags`: Array of 3-4 thematic strings (e.g., "fitness", "deep-work").
  * `summary_snippet`: A 1-sentence TL;DR of the day.

---

## 4. Technical Architecture

### 4.1 Frontend Layer
* **Platform:** Web Application (Accessible via desktop/mobile browsers).
* **Framework:** Next.js (React) or Vite + React. 
* **Media Handling:** Native HTML `<input type="file" accept="image/*,video/*" />` for decoupled cloud bucket uploads.

### 4.2 Backend Layer
* **Framework:** Node.js (Express/Bun) or Python (FastAPI).
* **Role:**
  1. Serve the frontend application.
  2. Provide REST/GraphQL API endpoints.
  3. Manage Cloud Storage signed URLs for media uploads.
  4. Communicate with the Cloud LLM via official SDKs.
  5. Route LLM JSON outputs to the correct database clusters.

### 4.3 Data Storage Layer
* **Database:** MongoDB Atlas (Free Tier) or Supabase (PostgreSQL). Stores textual data, JSON metadata, and relationships.
* **Blob/Media Storage:** Cloudflare R2 or Supabase Storage. Stores physical images and videos, returning URL strings to the database.

### 4.4 Artificial Intelligence Layer
* **Model:** Google Gemini 2.0 / Flash (or equivalent high-speed structured-output model).
* **Technique:** `response_schema` enforcement using Pydantic (Python) or Zod (TypeScript) validation objects to ensure 100% predictable JSON outputs.

---

## 5. Non-Functional Requirements

* **Performance:** * The frontend must remain unblocked while the AI processes data.
  * Text logging should instantly update the UI optimistically, while AI processing and routing happen asynchronously in the background.
* **Resource Efficiency:**
  * The application must remain highly performant on hardware with limited unified memory (e.g., 8GB RAM). Zero LLM weights will be loaded locally; 100% of the cognitive processing is offloaded to the cloud API.
* **Scalability:** * Decoupled storage for media ensures the primary database remains small and fast, avoiding storage bloat over years of journaling.

---

## 6. Future Scope
* Reintroduce Multimodal (Image) support for automated receipt scanning and visual food plate analysis.
* Predictive Analytics: "Your productivity score correlates positively with 80g+ of protein intake."
* Native mobile applications built on React Native/Flutter once the web logic is battle-tested.
