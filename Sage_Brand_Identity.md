# Brand & Product Identity: Sage

**Project:** Unified Personal "Second Brain" Assistant  
**Document Version:** 1.0  
**Date:** July 5, 2026  

---

## 1. The Core Metaphor: The Wise Companion

**Sage** shifts the paradigm of personal tracking from a mechanical chore to a calm, ongoing conversation with a wise companion. Instead of filing data into rigid, clinical spreadsheets, you simply check in with your Sage companion.

In this ecosystem:
* **The Dialogue:** A single, unstructured text entry in the Universal Input Portal.
* **The Counsel:** The cloud-hosted AI routing engine (the "Sage") that listens, categorizes, and organizes the user's raw thoughts.
* **The Sanctuary:** The structured database and dashboard where the user's daily check-ins compile into a long-term mirror of self-knowledge.

Sage assumes that ultimate clarity about one's work-life balance, health, and finances doesn't come from rigid auditing, but from continuous, gentle awareness.

---

## 2. Brand Positioning & Messaging

**Core Identity:** A digital sanctuary for self-reflection and effortless awareness.

**Tagline:** *Grow your awareness.*

**The Promise:** You are not typing into a void or doing manual database entry. You are talking to a calm, wise companion that automatically organizes your life into clear, actionable themes.

---

## 3. User Experience (UX) & Visual Identity

The interface must reflect the tranquility of a personal sanctuary rather than corporate spreadsheets.

* **The Vibe:** Calm focus with a layer of quiet technological wonder. The UI ("Nova") is a glassmorphic surface — dark by default, with a light mode for daytime use — clean and quiet enough to foster reflection, while a soft violet-to-cyan glow keeps it feeling alive while the AI is thinking.
* **Visual Language:**
  * **Color Palette:** A violet-to-cyan gradient system — `--nova-violet` (`#8b5cf6` dark / `#7c3aed` light) and `--nova-cyan` (`#06b6d4` dark / `#0891b2` light) — glowing against a near-black surface in dark mode (`--nova-bg` `#0b0d14`) or a soft off-white surface in light mode (`--nova-bg` `#f7f7fb`). Blurred, slowly panning gradient backgrounds and a pulsing glow on the composer while an entry is processing.
  * **Typography:** Sans-serif throughout — Space Grotesk for the wordmark and display text, Inter for body copy, numbers, and dashboard widgets — chosen for legibility across journal entries and trackers alike.
  * **Micro-Animations:** A "breathing" pulse-glow while the AI processes an entry, and logged entries fade and slide into place as they settle into the activity feed.

---

## 4. The 6-R Pillar System

How the system maps conversational input to structured tracking:

* **Reflections** (Journal & Mood): Captures subjective daily narratives and emotional notes. Asynchronous AI enrichment generates `mood_score` and `summary_snippets`, revealing how external stressors or the joy of engaging in hobbies impact overall wellness over time.
* **Rhythms** (Time & Habits): Tracks time logs, routines, habits, and focus windows without stopwatch tracking. *Example Input:* "Dedicated an hour to studying system design today, and finished my home workout." Sage silently updates the skill-building streak and the fitness log.
* **Resources** (Expenses & Finances): Captures financial transactions and economic energy. *Example Input:* "Set aside funds for advanced tax and invested in the Sovereign Gold Bond tranche." Sage maps these directly to the financial database without requiring manual category selections.
* **Rest** (Sleep & Recovery): Logs sleep times, quality, and circadian alignment. *Example Input:* "Slept at 11:30 PM, woke up at 7 AM, felt deeply rested." Sage correlates sleep patterns with next-day focus baselines and productivity scores.
* **Reactions** (Somatic Logs & Symptoms): Maps physical symptoms, severity, and treatments. *Example Input:* "Had a headache in the afternoon, took an ibuprofen, felt better in an hour." Sage tracks somatic feedback, helping uncover hidden correlations like stress-induced flare-ups.
* **Replenish** (Nutrition & Intake): Estimates nutritional intake and macronutrients for regional cuisines without commercial databases. *Example Input:* "Had 2 rotis with dal makhani and a katori of raita for lunch." Sage parses food items to calculate caloric flow and macros seamlessly.

*Note: in the underlying data model, Time and Habits are tracked as two separate domains (`time_logs` and `habits`), and today's UI surfaces all seven domains by their plain names (Nutrition, Expenses, Time, Habits, Sleep, Somatic, Journal) rather than these R-names — the pillar language above remains this document's internal shorthand for brand voice and messaging.*

---

## 5. The Evolution of Insight

After weeks of consulting Sage, the system begins to trace long-term, cross-domain connections:
* *"Your sleep quality is highest on days when you complete your study sessions before 8 PM."*
* *"Your eating out expenses spike on days when you log lower mood scores."*
* *"Your physical symptoms (like headaches) consistently correlate with high-sodium meals or late bedtimes."*

Sage turns raw daily updates into structural self-awareness.
