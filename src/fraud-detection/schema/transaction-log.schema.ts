import mongoose, { Schema, Document } from 'mongoose';

const TransactionLogSchema: Schema = new Schema({
  transaction_id: { type: String, required: true, index: true },
  account_no: { type: String, required: true, index: true },
  user_id: { type: String, required: true },

  transaction_details: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'LKR' },
    type: { type: String, enum: ['DEBIT', 'CREDIT'] },
    category: { type: String },
  },

  security_context: {
    ip_address: { type: String, required: true },
    device_id: { type: String, required: true },
    user_agent: { type: String },
    geo_location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number], // [longitude, latitude]
    },
    mfa_verified: { type: Boolean, default: false },
  },

  timestamp: { type: Date, default: Date.now },
});

// Critical for Fraud Detection: Geospatial Index
TransactionLogSchema.index({ 'security_context.geo_location': '2dsphere' });

export const TransactionLog = mongoose.model<Document>(
  'TransactionLog',
  TransactionLogSchema,
);
