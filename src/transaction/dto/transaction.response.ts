import { TransactionStatus } from "../enum/transaction.enum";


export type TransactionResponse = {
  transaction_id: string;
  status: 'SUCCESS' | 'FAILED' | 'PROCESSING';
  amount: number;
  timestamp: string;
  reference_no?: string;
  confirmation_code?: string;
  new_balance?: number;
};

export type HistoryResponse = {
  account_no: string;
  total_count: number;
  limit: number;
  offset: number;
  transactions: Array<{
    id: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string;
    timestamp: Date;
    balance_after: number;
    status: TransactionStatus;
  }>;
};