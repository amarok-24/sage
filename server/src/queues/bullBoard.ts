import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getAllQueues } from './queues';

export function createBullBoardRouter(basePath: string) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: getAllQueues().map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
