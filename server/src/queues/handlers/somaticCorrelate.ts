import { Entry } from '../../models/Entry';
import { runSpecialist } from '../../services/agent.service';

export async function somaticCorrelate(data: { entryId: string }): Promise<void> {
  const entry = await Entry.findById(data.entryId);
  if (!entry || entry.type !== 'somatic_log') return;

  const sevenDaysAgo = new Date(entry.date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [nutrition, sleep, journal] = await Promise.all([
    Entry.find({ userId: entry.userId, type: 'nutrition', date: { $gte: sevenDaysAgo, $lte: entry.date } }).sort({ date: 1 }),
    Entry.find({ userId: entry.userId, type: 'sleep', date: { $gte: sevenDaysAgo, $lte: entry.date } }).sort({ date: 1 }),
    Entry.find({ userId: entry.userId, type: 'journal', date: { $gte: sevenDaysAgo, $lte: entry.date } }).sort({ date: 1 }),
  ]);

  const result = await runSpecialist('somatic_correlator', String(entry.userId), {
    somatic_log: entry.data,
    recent_nutrition: nutrition.map((e) => e.data),
    recent_sleep: sleep.map((e) => e.data),
    recent_journal_mood: journal.map((e) => e.data),
  });

  entry.enrichment = { ...entry.enrichment, somatic_correlation: result };
  await entry.save();
}
