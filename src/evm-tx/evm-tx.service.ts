import { Injectable } from '@nestjs/common';
import { Transaction, TransferDTO } from './dto/create-evm-tx.dto';
import { initWalletProvider, TransferAction } from 'src/lib/wallet';
import { PrivyClient } from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';

@Injectable()
export class EvmTxService {
  private readonly privy: PrivyClient;
  constructor() {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'Privy App ID and App Secret must be set in environment variables.',
      );
    }

    this.privy = new PrivyClient(appId, appSecret);
  }

  async transfer(TransferPayload: TransferDTO): Promise<Transaction> {
    const walletProvider = await initWalletProvider();
    const action = new TransferAction(walletProvider);
    const result = await action.transfer(TransferPayload);
    console.log('Transaction output: ', result);

    return result;
  }

  async signMessage(): Promise<any> {
    console.log('inside service file');
    const data = await this.privy.walletApi.ethereum.signMessage({
      walletId: 'cm5z37m8u0acaxy1tpqqpo60h',
      message: 'Hello world',
    });
    // Get the signature and encoding from the response
    const { signature, encoding } = data;
    console.log(data);
    return data;
  }
}
