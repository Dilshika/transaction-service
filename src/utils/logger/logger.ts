import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Pino configuration
const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  base: {
    service: process.env.SERVICE_NAME || 'transaction-service',
    pid: process.pid,
    hostname: process.env.HOSTNAME || require('os').hostname(),
  },
};

// Development-friendly configuration with pretty printing
const devConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false,
      messageFormat: '{msg}',
      customPrettifiers: {
        time: (timestamp: string) => `🕐 ${timestamp}`,
      },
    },
  },
};

// Production configuration with file rotation
const prodConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    targets: [
      // All logs to application file
      {
        target: 'pino/file',
        level: 'trace',
        options: {
          destination: path.join(logDir, `application-${new Date().toISOString().split('T')[0]}.log`),
          mkdir: true,
        },
      },
      // Error logs to separate file
      {
        target: 'pino/file',
        level: 'error',
        options: {
          destination: path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`),
          mkdir: true,
        },
      },
    ],
  },
};

// For better production rotation, use pino-roll or pino-rotating-file
const prodConfigWithRotation: pino.LoggerOptions = {
  ...baseConfig,
};

// Stream setup for file rotation using pino-rotating-file
const rotatingFileStream = (() => {
  try {
    // Try to use pino-rotating-file if available
    const rotatingFile = require('pino-rotating-file');
    
    return pino.multistream([
      // Application logs
      {
        level: 'trace',
        stream: rotatingFile({
          filename: path.join(logDir, 'application.log'),
          size: '20M',
          maxFiles: 14,
        }),
      },
      // Error logs
      {
        level: 'error',
        stream: rotatingFile({
          filename: path.join(logDir, 'error.log'),
          size: '20M',
          maxFiles: 30,
        }),
      },
    ]);
  } catch (err) {
    // Fallback to simple file streams if pino-rotating-file not available
    return pino.multistream([
      {
        level: 'trace',
        stream: pino.destination({
          dest: path.join(logDir, `application-${new Date().toISOString().split('T')[0]}.log`),
          sync: false,
        }),
      },
      {
        level: 'error',
        stream: pino.destination({
          dest: path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`),
          sync: false,
        }),
      },
    ]);
  }
})();

// Create main logger
const logger = isDevelopment
  ? pino(devConfig)
  : pino(prodConfigWithRotation, rotatingFileStream);

// Transaction logger with separate rotation
const transactionStream = (() => {
  try {
    const rotatingFile = require('pino-rotating-file');
    return rotatingFile({
      filename: path.join(logDir, 'transaction.log'),
      size: '50M',
      maxFiles: 90,
    });
  } catch (err) {
    return pino.destination({
      dest: path.join(logDir, `transaction-${new Date().toISOString().split('T')[0]}.log`),
      sync: false,
    });
  }
})();

export const transactionLogger = pino(
  {
    level: 'info',
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    base: {
      service: 'transaction-audit',
      pid: process.pid,
    },
  },
  transactionStream,
);

// Helper methods for structured logging
export const logTransaction = (data: {
  transactionId: string;
  type: string;
  status: string;
  amount: number;
  fromAccount?: string;
  toAccount?: string;
  userId?: string;
  metadata?: any;
}) => {
  transactionLogger.info(
    {
      transactionId: data.transactionId,
      type: data.type,
      status: data.status,
      amount: data.amount,
      fromAccount: data.fromAccount,
      toAccount: data.toAccount,
      userId: data.userId,
      metadata: data.metadata,
    },
    'Transaction processed',
  );
};

export const logError = (error: Error, context?: any) => {
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(error as any).cause && { cause: (error as any).cause },
      },
      context,
    },
    'Application error',
  );
};

export const logSecurityEvent = (event: string, data: any) => {
  logger.warn(
    {
      event,
      ...data,
      eventTime: new Date().toISOString(),
    },
    'Security event',
  );
};

export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: any,
) => {
  logger.info(
    {
      operation,
      duration,
      durationMs: duration,
      ...metadata,
    },
    'Performance metric',
  );
};

// Additional helper methods specific to Pino

/**
 * Create a child logger with additional context
 */
export const createChildLogger = (bindings: Record<string, any>) => {
  return logger.child(bindings);
};

/**
 * Log HTTP request
 */
export const logHttpRequest = (req: any, res: any, duration: number) => {
  logger.info(
    {
      req: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.ip || req.connection.remoteAddress,
      },
      res: {
        statusCode: res.statusCode,
      },
      duration,
    },
    'HTTP Request',
  );
};

/**
 * Log database query
 */
export const logDatabaseQuery = (
  query: string,
  duration: number,
  metadata?: any,
) => {
  logger.debug(
    {
      query,
      duration,
      ...metadata,
    },
    'Database query',
  );
};

/**
 * Flush logs on shutdown
 */
export const flushLogs = async (): Promise<void> => {
  return new Promise((resolve) => {
    logger.flush(() => {
      transactionLogger.flush(() => {
        resolve();
      });
    });
  });
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, flushing logs...');
  await flushLogs();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, flushing logs...');
  await flushLogs();
  process.exit(0);
});

export default logger;