import { Body, Controller, Post, Req } from '@nestjs/common';
import { EvmTxService } from './evm-tx.service';
import { BridgePayload, SwapPayload, Transaction, TransferDTO } from './dto/create-evm-tx.dto';

@Controller('evm-tx')
export class EvmTxController {
  constructor(private readonly evmTxService: EvmTxService) {}
  @Post('transfer')
    transfer(
      @Req() req: Request,
      @Body() transferDTO: TransferDTO,
    ):Promise<Transaction>{
      const authToken = req['authToken'];
      return this.evmTxService.transfer(transferDTO, authToken)
    }

    @Post('swap')
    swap(
      @Req() req: Request,
      @Body() swapPayload: SwapPayload,
    ):Promise<Transaction>{
      const authToken = req['authToken'];
      return this.evmTxService.swap(swapPayload, authToken)
    }

    @Post('bridge')
    bridge(
      @Req() req: Request,
      @Body() bridgePayload: BridgePayload,
    ):Promise<Transaction>{
      const authToken = req['authToken'];
      return this.evmTxService.bridge(bridgePayload, authToken)
    }

}
