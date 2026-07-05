import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Entry } from '../models/Entry';
import { HabitLog } from '../models/HabitLog';
import { User } from '../models/User';

const router = Router();

router.get('/today', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // User's local midnight should ideally be used based on timezone, but server time is used for simplicity

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const entries = await Entry.find({
      userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ createdAt: -1 });

    const habits = await HabitLog.find({
      userId,
      date: { $gte: today, $lt: tomorrow }
    });

    res.json({ entries, habits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { range, date } = req.query; // 'week' or 'month', date string
    
    let startDate = new Date();
    if (date) startDate = new Date(date as string);
    startDate.setHours(0,0,0,0);

    let endDate = new Date(startDate);
    if (range === 'month') {
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(1);
    } else {
      // Default week
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
      startDate.setDate(diff);
      endDate.setDate(startDate.getDate() + 7);
    }

    const entries = await Entry.find({
      userId,
      date: { $gte: startDate, $lt: endDate }
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
