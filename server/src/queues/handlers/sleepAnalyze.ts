import { Entry } from '../../models/Entry';
import { runSpecialist } from '../../services/agent.service';

export async function sleepAnalyze(data: { entryId: string }): Promise<void> {
  const entry = await Entry.findById(data.entryId);
  if (!entry || entry.type !== 'sleep') return;

  const sevenDaysAgo = new Date(entry.date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const history = await Entry.find({
    userId: entry.userId,
    type: 'sleep',
    date: { $gte: sevenDaysAgo, $lt: entry.date },
  }).sort({ date: 1 });

  const result = await runSpecialist('sleep_analyzer', String(entry.userId), {
    sleep_log: entry.data,
    recent_history: history.map((h) => h.data),
  });

  entry.enrichment = { ...entry.enrichment, sleep_analysis: result };
  await entry.save();
}
