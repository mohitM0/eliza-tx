import { Module } from '@nestjs/common';
import { EvmTxService } from './evm-tx.service';
import { EvmTxController } from './evm-tx.controller';

@Module({
  controllers: [EvmTxController],
  providers: [EvmTxService],
})
export class EvmTxModule {}
