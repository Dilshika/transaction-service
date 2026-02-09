import { Module } from "@nestjs/common";
import { TransactionService } from "./service/transaction.service";
import transactionRepository from "./repository/transaction.repository";

@Module({
    imports: [],
    controllers: [],
    providers: [TransactionService, transactionRepository],
})
export class TransactionModule {}