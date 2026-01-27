import { Logger } from '@nestjs/common';
import { Db } from 'mongodb';

export async function setupIndexes(db: Db) {
  const logger = new Logger();

  const collection = db.collection('transaction_logs');

  // High-speed lookups for fraud checks
  await collection.createIndex({ account_no: 1, timestamp: -1 });

  // Geospatial index for "Impossible Travel" rules
  await collection.createIndex({ 'security_context.geo_location': '2dsphere' });

  logger.info('MongoDB indexes initialized successfully.');
}
