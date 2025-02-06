import { Module } from '@nestjs/common';
import { SolanaTxService } from './solana-tx.service';
import { SolanaTxController } from './solana-tx.controller';

@Module({
  controllers: [SolanaTxController],
  providers: [SolanaTxService],
})
export class SolanaTxModule {}
