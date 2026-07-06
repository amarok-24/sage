import { Worker, Job } from 'bullmq';
import logger from '../utils/logger';
import { getRedisConnectionOptions } from './redis';
import { QUEUE_DEFINITIONS } from './definitions';

const workers: Worker[] = [];

export function initWorkers(): void {
  for (const def of QUEUE_DEFINITIONS) {
    const worker = new Worker(
      def.name,
      async (job: Job) => {
        await def.handler(job.data);
      },
      { connection: getRedisConnectionOptions() }
    );

    worker.on('failed', (job, err) => {
      logger.error(`Job "${def.name}" (${job?.id}) failed: ${err.message}`);
    });

    workers.push(worker);
  }
}

export async function closeWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers.length = 0;
}
