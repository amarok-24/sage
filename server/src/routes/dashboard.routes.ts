import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Entry } from '../models/Entry';
import { HabitLog } from '../models/HabitLog';
import { User } from '../models/User';
import { getUserLocalDayBounds, getLocalCalendarAnchor, getUserLocalMidnight } from '../utils/timezone';

const router = Router();

async function getUserTimezone(userId: string | undefined): Promise<string> {
  const user = await User.findById(userId).select('preferences.timezone').lean();
  return user?.preferences?.timezone || 'UTC';
}

router.get('/today', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const timezone = await getUserTimezone(userId);
    const { start, end } = getUserLocalDayBounds(timezone);

    const entries = await Entry.find({
      userId,
      date: { $gte: start, $lt: end }
    }).sort({ createdAt: -1 });

    const habits = await HabitLog.find({
      userId,
      date: { $gte: start, $lt: end }
    });

    res.json({ entries, habits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const timezone = await getUserTimezone(userId);
    const { range, date } = req.query; // 'week' or 'month', date string

    const reference = date ? new Date(date as string) : new Date();
    const anchor = getLocalCalendarAnchor(timezone, reference);

    let start = new Date(anchor);
    let end: Date;
    if (range === 'month') {
      start.setUTCDate(1);
      end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
    } else {
      // Default week
      const day = start.getUTCDay();
      const diff = start.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      start.setUTCDate(diff);
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 7);
    }

    const startBound = getUserLocalMidnight(timezone, start);
    const endBound = getUserLocalMidnight(timezone, end);

    const entries = await Entry.find({
      userId,
      date: { $gte: startBound, $lt: endBound }
    });

    let totalCalories = 0;
    let totalExpenses = 0;
    let totalHours = 0;

    entries.forEach(e => {
      if (e.type === 'nutrition') totalCalories += e.data.total_calories || e.data.calories || 0;
      if (e.type === 'expense') totalExpenses += e.data.amount || 0;
      if (e.type === 'time_log') totalHours += (e.data.duration_minutes || 0) / 60;
    });

    res.json({
      totals: {
        calories: Math.round(totalCalories),
        expenses: totalExpenses,
        hours: Math.round(totalHours * 10) / 10
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
