import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotency extends Document {
  key: string;
  transactionId: string;
  response: any;
  expiresAt: Date;
  createdAt: Date;
}

const IdempotencySchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    response: {
      type: Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'idempotency',
  }
);

// TTL index to automatically delete expired records
IdempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IIdempotency>('Idempotency', IdempotencySchema);