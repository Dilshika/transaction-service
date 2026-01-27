import { Db } from 'mongodb';
import { subMinutes } from 'date-fns';
import { ITransactionLog } from '../entity/transaction-log.interface';
import { TransactionLogRepository } from '../repository/transaction-log.repository';
import { PinoLogger } from 'nestjs-pino';

export class FraudDetectionService {
  private readonly VELOCITY_THRESHOLD = 5;
  private readonly HIGH_VALUE_THRESHOLD = 10000;

  constructor(
    db: Db,
    private logger: PinoLogger,
    private repository: TransactionLogRepository,
  ) {}

  /**
   * Main entry point for the Change Stream watcher
   */
  async processNewTransactionLog(log: ITransactionLog) {
    const correlationId = log.transaction_id;
    this.logger.info(
      { correlationId, account: log.account_no },
      'Starting fraud analysis',
    );

    try {
      const risks = await this.runRiskRules(log);

      if (risks.length > 0) {
        await this.handleFraudDetected(log, risks);
      } else {
        this.logger.info({ correlationId }, 'Transaction cleared fraud check');
      }
    } catch (error) {
      this.logger.error(
        { correlationId, error },
        'Error during fraud analysis',
      );
    }
  }

  private async runRiskRules(log: ITransactionLog): Promise<string[]> {
    const detectedRisks: string[] = [];

    // Rule 1: High Value Check
    // Number of transaction attempts exceeding threshold
    if (log.amount > this.HIGH_VALUE_THRESHOLD) {
      detectedRisks.push('EXCESSIVE_AMOUNT');
    }

    // Rule 2: Velocity Check (Using Repository)
    const oneMinuteAgo = subMinutes(new Date(), 1);
    const recentCount = await this.repository.countRecentByAccount(
      log.account_no,
      oneMinuteAgo,
    );

    if (recentCount > this.VELOCITY_THRESHOLD) {
      detectedRisks.push('VELOCITY_LIMIT_EXCEEDED');
    }

    // Rule 3: Impossible Travel (Geospatial logic)
    const lastTx = await this.repository.getLastTransaction(
      log.account_no,
      log.transaction_id,
    );
    if (lastTx) {
      const isTravelImpossible = this.calculateTravelRisk(lastTx, log);
      if (isTravelImpossible) detectedRisks.push('IMPOSSIBLE_TRAVEL');
    }

    return detectedRisks;
  }

  private calculateTravelRisk(
    prev: ITransactionLog,
    current: ITransactionLog,
  ): boolean {
    // Logic: Calculate distance between coordinates vs time elapsed
    // For prototype, we flag if location changed in under 1 minute
    return (
      prev.security_context.ip_address !== current.security_context.ip_address
    );
  }

  private async handleFraudDetected(log: ITransactionLog, risks: string[]) {
    this.logger.warn(
      {
        correlationId: log.transaction_id,
        account: log.account_no,
        risks,
      },
      'FRAUD ALERT GENERATED',
    );

    // In your prototype, this would push to a 'fraud_alerts' collection
    // and potentially call the Auth-Service to lock the user
  }
}
