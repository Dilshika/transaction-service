import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransactionStatus } from '../types/transaction';
import { Transaction } from 'typeorm';
import { TransactionDocument } from '../transaction.schema';


@Injectable()
export class TransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(
    transactionData: Partial<Transaction>,
    session?: any,
  ): Promise<TransactionDocument> {
    try {
      const transaction = new this.transactionModel(transactionData);
      // Pass the session to support ACID transactions from the service
      return await transaction.save({ session });
    } catch (error) {
      this.logger.error(`Error creating transaction: ${error.message}`);
      throw new InternalServerErrorException(
        'Database error during transaction creation',
      );
    }
  }

  async findById(transactionId: string): Promise<TransactionDocument | null> {
    return this.transactionModel.findOne({ transactionId }).exec();
  }

  async findByIdempotencyKey(key: string): Promise<TransactionDocument | null> {
    return this.transactionModel.findOne({ idempotencyKey: key }).exec();
  }

  async findByAccount(
    accountNo: string,
    options: any,
    filters?: Partial<any>,
  ): Promise<{ transactions: TransactionDocument[]; total: number }> {
    try {
      // Build query: User can be either the sender or receiver
      const query: any = {
        $or: [{ fromAccount: accountNo }, { toAccount: accountNo }],
      };

      if (filters?.status) query.status = filters.status;
      if (filters?.type) query.type = filters.type;

      if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      const [transactions, total] = await Promise.all([
        this.transactionModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(options.offset)
          .limit(options.limit)
          .lean()
          .exec(),
        this.transactionModel.countDocuments(query).exec(),
      ]);

      return { transactions: transactions as TransactionDocument[], total };
    } catch (error) {
      this.logger.error(
        `Error finding transactions for account ${accountNo}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateStatus(
    transactionId: string,
    status: TransactionStatus,
    errorMessage?: string,
    session?: any,
  ): Promise<TransactionDocument | null> {
    const update: any = { status };
    if (errorMessage) update.errorMessage = errorMessage;
    if (status === TransactionStatus.SUCCESS) update.processedAt = new Date();

    return this.transactionModel
      .findOneAndUpdate({ transactionId }, update, { new: true, session })
      .exec();
  }

  async getStatistics(
    accountNo: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const matchStage: any = {
      $or: [{ fromAccount: accountNo }, { toAccount: accountNo }],
      status: TransactionStatus.SUCCESS,
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    return this.transactionModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
          },
        },
      ])
      .exec();
  }

  async delete(transactionId: string): Promise<boolean> {
    const result = await this.transactionModel
      .deleteOne({ transactionId })
      .exec();
    return result.deletedCount > 0;
  }
}
