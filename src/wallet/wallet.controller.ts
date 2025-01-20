import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateServerWalletDto } from './dto/create-server-wallet.dto';
import { User, WalletApiWalletResponseType } from '@privy-io/server-auth';

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

  @Get('getUser')
  getUser(
    @Req() req: Request
  ): Promise<any>{
    const authToken = req['authToken'];
    return this.walletService.createWalletClient(authToken);
  }
}
