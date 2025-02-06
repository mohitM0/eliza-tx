import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvmTxModule } from './evm-tx/evm-tx.module';
import { AccessTokenMiddleware } from './_common/middleware/accessToken.middleware';
import { EvmTxController } from './evm-tx/evm-tx.controller';
import { ScheduleService } from './_common/service/schedule.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './_common/service/prisma.service';
import { SolanaTxModule } from './solana-tx/solana-tx.module';
import WalletClientService from './_common/service/walletClient.service';
import AuthTokenService from './_common/service/authToken.service';

@Module({
  imports: [
    EvmTxModule, 
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PWD,
      },
    }),
    SolanaTxModule,
  ],
  controllers: [AppController],
  providers: [AppService, ScheduleService, PrismaService, WalletClientService, AuthTokenService],

})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AccessTokenMiddleware)
      .forRoutes(EvmTxController);
  }
}
