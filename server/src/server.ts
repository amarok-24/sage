import app from './app';
import { connectDB } from './config/db';
import logger from './utils/logger';

const PORT = process.env.PORT || 8000;

// Database connection
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});
