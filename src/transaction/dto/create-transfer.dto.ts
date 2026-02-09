import { IsString, IsNumber, IsPositive, IsOptional, MinLength, IsUUID } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @MinLength(5)
  fromAccount: string;

  @IsString()
  @MinLength(5)
  toAccount: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;
}