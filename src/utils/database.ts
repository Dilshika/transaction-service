import mongoose from 'mongoose';
import logger from './logger/logger';


class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      const uri =
        process.env.MONGODB_URI || 'mongodb://localhost:27017/transaction_db';

      const options: mongoose.ConnectOptions = {
        maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
        minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE) || 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        authSource: 'admin',
      };

      // Add credentials if provided
      if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
        options.auth = {
          username: process.env.MONGODB_USER,
          password: process.env.MONGODB_PASSWORD,
        };
      }

      await mongoose.connect(uri, options);

      logger.info('MongoDB connected successfully', {
        host: mongoose.connection.host,
        database: mongoose.connection.name,
      });

      // Connection event handlers
      mongoose.connection.on('connected', () => {
        logger.info('Mongoose connected to MongoDB');
      });

      mongoose.connection.on('error', (err) => {
        logger.error('Mongoose connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('Mongoose disconnected from MongoDB');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  public getConnection(): typeof mongoose {
    return mongoose;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
      return false;
    }
  }
}

export default Database.getInstance();
