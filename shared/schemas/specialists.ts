import { z } from 'zod';

export const JournalEnrichmentSchema = z.object({
  mood_score:      z.number().int().min(1).max(10),
  tags:            z.array(z.string()),
  summary_snippet: z.string(),
});

export const SleepAnalysisSchema = z.object({
  consistency_score:   z.number().int().min(1).max(10),
  circadian_alignment: z.enum(['aligned', 'slightly_shifted', 'misaligned']),
  recommendation:      z.string(),
});

export const SomaticCorrelationSchema = z.object({
  potential_triggers: z.array(z.string()),
  confidence:          z.enum(['high', 'medium', 'low']),
  suggestion:          z.string(),
});

export const ExpenseAnalysisSchema = z.object({
  anomaly_flag:       z.boolean(),
  subscription_creep: z.string(),
  insight:            z.string(),
});

export const TimeAnalysisSchema = z.object({
  deep_work_ratio:  z.number(),
  time_drain:       z.string(),
  optimization_tip: z.string(),
});

export const WeeklyInsightSchema = z.object({
  top_insight:     z.string(),
  supporting_data: z.array(z.string()),
  growth_area:     z.string(),
  celebration:     z.string(),
});

export const SPECIALIST_SCHEMAS = {
  journal_enricher:   JournalEnrichmentSchema,
  sleep_analyzer:     SleepAnalysisSchema,
  somatic_correlator: SomaticCorrelationSchema,
  expense_analyzer:   ExpenseAnalysisSchema,
  time_analyzer:      TimeAnalysisSchema,
  insight_synthesizer: WeeklyInsightSchema,
} as const;

export type SpecialistName = keyof typeof SPECIALIST_SCHEMAS;

export type JournalEnrichment    = z.infer<typeof JournalEnrichmentSchema>;
export type SleepAnalysis        = z.infer<typeof SleepAnalysisSchema>;
export type SomaticCorrelation   = z.infer<typeof SomaticCorrelationSchema>;
export type ExpenseAnalysis      = z.infer<typeof ExpenseAnalysisSchema>;
export type TimeAnalysis         = z.infer<typeof TimeAnalysisSchema>;
export type WeeklyInsight        = z.infer<typeof WeeklyInsightSchema>;
