import { Injectable } from '@nestjs/common';
import {
  PrivyClient,
  WalletApiWalletResponseType,
} from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';
const { v4: uuidv4 } = require('uuid');
// import {createViemAccount} from '@privy-io/server-auth/viem';


@Injectable()
export class WalletService {
  private readonly privy: PrivyClient;
  constructor(private authTokenService: AuthTokenService) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'Privy App ID and App Secret must be set in environment variables.',
      );
    }

    this.privy = new PrivyClient(appId, appSecret);
  }

  async createServerWallet(
    id: string,
    authToken: string,
  ): Promise<WalletApiWalletResponseType[]> {
    const idempotencyKey_ETH = uuidv4();
    const idempotencyKey_SOL = uuidv4();

    const verifiedAuthToken =
      await this.authTokenService.verifyAuthToken(authToken);
    if (!verifiedAuthToken) {
      throw new Error('User is not verified.');
    }

    // const cleanId = id.split('did:privy:')[1];
    // if (!cleanId) {
    //   throw new Error('Invalid ID format. Expected "did:privy:<id>".');
    // }

    const wallet_ETH = await this.privy.walletApi.create({
      chainType: 'ethereum',
      // authorizationKeyIds: [cleanId],
      idempotencyKey: idempotencyKey_ETH,
    });

    const wallet_SOL = await this.privy.walletApi.create({
      chainType: 'solana',
      // authorizationKeyIds: [cleanId],
      idempotencyKey: idempotencyKey_SOL,
    });
    const wallets = [wallet_ETH, wallet_SOL] as WalletApiWalletResponseType[];

    console.log(wallets);

    // const tx = await this.privy.walletApi.
    return [wallet_ETH, wallet_SOL] as WalletApiWalletResponseType[];
  }
}
