import { Injectable } from '@nestjs/common';
import { AuthTokenClaims, PrivyClient } from '@privy-io/server-auth';
import * as dotenv from 'dotenv';
import {createViemAccount} from '@privy-io/server-auth/viem';



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

    this.privy = new PrivyClient(appId, appSecret);
  }

  async verifyAuthToken(authToken: string): Promise<AuthTokenClaims> {
    try {
      const verificationKey = process.env.VERIFICATION_KEY;
      console.log("verification key: " + verificationKey);
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
      console.error(`Token verification failed with error: ${error.message}`);
      throw error;
    }
  }
}
