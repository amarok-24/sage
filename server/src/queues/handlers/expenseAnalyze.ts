import { Entry } from '../../models/Entry';
import { runSpecialist } from '../../services/agent.service';

export async function expenseAnalyze(data: { userId: string; date: string }): Promise<void> {
  const date = new Date(data.date);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const todaysExpenses = await Entry.find({ userId: data.userId, type: 'expense', date: { $gte: date, $lt: nextDay } });
  if (todaysExpenses.length === 0) return;

  const baselineStart = new Date(date);
  baselineStart.setDate(baselineStart.getDate() - 30);
  const baselineExpenses = await Entry.find({ userId: data.userId, type: 'expense', date: { $gte: baselineStart, $lt: date } });

  const todaysJournal = await Entry.findOne({ userId: data.userId, type: 'journal', date: { $gte: date, $lt: nextDay } });

  const result = await runSpecialist('expense_analyzer', data.userId, {
    todays_expenses: todaysExpenses.map((e) => e.data),
    baseline_expenses: baselineExpenses.map((e) => e.data),
    todays_mood: todaysJournal?.data?.mood_score ?? null,
  });

  await Entry.updateMany(
    { _id: { $in: todaysExpenses.map((e) => e._id) } },
    { $set: { 'enrichment.expense_analysis': result } }
  );
}
