import { nanoid } from 'nanoid';
import { Entry } from '../../models/Entry';
import { runSpecialist } from '../../services/agent.service';

const DOMAIN_TYPES = ['nutrition', 'expense', 'time_log', 'sleep', 'somatic_log', 'journal'] as const;

export async function insightSynthesize(data: { userId: string; weekStart: string }): Promise<void> {
  const weekStart = new Date(data.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const entries = await Entry.find({
    userId: data.userId,
    date: { $gte: weekStart, $lt: weekEnd },
    type: { $in: DOMAIN_TYPES },
  });
  if (entries.length === 0) return;

  const weekData: Record<string, any[]> = {};
  for (const entry of entries) {
    (weekData[entry.type] ??= []).push(entry.data);
  }

  const result = await runSpecialist('insight_synthesizer', data.userId, { week_data: weekData });

  await Entry.create({
    userId: data.userId,
    type: 'weekly_insight',
    date: weekStart,
    // Not derived from a single brain dump, but Entry.raw_text is a required
    // String path and Mongoose's built-in `required` validator rejects ''
    // (empty string doesn't satisfy String.required, unlike other falsy values).
    raw_text: 'Weekly insight synthesis',
    braindump_id: nanoid(),
    data: result,
  });
}
