import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Set required env vars for tests
  process.env.MONGODB_URI = mongoUri;
  process.env.JWT_ACCESS_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.BCRYPT_COST_FACTOR = '4'; // Faster hashing for tests
  
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  await mongoose.disconnect();
  await mongoServer.stop();
});
