import { Body, Controller, Post, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateServerWalletDto } from './dto/create-server-wallet.dto';
import { WalletApiCreateResponseType } from '@privy-io/server-auth';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('createServerWallet')
  createServerWallet(
    @Req() req: Request,
    @Body() createServerWalletDto: CreateServerWalletDto,
  ): Promise<WalletApiCreateResponseType[]> {
    const authToken = req['authToken'];

    return this.walletService.createServerWallet(
      createServerWalletDto.id,
      authToken,
    );
  }
}
