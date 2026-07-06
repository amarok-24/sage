import type { BrainDumpResponse } from '@sage/shared';
import type { FeedItem } from './feed';

interface PersistedEntry {
  _id: string;
  type: 'nutrition' | 'expense' | 'time_log' | 'sleep' | 'somatic_log' | 'journal' | 'weekly_insight';
  date: string;
  raw_text: string;
  braindump_id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface PersistedHabitLog {
  _id: string;
  habitName: string;
  braindump_id?: string;
  createdAt: string;
}

interface TodayResponse {
  entries: PersistedEntry[];
  habits: PersistedHabitLog[];
}

/**
 * Reconstructs the same BrainDumpResponse-shaped groups the live submit flow
 * produces, from GET /dashboard/today's persisted Entry/HabitLog documents —
 * so refreshing the page doesn't lose today's activity feed.
 *
 * matched_phrase is never persisted (it only ever existed in the synchronous
 * parse response), so rehydrated habit cards carry an empty string — callers
 * must render that line conditionally.
 */
export function hydrateFeed({ entries, habits }: TodayResponse): FeedItem[] {
  const order: string[] = [];
  const groups = new Map<string, PersistedEntry[]>();

  for (const entry of entries) {
    if (entry.type === 'weekly_insight') continue; // synthesized separately, not part of a braindump submission
    if (!groups.has(entry.braindump_id)) {
      order.push(entry.braindump_id);
      groups.set(entry.braindump_id, []);
    }
    groups.get(entry.braindump_id)!.push(entry);
  }

  return order.map((braindumpId): FeedItem => {
    const group = groups.get(braindumpId)!;
    const habitsInGroup = habits.filter(h => h.braindump_id === braindumpId);

    const data = {
      nutrition: group.filter(e => e.type === 'nutrition').map(e => e.data),
      expenses: group.filter(e => e.type === 'expense').map(e => e.data),
      time_logs: group.filter(e => e.type === 'time_log').map(e => e.data),
      habits_completed: habitsInGroup.map(h => ({
        habit_name: h.habitName,
        matched_phrase: '',
        completed: true,
      })),
      sleep: group.find(e => e.type === 'sleep')?.data ?? null,
      somatic_logs: group.filter(e => e.type === 'somatic_log').map(e => e.data),
      journal: group.find(e => e.type === 'journal')?.data ?? null,
      raw_text: group[0].raw_text,
      parsed_at: group[0].createdAt,
    } as BrainDumpResponse;

    return { status: 'done', id: braindumpId, data };
  });
}
