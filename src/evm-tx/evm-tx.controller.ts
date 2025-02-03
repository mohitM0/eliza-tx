import { Body, Controller, Post, Req } from '@nestjs/common';
import { EvmTxService } from './evm-tx.service';
import { BridgePayloadDTO, SwapPayloadDTO, TransferDTO } from './dto/create-evm-tx.dto';
import { Transaction } from 'src/_common/utils/interface';

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
      @Body() SwapPayloadDTO: SwapPayloadDTO,
    ):Promise<Transaction>{
      const authToken = req['authToken'];
      return this.evmTxService.swap(SwapPayloadDTO, authToken)
    }

    @Post('bridge')
    bridge(
      @Req() req: Request,
      @Body() BridgePayloadDTO: BridgePayloadDTO,
    ){
      const authToken = req['authToken'];
      // return this.evmTxService.bridge(BridgePayloadDTO, authToken)
      // return this.evmTxService.getRoutes(BridgePayloadDTO, authToken)
      return this.evmTxService.bridge(BridgePayloadDTO, authToken)
    }

}
