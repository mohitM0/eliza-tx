import { Body, Controller, Post, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateServerWalletDto } from './dto/create-server-wallet.dto';
import { User } from '@privy-io/server-auth';

@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('createServerWallet')
  createServerWallet(
    @Req() req: Request,
    @Body() createServerWalletDto: CreateServerWalletDto,
  ): Promise<User> {
    const authToken = req['authToken'];

    return this.walletService.createServerWallet(
      createServerWalletDto.id,
      authToken,
    );
  }
}
