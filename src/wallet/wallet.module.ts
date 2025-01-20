import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import AuthTokenService from 'src/_common/service/authToken.service';
import WalletClientService from 'src/_common/service/walletClient.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, AuthTokenService, WalletClientService],
})
export class WalletModule {}
