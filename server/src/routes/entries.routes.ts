import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Entry } from '../models/Entry';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const query: any = { userId: req.userId };
    if (type) query.type = type;

    const entries = await Entry.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Entry.countDocuments(query);

    res.json({
      entries,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.body;
    const entry = await Entry.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { data } },
      { new: true }
    );
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entry = await Entry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
