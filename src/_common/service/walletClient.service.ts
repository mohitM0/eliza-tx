import { Injectable } from '@nestjs/common';
import { PrivyClient, User } from '@privy-io/server-auth';
import * as dotenv from 'dotenv';
import { createViemAccount } from '@privy-io/server-auth/viem';
import AuthTokenService from './authToken.service';
import {
  Account,
  Chain,
  createPublicClient,
  createWalletClient,
  http,
  LocalAccount,
  PublicClient,
  WalletClient,
} from 'viem';
import * as viemChains from 'viem/chains';
import { SupportedChain } from 'src/evm-tx/dto/create-evm-tx.dto';
import { bsc, mainnet, polygon } from 'viem/chains';

dotenv.config();

@Injectable()
export default class WalletClientService {
  private readonly privy: PrivyClient;
  chains: Record<string, Chain> = {
    ethereum: viemChains.mainnet,
    sepolia: viemChains.sepolia,
    bsc: viemChains.bsc,
    bscTestnet: viemChains.bscTestnet,
    base: viemChains.base,
    baseSepolia: viemChains.baseSepolia,
    polygon: viemChains.polygon,
    arbitrum: viemChains.arbitrum,
  };

  private chainFromChainId: Record<number, Chain> = {
    [mainnet.id]: mainnet,
    [polygon.id]: polygon,
    [bsc.id]: bsc,
    [viemChains.sepolia.id]: viemChains.sepolia
  };

  private providers: Record<number, string> = {
    [mainnet.id]: process.env.INFURA_PROVIDER_MAINNET,
    [polygon.id]: process.env.INFURA_PROVIDER_POLYGON,
    [bsc.id]: process.env.INFURA_PROVIDER_BSC,
    [viemChains.sepolia.id]: process.env.INFURA_PROVIDER_SEPOLIA
  };

  constructor(private authTokenService: AuthTokenService) {
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
      },
    });
  }

  async createLocalAccount(authToken: string): Promise<Account> {
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

  async getChainFromId(chainId: number): Promise<Chain> | undefined {
    return this.chainFromChainId[chainId];
  }

  async getProviderFromChainId(chainId: number): Promise<string> | undefined {
    return this.providers[chainId];
  }

  async createPublicClient(chainId: number) {
    try {
      const chain = await this.getChainFromId(chainId);
      const provider = await this.getProviderFromChainId(chainId);

      const publicClient = createPublicClient({
        chain: chain,
        transport: http(provider),
      });

      if (!publicClient) {
        throw new Error('Wallet Client not initialized');
      }

      console.log(`Public client created for chainId ${chainId}: `);
      
      return publicClient;
    } catch (error) {
      console.error(
        `Wallet client creation failed with error: ${error.message}`,
      );
      throw error;
    }
  }

  async createWalletClient({
    authToken,
    chain,
    chainId,
  }: {
    authToken: string;
    chain?: SupportedChain;
    chainId?: number;
  }): Promise<WalletClient> {
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

      let selectedChain;

      if (chain) {
        selectedChain = this.chains[chain];

        if (!selectedChain) {
          throw new Error('The chain you asked is not supported.');
        }
      } else if (chainId) {
        selectedChain = await this.getChainFromId(chainId);
      }

      const provider = await this.getProviderFromChainId(selectedChain.id);
      console.log('provider: ', provider);

      const client: WalletClient = createWalletClient({
        account: account as Account, // `Account` instance from above
        chain: selectedChain, // Replace with your desired network
        transport: http(provider),
      });

      if (!client) {
        throw new Error('Wallet Client not initialized');
      }
      console.log(`walletclient created for chainID ${chainId}: `);

      return client;
    } catch (error) {
      console.error(
        `Wallet client creation failed with error: ${error.message}`,
      );
      throw error;
    }
  }
}
