import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Gates Bull Board (and any other ops-only surface) behind a single shared
// secret via HTTP Basic Auth, so a browser gets a native login prompt instead
// of needing a query-string token. No DB/role changes — see the job-queue plan.
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'ADMIN_API_TOKEN is not configured' });
  }

  const authHeader = req.headers.authorization;
  const credentials = authHeader?.startsWith('Basic ')
    ? Buffer.from(authHeader.slice('Basic '.length), 'base64').toString('utf8')
    : undefined;
  const password = credentials?.split(':').slice(1).join(':');

  if (!password || !safeEqual(password, token)) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
