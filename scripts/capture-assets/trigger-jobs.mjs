// Manually enqueues the sweep-gated BullMQ jobs (expense-analyze, time-analyze,
// insight-synthesize) for the demo user so the InsightsPanel shows every card
// type without waiting for the real hourly sweep (23:00 local EOD / Sunday
// 21:00 weekly) to fire. Talks directly to the same embedded Mongo (fixed
// port 27117) and embedded Redis (random port, discovered from the running
// server's stdout log) the live `pnpm dev` server process already uses, so
// its in-process workers pick the jobs up immediately.
import { MongoClient } from 'mongodb';
import { Queue } from 'bullmq';
import { readServerConnectionInfo, getSafeUserLocalDayBounds, DEMO_EMAIL } from './lib.mjs';

async function main() {
  const { mongoUri, redisHost, redisPort } = readServerConnectionInfo();
  console.log(`[trigger-jobs] Mongo: ${mongoUri}  Redis: ${redisHost}:${redisPort}`);

  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  // No db name in the URI: both mongoose (server) and the driver default to "test".
  const db = mongo.db('test');
  const user = await db.collection('users').findOne({ email: DEMO_EMAIL });
  if (!user) throw new Error(`Demo user ${DEMO_EMAIL} not found — has the server seeded it yet?`);

  const userId = String(user._id);
  const timezone = user.preferences?.timezone || 'UTC';
  const { start: todayStart } = getSafeUserLocalDayBounds(timezone);
  console.log(`[trigger-jobs] user=${userId} timezone=${timezone} todayStart=${todayStart.toISOString()}`);

  const connection = { host: redisHost, port: redisPort, maxRetriesPerRequest: null };
  const expenseQueue = new Queue('expense-analyze', { connection });
  const timeQueue = new Queue('time-analyze', { connection });
  const insightQueue = new Queue('insight-synthesize', { connection });

  await expenseQueue.add('expense-analyze', { userId, date: todayStart.toISOString() });
  await timeQueue.add('time-analyze', { userId, date: todayStart.toISOString() });
  await insightQueue.add('insight-synthesize', { userId, weekStart: todayStart.toISOString() });
  console.log('[trigger-jobs] enqueued expense-analyze, time-analyze, insight-synthesize');

  await Promise.all([expenseQueue.close(), timeQueue.close(), insightQueue.close()]);
  await mongo.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
