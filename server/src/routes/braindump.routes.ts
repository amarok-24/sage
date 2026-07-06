import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { braindumpLimiter } from '../middleware/rateLimiter';
import { processBrainDump } from '../services/agent.service';
import { Entry } from '../models/Entry';
import { HabitLog } from '../models/HabitLog';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import logger from '../utils/logger';
import { enqueue } from '../queues/queues';

const router = Router();

const BraindumpRequestSchema = z.object({
  text: z.string().min(1),
  timestamp: z.string().datetime().optional()
});

router.post('/', authenticate, braindumpLimiter, validate(BraindumpRequestSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { text, timestamp } = req.body;
    const userId = req.userId!;
    
    // Call ADK agent
    const parsedResult = await processBrainDump(userId, text);
    
    const braindump_id = nanoid();
    const date = timestamp ? new Date(timestamp) : new Date(); // Use provided timestamp or current date
    date.setHours(0,0,0,0); // Logical date at midnight
    
    const entriesCreated = [];
    
    // Save Nutrition
    for (const item of parsedResult.nutrition) {
      const entry = await Entry.create({ userId, type: 'nutrition', date, raw_text: text, braindump_id, data: item });
      entriesCreated.push(entry._id);
    }
    
    // Save Expenses
    for (const item of parsedResult.expenses) {
      const entry = await Entry.create({ userId, type: 'expense', date, raw_text: text, braindump_id, data: item });
      entriesCreated.push(entry._id);
    }
    
    // Save Time Logs
    for (const item of parsedResult.time_logs) {
      const entry = await Entry.create({ userId, type: 'time_log', date, raw_text: text, braindump_id, data: item });
      entriesCreated.push(entry._id);
    }
    
    // Save Sleep Log
    if (parsedResult.sleep) {
      const entry = await Entry.create({ userId, type: 'sleep', date, raw_text: text, braindump_id, data: parsedResult.sleep });
      entriesCreated.push(entry._id);
      await enqueue('sleep-analyze', { entryId: String(entry._id) });
    }

    // Save Somatic Logs
    for (const item of parsedResult.somatic_logs) {
      const entry = await Entry.create({ userId, type: 'somatic_log', date, raw_text: text, braindump_id, data: item });
      entriesCreated.push(entry._id);
      await enqueue('somatic-correlate', { entryId: String(entry._id) });
    }

    // Save Journal
    if (parsedResult.journal) {
      const entry = await Entry.create({ userId, type: 'journal', date, raw_text: text, braindump_id, data: parsedResult.journal });
      entriesCreated.push(entry._id);
      await enqueue('journal-enrich', { entryId: String(entry._id) });
    }
    
    // Update Habit Logs
    const habitsUpdated = [];
    for (const item of parsedResult.habits_completed) {
      if (item.completed) {
        // Find existing habit log for today
        const existingLog = await HabitLog.findOne({ userId, habitName: item.habit_name, date });
        if (!existingLog) {
            // Find yesterday's log to calculate streak
            const yesterday = new Date(date);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayLog = await HabitLog.findOne({ userId, habitName: item.habit_name, date: yesterday });
            
            const currentStreak = yesterdayLog ? yesterdayLog.currentStreak + 1 : 1;
            
            const log = await HabitLog.create({
                userId,
                habitName: item.habit_name,
                date,
                completed: true,
                currentStreak,
                source: 'braindump'
            });
            habitsUpdated.push(log._id);
        }
      }
    }
    
    res.status(200).json({
      braindump_id,
      entries_created: entriesCreated,
      habits_updated: habitsUpdated,
      parsed_data: parsedResult // Returning for UI to display instantly
    });
    
  } catch (error: any) {
    logger.error("Braindump processing error:", error);
    res.status(500).json({ error: 'Failed to process braindump', details: error.message });
  }
});

export default router;
