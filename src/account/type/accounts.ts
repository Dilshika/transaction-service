import mongoose, { Schema, Document } from 'mongoose';

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export interface IAccount extends Document {
  accountNo: string;
  userId: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  accountType: string;
  frozenReason?: string;
  frozenAt?: Date;
  lastTransactionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema: Schema = new Schema(
  {
    accountNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
    },
    status: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
      index: true,
    },
    accountType: {
      type: String,
      required: true,
      default: 'SAVINGS',
    },
    frozenReason: {
      type: String,
    },
    frozenAt: {
      type: Date,
    },
    lastTransactionAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'accounts',
  }
);

// Compound indexes
AccountSchema.index({ userId: 1, status: 1 });

// Instance methods
AccountSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

AccountSchema.methods.freeze = function (reason: string) {
  this.status = AccountStatus.FROZEN;
  this.frozenReason = reason;
  this.frozenAt = new Date();
  return this.save();
};

AccountSchema.methods.unfreeze = function () {
  this.status = AccountStatus.ACTIVE;
  this.frozenReason = undefined;
  this.frozenAt = undefined;
  return this.save();
};

export default mongoose.model<IAccount>('Account', AccountSchema);