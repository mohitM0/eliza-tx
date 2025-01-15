import { Injectable } from '@nestjs/common';
import { PrivyClient, User, WalletApiCreateRequestType } from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';

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

  async createServerWallet(id: string, authToken: string) {
    const verifiedAuthToken =
      await this.authTokenService.verifyAuthToken(authToken);
    if (!verifiedAuthToken) {
      throw new Error('User is not verified.');
    }
    console.log('Inside creating server wallet')

    // const walletCreationInput: WalletApiCreateRequestType = {
    //   chainType: 'ethereum',
    //   authorizationKeyIds: []
    // }
    const wallet = await this.privy.walletApi.create({
      chainType: 'ethereum',
      authorizationKeyIds: [id],
      auth
    })
    return wallet;
  }
}
