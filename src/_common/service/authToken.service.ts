import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuthTokenClaims, PrivyClient } from '@privy-io/server-auth';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export default class AuthTokenService {
  private readonly privy: PrivyClient;
  constructor() {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'Privy App ID and App Secret must be set in environment variables.',
      );
    }

    this.privy = new PrivyClient(appId, appSecret, {
      walletApi: {
        authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY,
      }
    });
  }

  async verifyAuthToken(authToken: string): Promise<AuthTokenClaims> {
    try {
      const verificationKey = process.env.VERIFICATION_KEY;
      if (!verificationKey) {
        throw new Error(
          'Verification Key must be set in environment variables.',
        );
      }
      
      const verifiedClaims = await this.privy.verifyAuthToken(
        authToken
      );

      console.log("verifiedClaims:" + verifiedClaims.appId);
      
      return verifiedClaims;
    } catch (error) {
      throw new InternalServerErrorException(`Token verification failed with error: ${error.message}`);
    }
  }
}
