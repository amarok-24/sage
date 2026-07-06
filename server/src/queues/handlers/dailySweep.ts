import { User } from '../../models/User';
import { enqueue } from '../queues';

function getLocalHour(timezone: string, date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(date),
    10
  ) % 24;
}

function getLocalDateString(timezone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date); // "YYYY-MM-DD"
}

function getLocalWeekday(timezone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date);
}

// Runs on the `sweep` queue's hourly Job Scheduler. Approximates per-user-local-time
// cron (EOD ~23:00, weekly Sunday ~21:00) without scheduling a job per user per
// timezone-minute. Idempotency guards on User.jobState prevent double-firing if
// the sweep overlaps an hour.
export async function dailySweep(): Promise<void> {
  const now = new Date();
  const users = await User.find({});

  for (const user of users) {
    const timezone = user.preferences?.timezone || 'UTC';
    const hour = getLocalHour(timezone, now);
    const localDate = getLocalDateString(timezone, now);

    if (hour === 23 && user.jobState?.lastEodRunDate !== localDate) {
      const userId = String(user._id);
      await enqueue('expense-analyze', { userId, date: localDate });
      await enqueue('time-analyze', { userId, date: localDate });
      user.jobState = { ...user.jobState, lastEodRunDate: localDate };
      await user.save();
    }

    const weekday = getLocalWeekday(timezone, now);
    if (weekday === 'Sun' && hour === 21 && user.jobState?.lastWeeklyRunDate !== localDate) {
      const weekStart = new Date(localDate);
      weekStart.setDate(weekStart.getDate() - 6);
      await enqueue('insight-synthesize', {
        userId: String(user._id),
        weekStart: weekStart.toISOString(),
      });
      user.jobState = { ...user.jobState, lastWeeklyRunDate: localDate };
      await user.save();
    }
  }
}
