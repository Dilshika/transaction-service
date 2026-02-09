import { GraphQLScalarType, Kind } from 'graphql';
import TransactionService from '../services/TransactionService';
import TransactionRepository from '../repositories/TransactionRepository';
import AccountRepository from '../repositories/AccountRepository';
import logger from '../utils/logger';

// Custom DateTime scalar
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return new Date(value).toISOString();
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    transaction: async (
      _: any,
      { transactionId }: { transactionId: string },
      context: any,
    ) => {
      try {
        logger.info('GraphQL Query: transaction', {
          transactionId,
          userId: context.user?.id,
        });

        const transaction = await TransactionRepository.findById(transactionId);

        if (!transaction) {
          throw new Error('Transaction not found');
        }

        // Authorization check - user can only view their own transactions
        if (context.user && transaction.userId !== context.user.id) {
          throw new Error('Unauthorized access to transaction');
        }

        return transaction;
      } catch (error) {
        logger.error('Error in transaction query:', error);
        throw error;
      }
    },

    transactionHistory: async (
      _: any,
      { input }: { input: any },
      context: any,
    ) => {
      try {
        logger.info('GraphQL Query: transactionHistory', {
          accountNo: input.accountNo,
          userId: context.user?.id,
        });

        // Authorization check - verify user owns the account
        const account = await AccountRepository.findByAccountNo(
          input.accountNo,
        );
        if (!account) {
          throw new Error('Account not found');
        }

        if (context.user && account.userId !== context.user.id) {
          throw new Error('Unauthorized access to account');
        }

        const result = await TransactionService.getTransactionHistory(input);
        return result;
      } catch (error) {
        logger.error('Error in transactionHistory query:', error);
        throw error;
      }
    },

    account: async (
      _: any,
      { accountNo }: { accountNo: string },
      context: any,
    ) => {
      try {
        logger.info('GraphQL Query: account', {
          accountNo,
          userId: context.user?.id,
        });

        const account = await AccountRepository.findByAccountNo(accountNo);

        if (!account) {
          throw new Error('Account not found');
        }

        // Authorization check
        if (context.user && account.userId !== context.user.id) {
          throw new Error('Unauthorized access to account');
        }

        return account;
      } catch (error) {
        logger.error('Error in account query:', error);
        throw error;
      }
    },

    transactionStatistics: async (
      _: any,
      {
        accountNo,
        startDate,
        endDate,
      }: { accountNo: string; startDate?: Date; endDate?: Date },
      context: any,
    ) => {
      try {
        logger.info('GraphQL Query: transactionStatistics', {
          accountNo,
          userId: context.user?.id,
        });

        // Authorization check
        const account = await AccountRepository.findByAccountNo(accountNo);
        if (!account) {
          throw new Error('Account not found');
        }

        if (context.user && account.userId !== context.user.id) {
          throw new Error('Unauthorized access to account');
        }

        const stats = await TransactionRepository.getStatistics(
          accountNo,
          startDate,
          endDate,
        );

        return stats.map((stat: any) => ({
          type: stat._id,
          count: stat.count,
          totalAmount: stat.totalAmount,
          avgAmount: stat.avgAmount,
        }));
      } catch (error) {
        logger.error('Error in transactionStatistics query:', error);
        throw error;
      }
    },
  },

  Mutation: {
    transfer: async (_: any, { input }: { input: any }, context: any) => {
      try {
        logger.info('GraphQL Mutation: transfer', {
          fromAccount: input.fromAccount,
          toAccount: input.toAccount,
          amount: input.amount,
          userId: context.user?.id,
        });

        // Attach user ID from context if available
        if (context.user) {
          input.userId = context.user.id;
        }

        // Authorization check - verify user owns the from account
        const fromAccount = await AccountRepository.findByAccountNo(
          input.fromAccount,
        );
        if (!fromAccount) {
          throw new Error('From account not found');
        }

        if (context.user && fromAccount.userId !== context.user.id) {
          throw new Error(
            'Unauthorized: You can only transfer from your own accounts',
          );
        }

        const result = await TransactionService.transfer(input);
        return result;
      } catch (error) {
        logger.error('Error in transfer mutation:', error);

        // Map error messages to appropriate error codes
        if (error instanceof Error) {
          if (error.message.includes('Insufficient funds')) {
            throw new Error('400: Insufficient funds');
          }
          if (error.message.includes('frozen')) {
            throw new Error('423: Account frozen due to fraud detection');
          }
          if (error.message.includes('Duplicate')) {
            throw new Error(
              '409: Duplicate transaction (idempotency key already used)',
            );
          }
          if (error.message.includes('not found')) {
            throw new Error('400: Invalid account number');
          }
        }

        throw error;
      }
    },

    billPayment: async (_: any, { input }: { input: any }, context: any) => {
      try {
        logger.info('GraphQL Mutation: billPayment', {
          accountNo: input.accountNo,
          provider: input.provider,
          amount: input.amount,
          userId: context.user?.id,
        });

        // Attach user ID from context if available
        if (context.user) {
          input.userId = context.user.id;
        }

        // Authorization check - verify user owns the account
        const account = await AccountRepository.findByAccountNo(
          input.accountNo,
        );
        if (!account) {
          throw new Error('Account not found');
        }

        if (context.user && account.userId !== context.user.id) {
          throw new Error(
            'Unauthorized: You can only make payments from your own accounts',
          );
        }

        const result = await TransactionService.billPayment(input);
        return result;
      } catch (error) {
        logger.error('Error in billPayment mutation:', error);

        // Map error messages to appropriate error codes
        if (error instanceof Error) {
          if (error.message.includes('Insufficient funds')) {
            throw new Error('400: Insufficient funds');
          }
          if (error.message.includes('not found')) {
            throw new Error('400: Invalid account number');
          }
          if (error.message.includes('Duplicate')) {
            throw new Error(
              '409: Duplicate transaction (idempotency key already used)',
            );
          }
        }

        throw error;
      }
    },
  },
};
