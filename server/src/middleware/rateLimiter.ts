import rateLimit from 'express-rate-limit';

// IP-based — brute force protection for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  keyGenerator: (req) => req.ip || 'unknown',
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

// User-based — protects the expensive AI endpoint
export const braindumpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  keyGenerator: (req) => (req as any).userId || req.ip || 'unknown',
  message: { error: 'Processing limit reached. Please wait before submitting again.' },
});

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => (req as any).userId || req.ip || 'unknown',
});
