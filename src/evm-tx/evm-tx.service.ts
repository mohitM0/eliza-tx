import { Injectable } from '@nestjs/common';
import { Transaction, TransferDTO } from './dto/create-evm-tx.dto';
import { initWalletProvider, TransferAction } from 'src/lib/wallet';

@Injectable()
export class EvmTxService {
  
  async transfer(TransferPayload: TransferDTO): Promise<Transaction> {
    const walletProvider = await initWalletProvider();
    const action = new TransferAction(walletProvider);
    const result = await action.transfer(TransferPayload);
    console.log(result);
    
    return result;
  }
}
