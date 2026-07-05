import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Entry } from '../models/Entry';
import { nanoid } from 'nanoid';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { text, media_urls = [] } = req.body;
    
    // AI Enrichment could happen here or asynchronously
    const data = {
      text,
      media_urls,
      mood_score: 5, // Default/Mock for now
      tags: [],
      summary_snippet: text.substring(0, 50) + '...'
    };

    const entry = await Entry.create({
      userId: req.userId,
      type: 'journal',
      date: new Date(), // Could be overridden by request
      raw_text: text,
      braindump_id: nanoid(), // Since it's a standalone journal, it gets its own ID
      data
    });

    res.status(201).json({ entry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

router.get('/recent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const entries = await Entry.find({ userId: req.userId, type: 'journal' })
      .sort({ date: -1, createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));
      
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent journals' });
  }
});

export default router;
