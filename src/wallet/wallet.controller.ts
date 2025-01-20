import { Body, Controller, Post, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateServerWalletDto } from './dto/create-server-wallet.dto';
import { WalletApiWalletResponseType } from '@privy-io/server-auth';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('createServerWallet')
  createServerWallet(
    @Req() req: Request,
    @Body() createServerWalletDto: CreateServerWalletDto,
  ): Promise<WalletApiWalletResponseType[]> {
    const authToken = req['authToken'];

    return this.walletService.createServerWallet(
      createServerWalletDto.id,
      authToken,
    );
  }
}
