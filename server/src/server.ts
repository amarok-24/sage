import app, { adminRouter } from './app';
import { connectDB, disconnectDB } from './config/db';
import { connectRedis, disconnectRedis } from './queues/redis';
import { initQueues, getQueue, closeQueues } from './queues/queues';
import { initWorkers, closeWorkers } from './queues/workers';
import { createBullBoardRouter } from './queues/bullBoard';
import { adminAuth } from './middleware/adminAuth';
import logger from './utils/logger';

const PORT = process.env.PORT || 8000;
const BULL_BOARD_PATH = '/admin/queues';

connectDB().then(async () => {
  await connectRedis();
  initQueues();
  initWorkers();

  // Recurring cadence lives entirely in this Job Scheduler, not in the `sweep`
  // queue's name — editable later from Bull Board without touching code.
  await getQueue('sweep').upsertJobScheduler('hourly-sweep', { pattern: '0 * * * *' });

  adminRouter.use(adminAuth, createBullBoardRouter(BULL_BOARD_PATH));

  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await closeWorkers();
    await closeQueues();
    await disconnectRedis();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
