import logger from '../utils/logger';
import mongoose from 'mongoose';
import { IAccount, AccountStatus } from './type/accounts';

class AccountRepository {
  async create(accountData: Partial<IAccount>): Promise<IAccount> {
    try {
      const account = new Account(accountData);
      await account.save();
      logger.info('Account created', { accountNo: account.accountNo });
      return account;
    } catch (error) {
      logger.error('Error creating account:', error);
      throw error;
    }
  }

  async findByAccountNo(accountNo: string): Promise<IAccount | null> {
    try {
      return await Account.findOne({ accountNo });
    } catch (error) {
      logger.error('Error finding account by account number:', error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<IAccount[]> {
    try {
      return await Account.find({ userId });
    } catch (error) {
      logger.error('Error finding accounts by user ID:', error);
      throw error;
    }
  }

  async updateBalance(accountNo: string, amount: number): Promise<IAccount | null> {
    try {
      const account = await Account.findOneAndUpdate(
        { accountNo },
        {
          $inc: { balance: amount },
          $set: { lastTransactionAt: new Date() },
        },
        { new: true }
      );

      if (account) {
        logger.info('Account balance updated', {
          accountNo,
          newBalance: account.balance,
          change: amount,
        });
      }

      return account;
    } catch (error) {
      logger.error('Error updating account balance:', error);
      throw error;
    }
  }

  async updateBalanceWithSession(
    accountNo: string,
    amount: number,
    session: mongoose.ClientSession
  ): Promise<IAccount | null> {
    try {
      const account = await Account.findOneAndUpdate(
        { accountNo },
        {
          $inc: { balance: amount },
          $set: { lastTransactionAt: new Date() },
        },
        { new: true, session }
      );

      return account;
    } catch (error) {
      logger.error('Error updating account balance with session:', error);
      throw error;
    }
  }

  async freeze(accountNo: string, reason: string): Promise<IAccount | null> {
    try {
      const account = await Account.findOneAndUpdate(
        { accountNo },
        {
          status: AccountStatus.FROZEN,
          frozenReason: reason,
          frozenAt: new Date(),
        },
        { new: true }
      );

      if (account) {
        logger.warn('Account frozen', { accountNo, reason });
      }

      return account;
    } catch (error) {
      logger.error('Error freezing account:', error);
      throw error;
    }
  }

  async unfreeze(accountNo: string): Promise<IAccount | null> {
    try {
      const account = await Account.findOneAndUpdate(
        { accountNo },
        {
          status: AccountStatus.ACTIVE,
          $unset: { frozenReason: '', frozenAt: '' },
        },
        { new: true }
      );

      if (account) {
        logger.info('Account unfrozen', { accountNo });
      }

      return account;
    } catch (error) {
      logger.error('Error unfreezing account:', error);
      throw error;
    }
  }

  async checkSufficientBalance(accountNo: string, amount: number): Promise<boolean> {
    try {
      const account = await this.findByAccountNo(accountNo);
      if (!account) {
        return false;
      }
      return account.balance >= amount;
    } catch (error) {
      logger.error('Error checking account balance:', error);
      throw error;
    }
  }

  async isAccountActive(accountNo: string): Promise<boolean> {
    try {
      const account = await this.findByAccountNo(accountNo);
      return account?.status === AccountStatus.ACTIVE;
    } catch (error) {
      logger.error('Error checking account status:', error);
      throw error;
    }
  }

  async getAccountWithLock(
    accountNo: string,
    session: mongoose.ClientSession
  ): Promise<IAccount | null> {
    try {
      // Use findOneAndUpdate with session to acquire a lock
      const account = await Account.findOne({ accountNo }).session(session);
      return account;
    } catch (error) {
      logger.error('Error getting account with lock:', error);
      throw error;
    }
  }

  async delete(accountNo: string): Promise<boolean> {
    try {
      const result = await Account.deleteOne({ accountNo });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw error;
    }
  }
}

export default new AccountRepository();