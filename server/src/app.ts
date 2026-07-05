import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { connectDB } from './config/db';
import braindumpRoutes from './routes/braindump.routes';
import authRoutes from './routes/auth.routes';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import dashboardRoutes from './routes/dashboard.routes';
import entriesRoutes from './routes/entries.routes';
import habitsRoutes from './routes/habits.routes';
import journalRoutes from './routes/journal.routes';
import mediaRoutes from './routes/media.routes';
import userRoutes from './routes/user.routes';

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false })); // allow local image loading
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/braindump', braindumpRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/user', userRoutes);

// Global Error Handler (must be after all routes)
app.use(errorHandler);

export default app;
