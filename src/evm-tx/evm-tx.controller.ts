import { Controller } from '@nestjs/common';
import { EvmTxService } from './evm-tx.service';

@Controller({ path: 'evm-tx', version: '1' })
export class EvmTxController {
  constructor(private readonly evmTxService: EvmTxService) {}
}
