import { Body, Controller, Post } from '@nestjs/common';
import { EvmTxService } from './evm-tx.service';
import { SwapDTO, Transaction, TransferDTO } from './dto/create-evm-tx.dto';

@Controller('evm-tx')
export class EvmTxController {
  constructor(private readonly evmTxService: EvmTxService) {}
  @Post('transfer')
  transfer(@Body() transferDTO: TransferDTO): Promise<Transaction> {
    return this.evmTxService.transfer(transferDTO);
  }

  @Post('signMessage')
  signMessage(): Promise<any> {
    return this.evmTxService.signMessage();
  }

  @Post('swap')
  swap(@Body() data: SwapDTO): Promise<any> {
    return this.evmTxService.swap(data);
  }
}
