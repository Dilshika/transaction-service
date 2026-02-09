import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType, TransactionStatus } from '../types/transaction';
import { TransferRequest, BillPaymentRequest } from '../dto/transfer-request.dto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly MAX_AMOUNT =
    Number(process.env.MAX_TRANSACTION_AMOUNT) || 1000000;
  private readonly MIN_AMOUNT =
    Number(process.env.MIN_TRANSACTION_AMOUNT) || 0.01;
  private readonly IDEMPOTENCY_TTL = 86400000; // 24 hours in ms for Redis

  constructor(
    private readonly transactionRepo: TransactionRepository,
    private readonly accountRepo: AccountRepository,
    @InjectConnection() private readonly connection: Connection,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async transfer(request: TransferRequest): Promise<any> {
    const startTime = Date.now();

    // 1. Idempotency Check (Using Redis Cache)
    if (request.idempotencyKey) {
      const cachedResponse = await this.cacheManager.get(
        request.idempotencyKey,
      );
      if (cachedResponse) {
        this.logger.log(
          `Duplicate transfer request: ${request.idempotencyKey}`,
        );
        return cachedResponse;
      }
    }

    this.validateAmount(request.amount);
    if (request.fromAccount === request.toAccount) {
      throw new BadRequestException('Cannot transfer to the same account');
    }

    const transactionId = uuidv4();
    const session = await this.connection.createSession();
    session.startTransaction();

    try {
      // 2. Account Validation
      const fromAccount = await this.accountRepo.findByAccountNo(
        request.fromAccount,
      );
      const toAccount = await this.accountRepo.findByAccountNo(
        request.toAccount,
      );

      if (!fromAccount) throw new NotFoundException('From account not found');
      if (!toAccount) throw new NotFoundException('To account not found');
      if (fromAccount.status === 'FROZEN')
        throw new BadRequestException('Account frozen due to fraud detection');
      if (fromAccount.balance < request.amount)
        throw new BadRequestException('Insufficient funds');

      // 3. Create Transaction Record (Processing State)
      await this.transactionRepo.create(
        {
          transactionId,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.PROCESSING,
          fromAccount: request.fromAccount,
          toAccount: request.toAccount,
          amount: request.amount,
          userId: request.userId,
        },
        session,
      );

      // 4. Update Balances Atomically
      await this.accountRepo.updateBalance(
        request.fromAccount,
        -request.amount,
        session,
      );
      await this.accountRepo.updateBalance(
        request.toAccount,
        request.amount,
        session,
      );

      // 5. Finalize
      await this.transactionRepo.updateStatus(
        transactionId,
        TransactionStatus.SUCCESS,
        session,
      );
      await session.commitTransaction();

      const response = {
        transaction_id: transactionId,
        status: 'SUCCESS',
        from_account: request.fromAccount,
        amount: request.amount,
        new_balance: fromAccount.balance - request.amount,
        timestamp: new Date().toISOString(),
      };

      // 6. Cache Idempotency Key
      if (request.idempotencyKey) {
        await this.cacheManager.set(
          request.idempotencyKey,
          response,
          this.IDEMPOTENCY_TTL,
        );
      }

      this.logger.log(
        `Transfer ${transactionId} completed in ${Date.now() - startTime}ms`,
      );
      return response;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Transfer failed: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async billPayment(request: BillPaymentRequest): Promise<any> {
    // Logic similar to transfer, but calling this.processExternalPayment()
    // and using TransactionType.BILL_PAYMENT
  }

  async getTransactionHistory(request: TransactionHistoryRequest) {
    const limit = Math.min(request.limit || 50, 100);
    const { transactions, total } = await this.transactionRepo.findByAccount(
      request.accountNo,
      limit,
      request.offset || 0,
    );

    return {
      account_no: request.accountNo,
      total_count: total,
      transactions: transactions.map((t) => ({
        id: t.transactionId,
        type: t.fromAccount === request.accountNo ? 'DEBIT' : 'CREDIT',
        amount: t.amount,
        status: t.status,
        timestamp: t.createdAt,
      })),
    };
  }

  private validateAmount(amount: number): void {
    if (
      amount < this.MIN_AMOUNT ||
      amount > this.MAX_AMOUNT ||
      !Number.isFinite(amount)
    ) {
      throw new BadRequestException('Invalid transaction amount');
    }
  }

  private async processExternalPayment(
    provider: string,
    ref: string,
    amount: number,
  ): Promise<void> {
    // Logic for external API integration (e.g., Axios call to Utility Provider)
    this.logger.log(`External payment to ${provider} processed`);
  }
}
