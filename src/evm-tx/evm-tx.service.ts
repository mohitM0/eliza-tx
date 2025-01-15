import { Injectable } from '@nestjs/common';
import { TransferDTO } from './dto/create-evm-tx.dto';

@Injectable()
export class EvmTxService {
  
  async transfer(TransferPayload: TransferDTO) {

  }
}
