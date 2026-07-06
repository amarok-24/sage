import { Entry } from '../../models/Entry';
import { runSpecialist } from '../../services/agent.service';

export async function timeAnalyze(data: { userId: string; date: string }): Promise<void> {
  const date = new Date(data.date);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const todaysTimeLogs = await Entry.find({ userId: data.userId, type: 'time_log', date: { $gte: date, $lt: nextDay } });
  if (todaysTimeLogs.length === 0) return;

  const result = await runSpecialist('time_analyzer', data.userId, {
    todays_time_logs: todaysTimeLogs.map((e) => e.data),
  });

  await Entry.updateMany(
    { _id: { $in: todaysTimeLogs.map((e) => e._id) } },
    { $set: { 'enrichment.time_analysis': result } }
  );
}
