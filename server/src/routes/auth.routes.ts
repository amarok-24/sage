import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { RegisterSchema, LoginSchema } from '@bodhi/shared';

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
    
    res.status(201).json({ user: { id: user._id, email: user.email, name: user.name }, accessToken });
  } catch (error) {
    console.error("Registration error:", error);
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
    
    // Setting up refresh token is omitted for simplicity in this initial scaffolding
    
    res.status(200).json({ user: { id: user._id, email: user.email, name: user.name }, accessToken });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
