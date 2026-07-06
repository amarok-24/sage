import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { seedDemoUserIfNeeded } from './seedDemoUser';

const LOCAL_DB_PORT = 27117;
const LOCAL_DB_PATH = path.join(__dirname, '../../.mongo-data');

let memoryServer: MongoMemoryServer | undefined;

export const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    if (!uri) {
      // No MONGODB_URI configured: spin up a persistent embedded MongoDB for local dev
      // instead of requiring Docker or a system-installed mongod.
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      fs.mkdirSync(LOCAL_DB_PATH, { recursive: true });
      memoryServer = await MongoMemoryServer.create({
        instance: {
          port: LOCAL_DB_PORT,
          dbPath: LOCAL_DB_PATH,
          storageEngine: 'wiredTiger',
        },
      });
      uri = memoryServer.getUri();
      logger.info(`MONGODB_URI not set — started local embedded MongoDB at ${uri}`);
    }

    const conn = await mongoose.connect(uri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    if (process.env.NODE_ENV !== 'production') {
      await seedDemoUserIfNeeded();
    }
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = undefined;
  }
};
