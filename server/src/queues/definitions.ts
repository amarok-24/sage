import type { DefaultJobOptions } from 'bullmq';
import { journalEnrich } from './handlers/journalEnrich';
import { sleepAnalyze } from './handlers/sleepAnalyze';
import { somaticCorrelate } from './handlers/somaticCorrelate';
import { expenseAnalyze } from './handlers/expenseAnalyze';
import { timeAnalyze } from './handlers/timeAnalyze';
import { insightSynthesize } from './handlers/insightSynthesize';
import { dailySweep } from './handlers/dailySweep';

// A queue name identifies what a job does, never when it runs — recurring
// cadence lives entirely in Job Schedulers attached to a queue (see server.ts
// and Bull Board), not in the name here.
export type QueueName =
  | 'journal-enrich'
  | 'sleep-analyze'
  | 'somatic-correlate'
  | 'expense-analyze'
  | 'time-analyze'
  | 'insight-synthesize'
  | 'sweep';

const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export interface QueueDefinition {
  name: QueueName;
  handler: (data: any) => Promise<void>;
  defaultJobOptions: DefaultJobOptions;
}

export const QUEUE_DEFINITIONS: QueueDefinition[] = [
  { name: 'journal-enrich', handler: journalEnrich, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: 'sleep-analyze', handler: sleepAnalyze, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: 'somatic-correlate', handler: somaticCorrelate, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: 'expense-analyze', handler: expenseAnalyze, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: 'time-analyze', handler: timeAnalyze, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: 'insight-synthesize', handler: insightSynthesize, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: 'sweep', handler: dailySweep, defaultJobOptions: DEFAULT_JOB_OPTIONS },
];
