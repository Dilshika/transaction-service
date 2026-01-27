import { Collection, Db } from 'mongodb';
import { ITransactionLog } from '../entity/transaction-log.interface';
import { PinoLogger } from 'nestjs-pino';

export class TransactionLogRepository {
  private collection: Collection<ITransactionLog>;

  constructor(
    db: Db,
    private logger: PinoLogger,
  ) {
    this.collection = db.collection<ITransactionLog>('transaction_logs');
    this.logger.setContext('TransactionLogRepository');
  }

  /**
   * Insert a new log entry
   */
  async create(log: ITransactionLog): Promise<void> {
    try {
      await this.collection.insertOne(log);
      this.logger.debug(
        { txId: log.transaction_id },
        'Transaction log persisted to MongoDB',
      );
    } catch (error) {
      this.logger.error(
        { error, txId: log.transaction_id },
        'Failed to persist transaction log',
      );
      throw error;
    }
  }

  /**
   * Velocity Check: Counts transactions for an account within a specific time window
   */
  async countRecentByAccount(accountNo: string, since: Date): Promise<number> {
    return this.collection.countDocuments({
      account_no: accountNo,
      timestamp: { $gte: since },
    });
  }

  /**
   * Impossible Travel: Finds the last transaction to compare geo-coordinates
   */
  async getLastTransaction(
    accountNo: string,
    currentTxId: string,
  ): Promise<ITransactionLog | null> {
    return this.collection.findOne(
      { account_no: accountNo, transaction_id: { $ne: currentTxId } },
      { sort: { timestamp: -1 } },
    );
  }
}
