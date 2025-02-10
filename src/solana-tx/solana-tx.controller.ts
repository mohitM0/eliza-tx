import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query } from '@nestjs/common';
import { SolanaTxService } from './solana-tx.service';
import { TransferDTO } from './dto/transfer.dto';
import { SwapDTO } from './dto/swap.dto';

@Controller('solana-tx')
export class SolanaTxController {
  constructor(private readonly solanaTxService: SolanaTxService) {}

  @Post('transfer')
  transfer(
    @Req() req: Request,
    @Body() transferDTO: TransferDTO,
  ) {
    const authToken = req['authToken'];
    return this.solanaTxService.transfer(transferDTO, authToken)
  }

  @Post('swap')
  transferSwap(
    @Req() req: Request,
    @Body() swapDTO: SwapDTO,
  ) {
    const authToken = req['authToken'];
    return this.solanaTxService.swap(swapDTO, authToken)
  }

  // @Get('get-swap-routes')
  // getSwapRoutes(
  //   @Query() transferDTO: TransferDTO,
  // ) {
  //   return this.solanaTxService.getRoutes(transferDTO)
  // }


}
