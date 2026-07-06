import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import logger from '../utils/logger';

// Dev-only convenience account so a fresh local checkout has something to log in as.
// Never used in production (gated by NODE_ENV in the caller).
export const DEMO_EMAIL = 'demo@sage.app';
export const DEMO_PASSWORD = 'sage-demo-2026';

export const seedDemoUserIfNeeded = async () => {
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, Number(process.env.BCRYPT_COST_FACTOR) || 12);

  await User.create({
    email: DEMO_EMAIL,
    passwordHash,
    name: 'Demo User',
    habits: [],
    preferences: {
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
    },
  });

  logger.info(`Seeded demo user (${DEMO_EMAIL}) for local development`);
};
