import IORedis from 'ioredis';
import type { RedisMemoryServer } from 'redis-memory-server';
import logger from '../utils/logger';

// BullMQ's blocking connections (Workers) require this, and it's harmless to
// apply uniformly to non-blocking connections (Queues, Bull Board's adapter) too.
type ConnectionOptions = { host: string; port: number; maxRetriesPerRequest: null };

let memoryServer: RedisMemoryServer | undefined;
let connectionOptions: ConnectionOptions | undefined;

export const connectRedis = async (): Promise<void> => {
  let host: string;
  let port: number;

  const url = process.env.REDIS_URL;
  if (!url) {
    // No REDIS_URL configured: spin up an embedded Redis for local dev, mirroring
    // the embedded MongoDB fallback in server/src/config/db.ts.
    const { RedisMemoryServer } = await import('redis-memory-server');
    memoryServer = await RedisMemoryServer.create();
    host = await memoryServer.getHost();
    port = await memoryServer.getPort();
    logger.info(`REDIS_URL not set — started local embedded Redis at ${host}:${port}`);
  } else {
    const parsed = new URL(url);
    host = parsed.hostname;
    port = Number(parsed.port) || 6379;
  }

  // Fail fast at startup rather than on the first queue's lazy connection attempt.
  const probe = new IORedis({ host, port, maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await probe.connect();
    await probe.ping();
  } finally {
    probe.disconnect();
  }

  connectionOptions = { host, port, maxRetriesPerRequest: null };
  logger.info(`Redis connected: ${host}:${port}`);
};

export const getRedisConnectionOptions = (): ConnectionOptions => {
  if (!connectionOptions) {
    throw new Error('Redis not connected — call connectRedis() first');
  }
  return connectionOptions;
};

export const disconnectRedis = async (): Promise<void> => {
  connectionOptions = undefined;
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = undefined;
  }
};
