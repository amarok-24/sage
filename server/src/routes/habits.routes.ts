import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { HabitLog } from '../models/HabitLog';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Attach today's completion status to habits
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const logs = await HabitLog.find({ userId: req.userId, date: { $gte: today, $lt: tomorrow }});
    const completedSet = new Set(logs.filter(l => l.completed).map(l => l.habitName));
    
    const habits = user.habits.map(h => ({
      ...(h as any).toObject(),
      completedToday: completedSet.has(h.name)
    }));

    res.json({ habits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, aliases = [], icon = '🌱' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.habits.find(h => h.name === name)) {
      return res.status(400).json({ error: 'Habit already exists' });
    }

    user.habits.push({ name, aliases, icon, createdAt: new Date() });
    await user.save();

    res.status(201).json({ habit: user.habits[user.habits.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

router.delete('/:name', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.habits = user.habits.filter(h => h.name !== req.params.name);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

router.post('/:name/toggle', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    let log = await HabitLog.findOne({ userId: req.userId, habitName: req.params.name, date: today });
    
    if (log) {
      log.completed = !log.completed;
      await log.save();
    } else {
      // Find yesterday's streak
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayLog = await HabitLog.findOne({ userId: req.userId, habitName: req.params.name, date: yesterday });
      
      log = await HabitLog.create({
        userId: req.userId,
        habitName: req.params.name,
        date: today,
        completed: true,
        currentStreak: yesterdayLog ? yesterdayLog.currentStreak + 1 : 1,
        source: 'manual'
      });
    }

    res.json({ log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle habit' });
  }
});

export default router;
