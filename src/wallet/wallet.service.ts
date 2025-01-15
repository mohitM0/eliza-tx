import { Injectable } from '@nestjs/common';
import { PrivyClient, User, WalletApiCreateRequestType, WalletApiCreateResponseType } from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';
const { v4: uuidv4 } = require('uuid');

@Injectable()
export class WalletService {
  private readonly privy: PrivyClient;
  constructor(
    private authTokenService: AuthTokenService,
  ) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'Privy App ID and App Secret must be set in environment variables.',
      );
    }

    this.privy = new PrivyClient(appId, appSecret);
  }

  async createServerWallet(id: string, authToken: string): Promise<WalletApiCreateResponseType[]> {
    const idempotencyKey_ETH = uuidv4();
    const idempotencyKey_SOL = uuidv4();

    console.log("idempotency key:" + idempotencyKey_ETH);
    console.log("idempotency key:" + idempotencyKey_SOL);


    const verifiedAuthToken =
      await this.authTokenService.verifyAuthToken(authToken);
    if (!verifiedAuthToken) {
      throw new Error('User is not verified.');
    }
    console.log('Inside creating server wallet')
  
    const wallet_ETH = await this.privy.walletApi.create({
      chainType: 'ethereum',
      authorizationKeyIds: [id],
      idempotencyKey:idempotencyKey_ETH
    });


    const wallet_SOL = await this.privy.walletApi.create({
      chainType: 'solana',
      authorizationKeyIds: [id],
      idempotencyKey:idempotencyKey_SOL
    })
    
    return [wallet_ETH, wallet_SOL];
  }
}
