import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import {
  TransactionStatus,
  TransactionType,
} from '../graphql/transaction.enums';

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

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({
    required: true,
    enum: TransactionStatus,
    default: TransactionStatus.PROCESSING,
  })
  status: TransactionStatus;

  @Prop()
  fromAccount: string;

  @Prop()
  toAccount: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  balanceAfter: number;

  @Prop({ index: true }) // Index for faster idempotency checks
  idempotencyKey: string;

  @Prop()
  userId: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);



@InputType()
export class TransferInput {
  @Field() @IsString() fromAccount: string;
  @Field() @IsString() toAccount: string;
  @Field(() => Float) @IsNumber() amount: number;
  @Field() @IsString() currency: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field({ nullable: true }) @IsOptional() referenceNo?: string;
  @Field({ nullable: true }) @IsOptional() userId?: string;
  @Field({ nullable: true }) @IsOptional() idempotencyKey?: string;
}

@InputType()
export class TransactionHistoryInput {
  @Field() @IsString() accountNo: string;
  @Field(() => Int, { nullable: true }) @IsOptional() limit?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() offset?: number;
  @Field({ nullable: true }) @IsOptional() startDate?: string;
  @Field({ nullable: true }) @IsOptional() endDate?: string;
  @Field(() => TransactionStatus, { nullable: true })
  @IsOptional()
  status?: TransactionStatus;
  @Field(() => TransactionType, { nullable: true })
  @IsOptional()
  type?: TransactionType;
}


registerEnumType(TransactionType, { name: 'TransactionType' });
registerEnumType(TransactionStatus, { name: 'TransactionStatus' });
registerEnumType(AccountStatus, { name: 'AccountStatus' });