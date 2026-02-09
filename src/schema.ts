import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime

  type Query {
    """
    Get transaction by ID
    """
    transaction(transactionId: ID!): Transaction

    """
    Get transaction history for an account with pagination
    """
    transactionHistory(input: TransactionHistoryInput!): TransactionHistoryResponse!

    """
    Get account details
    """
    account(accountNo: String!): Account

    """
    Get transaction statistics
    """
    transactionStatistics(accountNo: String!, startDate: DateTime, endDate: DateTime): [TransactionStats!]!
  }

  type Mutation {
    """
    Transfer funds between accounts
    """
    transfer(input: TransferInput!): TransferResponse!

    """
    Process bill payment
    """
    billPayment(input: BillPaymentInput!): BillPaymentResponse!
  }

  """
  Transaction input for fund transfer
  """
  input TransferInput {
    fromAccount: String!
    toAccount: String!
    amount: Float!
    currency: String!
    description: String
    referenceNo: String
    userId: String
    idempotencyKey: String
  }

  """
  Transaction input for bill payment
  """
  input BillPaymentInput {
    accountNo: String!
    provider: String!
    amount: Float!
    billReference: String!
    description: String
    currency: String
    userId: String
    idempotencyKey: String
  }

  """
  Transaction history input
  """
  input TransactionHistoryInput {
    accountNo: String!
    limit: Int
    offset: Int
    startDate: String
    endDate: String
    status: TransactionStatus
    type: TransactionType
  }

  """
  Transfer response
  """
  type TransferResponse {
    transaction_id: ID!
    status: String!
    from_account: String!
    to_account: String!
    amount: Float!
    new_balance: Float!
    timestamp: DateTime!
    reference_no: String
  }

  """
  Bill payment response
  """
  type BillPaymentResponse {
    transaction_id: ID!
    status: String!
    provider: String!
    amount: Float!
    confirmation_code: String!
    timestamp: DateTime!
  }

  """
  Transaction history response
  """
  type TransactionHistoryResponse {
    account_no: String!
    total_count: Int!
    limit: Int!
    offset: Int!
    transactions: [TransactionItem!]!
  }

  """
  Individual transaction item in history
  """
  type TransactionItem {
    id: ID!
    type: String!
    amount: Float!
    description: String
    timestamp: DateTime!
    balance_after: Float
    status: String!
    reference_no: String
  }

  """
  Full transaction details
  """
  type Transaction {
    transactionId: ID!
    type: TransactionType!
    status: TransactionStatus!
    fromAccount: String
    toAccount: String
    amount: Float!
    currency: String!
    description: String
    referenceNo: String
    balanceAfter: Float
    provider: String
    billReference: String
    confirmationCode: String
    userId: String
    errorMessage: String
    createdAt: DateTime!
    updatedAt: DateTime!
    processedAt: DateTime
  }

  """
  Account details
  """
  type Account {
    accountNo: String!
    userId: String!
    balance: Float!
    currency: String!
    status: AccountStatus!
    accountType: String!
    frozenReason: String
    frozenAt: DateTime
    lastTransactionAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  Transaction statistics
  """
  type TransactionStats {
    type: String!
    count: Int!
    totalAmount: Float!
    avgAmount: Float!
  }

  """
  Transaction type enum
  """
  enum TransactionType {
    TRANSFER
    BILL_PAYMENT
    DEPOSIT
    WITHDRAWAL
    REFUND
  }

  """
  Transaction status enum
  """
  enum TransactionStatus {
    PENDING
    SUCCESS
    FAILED
    REVERSED
    PROCESSING
  }

  """
  Account status enum
  """
  enum AccountStatus {
    ACTIVE
    FROZEN
    SUSPENDED
    CLOSED
  }
`;