import { Injectable } from '@nestjs/common';
import {
  BridgePayload,
  SwapPayload,
  Transaction,
  TransferDTO,
} from './dto/create-evm-tx.dto';
import { initWalletProvider, TransferAction } from 'src/lib/wallet';
import { PrivyClient } from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';
import WalletClientService from 'src/_common/service/walletClient.service';
import {
  ChainType,
  createConfig,
  executeRoute,
  ExtendedChain,
  getRoutes,
  getToken,
  getTokens,
  Token,
} from '@lifi/sdk';
import { Account, Hex, parseEther, WalletClient } from 'viem';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class EvmTxService {
  private readonly privy: PrivyClient;
  private swapConfig;
  private bridgeConfig;

  constructor(private walletClientService: WalletClientService) {
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

    this.swapConfig = createConfig({
      integrator: 'eliza',
      chains: Object.values(walletClientService.chains).map((config) => ({
        id: config.id,
        name: config.name,
        key: config.name.toLowerCase(),
        chainType: 'EVM' as const,
        nativeToken: {
          ...config.nativeCurrency,
          chainId: config.id,
          address: '0x0000000000000000000000000000000000000000',
          coinKey: config.nativeCurrency.symbol,
          priceUSD: '0',
          logoURI: '',
          symbol: config.nativeCurrency.symbol,
          decimals: config.nativeCurrency.decimals,
          name: config.nativeCurrency.name,
        },
        rpcUrls: {
          public: { http: [config.rpcUrls.default.http[0]] },
        },
        blockExplorerUrls: [config.blockExplorers.default.url],
        metamask: {
          chainId: `0x${config.id.toString(16)}`,
          chainName: config.name,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: [config.rpcUrls.default.http[0]],
          blockExplorerUrls: [config.blockExplorers.default.url],
        },
        coin: config.nativeCurrency.symbol,
        mainnet: true,
        diamondAddress: '0x0000000000000000000000000000000000000000',
      })) as ExtendedChain[],
    });

    this.bridgeConfig = createConfig({
      integrator: 'eliza',
      chains: Object.values(walletClientService.chains).map((config) => ({
        id: config.id,
        name: config.name,
        key: config.name.toLowerCase(),
        chainType: 'EVM',
        nativeToken: {
          ...config.nativeCurrency,
          chainId: config.id,
          address: '0x0000000000000000000000000000000000000000',
          coinKey: config.nativeCurrency.symbol,
        },
        metamask: {
          chainId: `0x${config.id.toString(16)}`,
          chainName: config.name,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: [config.rpcUrls.default.http[0]],
          blockExplorerUrls: [config.blockExplorers.default.url],
        },
        diamondAddress: '0x0000000000000000000000000000000000000000',
        coin: config.nativeCurrency.symbol,
        mainnet: true,
      })) as ExtendedChain[],
    });
  }

  async getTokenList(chainId: number){
    try {
      const tokens = await getTokens({
        chains: [chainId] ,
        chainTypes: [ChainType.EVM, ChainType.SVM],
      })
      console.log('tokens:', tokens.tokens[chainId]);
      return tokens.tokens[chainId];
      
    } catch (error) {
      console.error(error);
    }
  }

  async getTokenAddress(tokenSymbol: string, chainId: number): Promise<string> {
    const token = await getToken(chainId, tokenSymbol);
    const tokenAddress = token?.address;
    return tokenAddress;
  }

  async transfer(
    TransferPayload: TransferDTO,
    authToken: string,
  ): Promise<Transaction> {
    const walletClient: WalletClient =
      await this.walletClientService.createWalletClient(
        authToken,
        TransferPayload.fromChain,
      );

    const localAccount: Account =
      await this.walletClientService.createLocalAccount(authToken);
    console.log(
      `Transferring: ${TransferPayload.amount} tokens to (${TransferPayload.toAddress} on ${TransferPayload.fromChain})`,
    );

    if (!TransferPayload.data) {
      TransferPayload.data = '0x';
    }
    const fromChain =
      this.walletClientService.chains[TransferPayload.fromChain];

    try {
      try {
        const publicClient =
          await this.walletClientService.createPublicClient(fromChain);
        const nonce = await publicClient.getTransactionCount({
          address: localAccount.address,
        });

        const ethValue = parseEther(TransferPayload.amount);
        const value = parseInt(ethValue.toString());
        console.log(walletClient.account.address);

        const data = await this.privy.walletApi.ethereum.sendTransaction({
          address: walletClient.account.address.toLowerCase(),
          chainType: 'ethereum',
          caip2: `eip155:${fromChain.id}`,

          transaction: {
            to: TransferPayload.toAddress.toLowerCase(),
            value,
            chainId: fromChain.id,
          },
        });

        console.log('hash: ', data);
      } catch (error) {
        console.error('Error signing transaction:', error);
      }

      return {
        // @ts-ignore
        hash,
        from: walletClient.account.address,
        to: TransferPayload.toAddress,
        value: parseEther(TransferPayload.amount),
        data: TransferPayload.data as Hex,
      };
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  async swap(
    SwapPayload: SwapPayload,
    authToken: string,
  ): Promise<Transaction> {
    console.log('swap payload', SwapPayload);

    const walletClient: WalletClient =
      await this.walletClientService.createWalletClient(
        authToken,
        SwapPayload.chain,
      );
    const [fromAddress] = await walletClient.getAddresses();
    const chainId = await this.walletClientService.chains[SwapPayload.chain].id;

    await this.getTokenList(chainId);

    const inputTokenAddress = await this.getTokenAddress(
      SwapPayload.inputToken.toUpperCase(),
      chainId,
    );
    const outputTokenAddress = await this.getTokenAddress(
      SwapPayload.outputToken.toUpperCase(),
      chainId,
    );

    console.log('above get routes');

    console.log('Parameters passed to getRoutes:');
    console.log(
      'fromChainId:',
      this.walletClientService.chains[SwapPayload.chain].id,
    );
    console.log(
      'toChainId:',
      this.walletClientService.chains[SwapPayload.chain].id,
    );
    console.log('fromTokenAddress:', inputTokenAddress);
    console.log('toTokenAddress:', outputTokenAddress);
    console.log('fromAmount:', SwapPayload.amount);
    console.log('fromAddress:', fromAddress);

    const routes = await getRoutes({
      fromChainId: this.walletClientService.chains[SwapPayload.chain].id,
      toChainId: this.walletClientService.chains[SwapPayload.chain].id,
      fromTokenAddress: inputTokenAddress,
      toTokenAddress: outputTokenAddress,
      fromAmount: SwapPayload.amount as string,
      fromAddress: fromAddress,
      options: {
        slippage: 0.5,
        order: 'RECOMMENDED',
        fee: 0.02,
        integrator: 'elizaM0',
      },
    });
    console.log('below routes: ', routes);

    if (!routes.routes.length) throw new Error('No routes found');

    const execution = await executeRoute(routes.routes[0], this.swapConfig);
    console.log('execution success');

    const process = execution.steps[0]?.execution?.process[0];

    if (!process?.status || process.status === 'FAILED') {
      throw new Error('Transaction failed');
    }

    return {
      hash: process.txHash as `0x${string}`,
      from: fromAddress,
      to: routes.routes[0].steps[0].estimate.approvalAddress as `0x${string}`,
      value: BigInt(SwapPayload.amount),
      data: process.data as `0x${string}`,
      chainId: this.walletClientService.chains[SwapPayload.chain].id,
    };
  }

  async bridge(
    BridgePayload: BridgePayload,
    authToken: string,
  ): Promise<Transaction> {
    const walletClient = await this.walletClientService.createWalletClient(
      authToken,
      BridgePayload.fromChain,
    );
    const [fromAddress] = await walletClient.getAddresses();

    const routes = await getRoutes({
      fromChainId: this.walletClientService.chains[BridgePayload.fromChain].id,
      toChainId: this.walletClientService.chains[BridgePayload.toChain].id,
      fromTokenAddress: BridgePayload.fromToken,
      toTokenAddress: BridgePayload.toToken,
      fromAmount: BridgePayload.amount,
      fromAddress: fromAddress,
      toAddress: BridgePayload.toAddress || fromAddress,
      options: {
        fee: 0.02,
        integrator: 'elizaM0',
      },
    });

    if (!routes.routes.length) throw new Error('No routes found');

    const execution = await executeRoute(routes.routes[0], this.bridgeConfig);
    const process = execution.steps[0]?.execution?.process[0];

    if (!process?.status || process.status === 'FAILED') {
      throw new Error('Transaction failed');
    }

    return {
      hash: process.txHash as `0x${string}`,
      from: fromAddress,
      to: routes.routes[0].steps[0].estimate.approvalAddress as `0x${string}`,
      value: BigInt(BridgePayload.amount),
      chainId: this.walletClientService.chains[BridgePayload.fromChain].id,
    };
  }
}
