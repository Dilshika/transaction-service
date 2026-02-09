import { TransactionStatus, TransactionType } from "../enum/transaction.enum";


export interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  description?: string;
  referenceNo?: string;
  userId: string;
  idempotencyKey?: string;
}

export interface BillPaymentRequest {
  accountNo: string;
  provider: string;
  amount: number;
  billReference: string;
  description?: string;
  currency?: string;
  userId: string;
  idempotencyKey?: string;
}

export interface TransactionHistoryFilters {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  status?: TransactionStatus;
  type?: TransactionType;
}