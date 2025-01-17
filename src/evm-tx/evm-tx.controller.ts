import { Body, Controller, Post } from '@nestjs/common';
import { EvmTxService } from './evm-tx.service';
import { Transaction, TransferDTO } from './dto/create-evm-tx.dto';

@Controller('evm-tx')
export class EvmTxController {
  constructor(private readonly evmTxService: EvmTxService) {}
  @Post('transfer')
  transfer(@Body() transferDTO: TransferDTO): Promise<Transaction> {
    return this.evmTxService.transfer(transferDTO);
  }
}
