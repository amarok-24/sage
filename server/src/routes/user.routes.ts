import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.patch('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.preferences = { ...user.preferences, ...req.body };
    await user.save();
    
    res.json({ preferences: user.preferences });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
