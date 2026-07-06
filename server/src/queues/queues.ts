import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from './redis';
import { QUEUE_DEFINITIONS, QueueName } from './definitions';

const queues = new Map<QueueName, Queue>();

export function initQueues(): void {
  for (const def of QUEUE_DEFINITIONS) {
    if (queues.has(def.name)) continue;
    queues.set(
      def.name,
      new Queue(def.name, {
        connection: getRedisConnectionOptions(),
        defaultJobOptions: def.defaultJobOptions,
      })
    );
  }
}

export function getQueue(name: QueueName): Queue {
  const queue = queues.get(name);
  if (!queue) {
    throw new Error(`Queue "${name}" not initialized — call initQueues() first`);
  }
  return queue;
}

export function getAllQueues(): Queue[] {
  return Array.from(queues.values());
}

// The three per-entry queues get a deterministic jobId (just the entryId — a
// queue is already its own namespace, and BullMQ disallows ':' in custom ids)
// so re-triggering the same entry (e.g. an accidental double braindump submit)
// dedupes instead of processing twice.
const DEDUPE_KEY: Partial<Record<QueueName, (data: any) => string>> = {
  'journal-enrich': (data) => data.entryId,
  'sleep-analyze': (data) => data.entryId,
  'somatic-correlate': (data) => data.entryId,
};

export async function enqueue(name: QueueName, data: any): Promise<void> {
  const jobId = DEDUPE_KEY[name]?.(data);
  await getQueue(name).add(name, data, jobId ? { jobId } : undefined);
}

export async function closeQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
}
