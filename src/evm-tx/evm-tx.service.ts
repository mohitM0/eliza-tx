import { Injectable } from '@nestjs/common';
import { SwapDTO, Transaction, TransferDTO } from './dto/create-evm-tx.dto';
import { initWalletProvider, TransferAction } from 'src/lib/wallet';
import { PrivyClient } from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';
import {
  getQuote,
  QuoteRequest,
  convertQuoteToRoute,
  executeRoute,
} from '@lifi/sdk';

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

  async swap(data: SwapDTO) {
    //TODO: Set the config for the SDK with the user wallet client
    const quoteRequest: QuoteRequest = {
      fromChain: data.fromChain,
      toChain: data.toChain,
      fromToken: data.fromTokenAddress,
      toToken: data.toTokenAddress,
      fromAmount: data.amount, // converted to the decimal of that token
      // The address from which the tokens are being transferred.
      fromAddress: data.fromAddress,
    };

    const quote = await getQuote(quoteRequest);

    const route = convertQuoteToRoute(quote);

    const executedRoute = await executeRoute(route, {
      // Gets called once the route object gets new updates
      updateRouteHook(route) {
        console.log(route); // check the response and after testing check what to return
        return route;
      },
    });

    return executedRoute;
  }
}
