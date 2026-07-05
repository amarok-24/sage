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
