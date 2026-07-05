import app from './app';
import { connectDB, disconnectDB } from './config/db';
import logger from './utils/logger';

const PORT = process.env.PORT || 8000;

// Database connection
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
