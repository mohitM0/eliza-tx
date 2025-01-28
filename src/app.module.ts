import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvmTxModule } from './evm-tx/evm-tx.module';
import { WalletModule } from './wallet/wallet.module';
import { AccessTokenMiddleware } from './_common/middleware/accessToken.middleware';
import { WalletController } from './wallet/wallet.controller';
import { EvmTxController } from './evm-tx/evm-tx.controller';

@Module({
  imports: [
    EvmTxModule, 
    WalletModule,
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PWD,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],

})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AccessTokenMiddleware)
      .forRoutes(WalletController, EvmTxController);
  }
}
