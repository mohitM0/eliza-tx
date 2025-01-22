import { Injectable } from '@nestjs/common';
import { PrivyClient, User } from '@privy-io/server-auth';
import * as dotenv from 'dotenv';
import { createViemAccount } from '@privy-io/server-auth/viem';
import AuthTokenService from './authToken.service';
import {
  Account,
  Chain,
  createWalletClient,
  http,
  LocalAccount,
  WalletClient,
} from 'viem';
import * as viemChains from 'viem/chains';
import { SupportedChain } from 'src/evm-tx/dto/create-evm-tx.dto';

dotenv.config();

@Injectable()
export default class WalletClientService {
  private readonly privy: PrivyClient;
  chains: Record<string, Chain> = {
    mainnet: viemChains.mainnet,
    sepolia: viemChains.sepolia,
    bsc: viemChains.bsc,
    bscTestnet: viemChains.bscTestnet,
    base: viemChains.base,
    baseSepolia: viemChains.baseSepolia,
    polygon: viemChains.polygon,
    arbitrum: viemChains.arbitrum,
  };
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

  async createLocalAccount(authToken: string): Promise<LocalAccount> {
    try {
      const verifiedAuthToken =
        await this.authTokenService.verifyAuthToken(authToken);
      if (!verifiedAuthToken) {
        throw new Error('User is not verified.');
      }

      const user: any = await this.privy.getUserById(verifiedAuthToken.userId);
      const privyEthereumAccount = user.linkedAccounts.find(
        (account) =>
          account.walletClientType === 'privy' &&
          account.connectorType === 'embedded' &&
          account.chainType === 'ethereum',
      );
      const privyEthereumAddress = privyEthereumAccount.address;
      if (privyEthereumAddress) {
        console.log('Privy Ethereum Address:', privyEthereumAddress);
      } else {
        console.log('No linked account matches the criteria.');
      }

      const account: Account = await createViemAccount({
        walletId: user.id,
        address: privyEthereumAddress,
        privy: this.privy,
      });
      return account;
    } catch (error) {
      console.error(
        `Local account creation failed with error: ${error.message}`,
      );
      throw error;
    }
  }

  async createWalletClient(
    authToken: string,
    chain: SupportedChain,
  ): Promise<WalletClient> {
    try {
      const verifiedAuthToken =
        await this.authTokenService.verifyAuthToken(authToken);
      if (!verifiedAuthToken) {
        throw new Error('User is not verified.');
      }
      // console.log('userId: ', verifiedAuthToken.userId);

      const user: any = await this.privy.getUserById(verifiedAuthToken.userId);
      const privyEthereumAccount = user.linkedAccounts.find(
        (account) =>
          account.walletClientType === 'privy' &&
          account.connectorType === 'embedded' &&
          account.chainType === 'ethereum',
      );

      const privyEthereumAddress = privyEthereumAccount.address;
      if (privyEthereumAddress) {
        console.log('Privy Ethereum Address:', privyEthereumAddress);
      } else {
        console.log('No linked account matches the criteria.');
      }

      const account = await createViemAccount({
        walletId: user.id,
        address: privyEthereumAddress,
        privy: this.privy,
      });

      const selectedChain = this.chains[chain];

      if (!selectedChain) {
        throw new Error('The chain you asked is not supported.');
      }

      const client: WalletClient = createWalletClient({
        account: account as Account, // `Account` instance from above
        chain: selectedChain, // Replace with your desired network
        transport: http(
          'https://sepolia.infura.io/v3/83d21f55255f46aba00654f32fc0a153',
        ),
      });

      if (!client) {
        throw new Error('Wallet Client not initialized');
      }

      return client;
    } catch (error) {
      console.error(
        `Wallet client creation failed with error: ${error.message}`,
      );
      throw error;
    }
  }
}
