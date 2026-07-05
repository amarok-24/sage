import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { RegisterSchema, LoginSchema } from '@bodhi/shared';
import logger from '../utils/logger';

const router = Router();

router.post('/register', authLimiter, validate(RegisterSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST_FACTOR) || 12);
    
    const user = await User.create({
      email,
      passwordHash,
      name,
      habits: [],
      preferences: {
        defaultCurrency: 'INR',
        timezone: 'Asia/Kolkata'
      }
    });
    
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any }
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id, version: user.refreshTokenVersion },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any }
    );
    
    res.cookie('bodhi_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({ user: { id: user._id, email: user.email, name: user.name }, accessToken });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, validate(LoginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any }
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id, version: user.refreshTokenVersion },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any }
    );
    
    res.cookie('bodhi_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(200).json({ user: { id: user._id, email: user.email, name: user.name }, accessToken });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.bodhi_refresh;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { userId: string, version: number };
    
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshTokenVersion !== decoded.version) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any }
    );
    
    // Rotate refresh token
    const newRefreshToken = jwt.sign(
      { userId: user._id, version: user.refreshTokenVersion },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any }
    );
    
    res.cookie('bodhi_refresh', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('bodhi_refresh');
  res.json({ success: true });
});

export default router;
