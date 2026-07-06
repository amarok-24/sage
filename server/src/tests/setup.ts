import { MongoMemoryServer } from 'mongodb-memory-server';
import { RedisMemoryServer } from 'redis-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { connectRedis, disconnectRedis } from '../queues/redis';
import { initQueues, closeQueues } from '../queues/queues';

let mongoServer: MongoMemoryServer;
let redisServer: RedisMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  redisServer = await RedisMemoryServer.create();
  const redisHost = await redisServer.getHost();
  const redisPort = await redisServer.getPort();

  // Set required env vars for tests
  process.env.MONGODB_URI = mongoUri;
  process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;
  process.env.JWT_ACCESS_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.BCRYPT_COST_FACTOR = '4'; // Faster hashing for tests

  await mongoose.connect(mongoUri);
  await connectRedis();

  // Routes enqueue specialist jobs via enqueue() — create the Queues (without
  // starting Workers) so route handlers can add jobs without actually
  // processing them (no real HTTP calls to the agent service in tests).
  initQueues();
});

afterAll(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  await closeQueues();
  await mongoose.disconnect();
  await disconnectRedis();
  await mongoServer.stop();
});
