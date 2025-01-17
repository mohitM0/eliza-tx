import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvmTxModule } from './evm-tx/evm-tx.module';
import { WalletModule } from './wallet/wallet.module';
import { AccessTokenMiddleware } from './_common/middleware/accessToken.middleware';
import { WalletController } from './wallet/wallet.controller';

@Module({
  imports: [EvmTxModule, WalletModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessTokenMiddleware).forRoutes(WalletController);
  }
}
