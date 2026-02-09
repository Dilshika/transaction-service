import mongoose, { Schema, Document } from 'mongoose';

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  BILL_PAYMENT = 'BILL_PAYMENT',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND = 'REFUND',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  PROCESSING = 'PROCESSING',
}

export interface ITransaction extends Document {
  transactionId: string;
  type: TransactionType;
  status: TransactionStatus;
  fromAccount?: string;
  toAccount?: string;
  amount: number;
  currency: string;
  description?: string;
  referenceNo?: string;
  balanceAfter?: number;
  provider?: string;
  billReference?: string;
  confirmationCode?: string;
  idempotencyKey?: string;
  userId?: string;
  metadata?: Record;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
      default: TransactionStatus.PENDING,
      index: true,
    },
    fromAccount: {
      type: String,
      index: true,
    },
    toAccount: {
      type: String,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    referenceNo: {
      type: String,
      index: true,
    },
    balanceAfter: {
      type: Number,
    },
    provider: {
      type: String,
    },
    billReference: {
      type: String,
    },
    confirmationCode: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    errorMessage: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'transactions',
  },
);

// Compound indexes for common queries
TransactionSchema.index({ fromAccount: 1, createdAt: -1 });
TransactionSchema.index({ toAccount: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });

// Text index for search
TransactionSchema.index({ description: 'text', referenceNo: 'text' });

// Pre-save middleware
TransactionSchema.pre('save', function (next) {
  if (
    this.isModified('status') &&
    this.status === TransactionStatus.SUCCESS &&
    !this.processedAt
  ) {
    this.processedAt = new Date();
  }
  next();
});

// Instance methods
TransactionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export default mongoose.model('Transaction', TransactionSchema);
