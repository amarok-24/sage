from google.adk.agents import LlmAgent
from google.adk.workflow import Workflow
from google.adk.apps import App

from app.schemas import (
    JournalMetadata,
    SleepAnalysis,
    SomaticCorrelation,
    ExpenseAnalysis,
    TimeAnalysis,
    WeeklyInsight,
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
    name: App(
        root_agent=Workflow(name=f"{name}_workflow", edges=[("START", agent)]),
        name=name,
    )
    for name, agent in SPECIALISTS.items()
}
