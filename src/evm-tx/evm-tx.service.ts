import { Injectable } from '@nestjs/common';
import {
  BridgePayload,
  SwapPayload,
  Transaction,
  TransferDTO,
} from './dto/create-evm-tx.dto';
import { initWalletProvider, TransferAction } from 'src/lib/wallet';
import {
  EthereumSendTransactionResponseType,
  PrivyClient,
} from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';
import WalletClientService from 'src/_common/service/walletClient.service';
import {
  createConfig,
  executeRoute,
  ExtendedChain,
  getRoutes,
  EVM,
  getTokens,
  ChainType,
  getToken,
  getStepTransaction,
  getStatus,
  Route,
} from '@lifi/sdk';
import {
  Account,
  ByteArray,
  Client,
  createPublicClient,
  createWalletClient,
  formatUnits,
  Hex,
  http,
  LocalAccount,
  parseEther,
  parseUnits,
  WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import { log } from 'console';
import { returnStepsExecution } from 'src/_common/helper/returnStepsExecution';
import { parse } from 'path';
import axios from 'axios';

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

  async getTokenList(chainId: number) {
    try {
      const tokens = await getTokens({
        chains: [chainId],
        chainTypes: [ChainType.EVM, ChainType.SVM],
      });
      // console.log('tokens:', tokens.tokens[chainId]);
      return tokens.tokens[chainId];
    } catch (error) {
      console.error(error);
    }
  }

  async getTokenAddress(tokenSymbol: string, chainId: number): Promise<string> {
    const token = await getToken(chainId, tokenSymbol);
    const tokenDec = token.decimals;
    const tokenAddress = token?.address;
    return tokenAddress;
  }

  async getTokenDec(tokenSymbol: string, chainId: number): Promise<number> {
    const token = await getToken(chainId, tokenSymbol);
    const tokenDec = token.decimals;
    return tokenDec;
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
        // const hash = await this.privy.walletApi.ethereum.sendTransaction({
        //   walletId: 'did:privy:cm5zg7mos0351lno23pz91sgv',
        //   caip2: `eip155:${fromChain.id}`,
        //   transaction: {
        //     to: TransferPayload.toAddress.toLocaleLowerCase() as `0x${string}`,
        //     value: parseEther(TransferPayload.amount),
        //     chainId: fromChain.id,
        //   },
        // })
        console.log('above');

        // const txData = await walletClient.prepareTransactionRequest({
        //   account: walletClient.account.address,
        //   to: TransferPayload.toAddress.toLocaleLowerCase() as `0x${string}`,
        //   value: parseEther(TransferPayload.amount),
        //   data: TransferPayload.data as Hex,
        //   chain: fromChain,
        //   kzg: {
        //     blobToKzgCommitment: function (_: ByteArray): ByteArray {
        //       throw new Error('Function not implemented.');
        //     },
        //     computeBlobKzgProof: function (
        //       _blob: ByteArray,
        //       _commitment: ByteArray,
        //     ): ByteArray {
        //       throw new Error('Function not implemented.');
        //     },
        //   },
        // });

        // console.log('txData: ', txData);

        // console.log('local account: ', localAccount);

        // const acc = privateKeyToAccount(
        //   '0x1523ae53ba92b720fcebe94671d7d3572bd380e0732226bf6e44efa3bb01cfa6',
        // );
        // console.log('acc: ', acc);

        const publicClient = createPublicClient({
          chain: fromChain, // Use the chain you're working with, e.g., Sepolia
          transport: http(
            'https://sepolia.infura.io/v3/83d21f55255f46aba00654f32fc0a153',
          ),
        });
        const nonce = await publicClient.getTransactionCount({
          address: localAccount.address,
        });

        // const serializedTransaction = await localAccount.signMessage({message: "hello"});
        // const serializedTransaction = await localAccount.signTransaction({
        //   to: TransferPayload.toAddress.toLocaleLowerCase() as `0x${string}`,
        //   value: parseEther(TransferPayload.amount),
        //   data: TransferPayload.data as Hex,
        //   chainId: fromChain.id,
        //   nonce: Number(nonce),
        //   gas: BigInt(21000),
        //   maxFeePerGas: BigInt(50000000000),
        //   maxPriorityFeePerGas: BigInt(2000000000),
        // });
        // console.log('serializedTransaction: ', serializedTransaction);

        // const hash = await walletClient.sendRawTransaction({
        //   serializedTransaction,
        // });

        const ethValue = parseEther(TransferPayload.amount);
        const value = parseInt(ethValue.toString());

        const data = await this.privy.walletApi.ethereum.signTransaction({
          address: walletClient.account.address.toLowerCase(),
          chainType: 'ethereum',

          transaction: {
            to: TransferPayload.toAddress.toLowerCase(),
            value,
            chainId: fromChain.id,
            gasLimit: parseInt(BigInt(21000).toString()),
            nonce: Number(nonce),
            maxFeePerGas: parseInt(BigInt(50000000000).toString()),
            maxPriorityFeePerGas: parseInt(BigInt(2000000000).toString()),
          },
        });

        const signedTx = data.signedTransaction;
        console.log('signedTx: ', signedTx);
        const hash = await walletClient.sendRawTransaction({
          serializedTransaction: signedTx as `0x${string}`,
        });

        // console.log(walletClient.account);
        // const data = await this.privy.walletApi.ethereum.signMessage({
        //   address: walletClient.account.address.toLowerCase(),
        //   chainType: 'ethereum',
        //   message: 'Hello world',
        // });
        console.log('hash: ', hash);
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
    try {
      const walletClient: WalletClient =
        await this.walletClientService.createWalletClient(
          authToken,
          SwapPayload.chain,
        );
      const [fromAddress] = await walletClient.getAddresses();

      const chainId =
        await this.walletClientService.chains[SwapPayload.chain].id;

      // await this.getTokenList(chainId);

      const inputTokenAddress = await this.getTokenAddress(
        SwapPayload.inputToken.toUpperCase(),
        chainId,
      );
      const outputTokenAddress = await this.getTokenAddress(
        SwapPayload.outputToken.toUpperCase(),
        chainId,
      );

      const evmProvider = EVM({
        getWalletClient: async () => walletClient as Client,
        switchChain: async () => walletClient as Client,
      });

      createConfig({
        integrator: 'eliza',
        chains: Object.values(this.walletClientService.chains).map(
          (config) => ({
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
          }),
        ) as ExtendedChain[],
        providers: [evmProvider],
      });

      const fromAmount = parseEther(SwapPayload.amount);
      const fromAmountString = fromAmount.toString();

      const routes = await getRoutes({
        fromChainId: this.walletClientService.chains[SwapPayload.chain].id,
        toChainId: this.walletClientService.chains[SwapPayload.chain].id,
        fromTokenAddress: inputTokenAddress,
        toTokenAddress: outputTokenAddress,
        fromAmount: fromAmountString as string,
        fromAddress: fromAddress,
        // options: {
        //   slippage: 0.5,
        //   order: 'FASTEST',
        //   fee: 0.02,
        //   integrator: 'elizaM0',
        // },
      });

      if (!routes.routes.length) throw new Error('No routes found');
      // console.log('routes:', routes);
      // console.log('routes.routes[0]:', routes.routes[0]);
      // console.log('steps: ', routes.routes[0].steps);
      // console.log('steps: ', routes.routes[0].steps[0].includedSteps);

      const executionOptions = {
        updateRouteHook: returnStepsExecution,
      };

      const route = routes.routes[0];
      // Simplified example function to execute each step of the route sequentially

      const chain = this.walletClientService.chains[SwapPayload.chain];

      // const publicClient = createPublicClient({
      //   chain: chain, // Use the chain you're working with, e.g., Sepolia
      //   transport: http(
      //     'https://polygon-mainnet.infura.io/v3/83d21f55255f46aba00654f32fc0a153',
      //   ),
      // });

      // const balance = await publicClient.getBalance({address: walletClient.account.address});
      // console.log("balance: ", formatUnits(balance, 18));
      try {
        for (const txStep of route.steps) {
          // Request transaction data for the current step
          console.log('txStep: ', txStep);

          const step = await getStepTransaction(txStep);

          console.log('step with transaction data: ', step);

          // Send the transaction (e.g. using Viem)
          const transactionRequestWithParams = {
            address: walletClient.account.address.toLowerCase(),
            chainType: 'ethereum',
            caip2: `eip155:${chainId}`,
            transaction: step.transactionRequest,
          };
          const transactionHash: EthereumSendTransactionResponseType =
            await this.privy.walletApi.ethereum.sendTransaction(
              transactionRequestWithParams,
            );

          console.log({ transactionHash });

          //@ts-ignore
          // console.log('transaction hash:', transactionHash.hash);

          // Monitor the status of the transaction
          let status;
          do {
            const result = await getStatus({
              //@ts-ignore
              txHash: transactionHash.hash,
              fromChain: step.action.fromChainId,
              toChain: step.action.toChainId,
              bridge: step.tool,
            });
            status = result.status;

            console.log(`Transaction status for ${transactionHash}:`, status);

            // Wait for a short period before checking the status again
            await new Promise((resolve) => setTimeout(resolve, 5000));
          } while (status !== 'DONE' && status !== 'FAILED');

          if (status === 'FAILED') {
            console.error(`Transaction ${transactionHash} failed`);
            return;
          }
        }

        console.log('All steps executed successfully');
      } catch (error) {
        throw new Error(`Error executing route: ${error.message}`);
      }

      // const execution = await executeRoute(routes.routes[0], executionOptions);
      // // const execution = await executeRoute(routes.routes[0], this.swapConfig);
      // const process = execution.steps[0]?.execution?.process[0];

      // if (!process?.status || process.status === 'FAILED') {
      //   throw new Error('Transaction failed');
      // }

      return {
        //@ts-ignore
        hash: process.txHash as `0x${string}`,
        from: fromAddress,
        to: routes.routes[0].steps[0].estimate.approvalAddress as `0x${string}`,
        value: BigInt(SwapPayload.amount),
        //@ts-ignore
        data: process.data as `0x${string}`,
        chainId: this.walletClientService.chains[SwapPayload.chain].id,
      };
    } catch (error) {
      console.error('Error during swap:', error);
      throw new Error(`Swap failed: ${error.message}`);
    }
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

    const chainId =
      await this.walletClientService.chains[BridgePayload.fromChain].id;

    const evmProvider = EVM({
      getWalletClient: async () => walletClient as Client,
    });

    createConfig({
      integrator: 'eliza',
      chains: Object.values(this.walletClientService.chains).map((config) => ({
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
      providers: [evmProvider],
    });

    console.log('Bridge amount:', BridgePayload.amount);

    // const fromAmount = parseUnits(BridgePayload.amount, 18);

    const fromAmount = parseEther(BridgePayload.amount);

    const fromAmountString = fromAmount.toString();
    console.log('to token address:', BridgePayload.toToken);

    const routes = await getRoutes({
      fromChainId: this.walletClientService.chains[BridgePayload.fromChain].id,
      toChainId: this.walletClientService.chains[BridgePayload.toChain].id,
      fromTokenAddress: BridgePayload.fromToken,
      toTokenAddress: BridgePayload.toToken,
      fromAmount: fromAmountString,
      fromAddress: fromAddress,
      toAddress: BridgePayload.toAddress || fromAddress,
      // options: {
      //   fee: 0.02,
      //   integrator: 'elizaM0',
      // },
    });

    if (!routes.routes.length) throw new Error('No routes found');

    const executionOptions = {
      updateRouteHook: returnStepsExecution,
    };
    let i = 1;
    for (const txStep of routes.routes[0].steps) {
      console.log(`step ${i}: `, txStep);
      i++;
    }

    try {
      for (const txStep of routes.routes[0].steps) {
        // Request transaction data for the current step

        const step = await getStepTransaction(txStep);
        console.log('step with transaction data: ', step);

        const chainId = step.transactionRequest.chainId;
        console.log('chainId: ', chainId);
        

        // Send the transaction (e.g. using Viem)
        const transactionRequestWithParams = {
          address: walletClient.account.address.toLowerCase(),
          chainType: 'ethereum',
          caip2: `eip155:${chainId}`,
          transaction: step.transactionRequest,
        };
        const transactionHash: EthereumSendTransactionResponseType =
          await this.privy.walletApi.ethereum.sendTransaction(
            transactionRequestWithParams,
          );

        console.log({ transactionHash });

        //@ts-ignore
        // console.log('transaction hash:', transactionHash.hash);

        // Monitor the status of the transaction
        const txHash = transactionHash.hash;
        const fromChainId = s
        const url = `https://li.quest/v1/status?txHash=${txHash}&fromChain=${}&toChain=${}&bridge=stargateV2Bus`;
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
      
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
      
          const data = await response.json();
          const status  = data.status;
          console.log("statusdata: ", status);
          

          if (status === 'FAILED') {
            console.error(`Transaction ${transactionHash} failed`);
            return;
          }
          return data;
        } catch (error) {
          console.error('Error fetching data:', error);
        }



      //   let status;
      //   const txClient = axios.create({
      //     baseURL: 'https://li.quest/v1',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //   });
      //   // @ts-ignore
        
    
      //  try {
      //   const response = await txClient.get(`/status?txHash${txHash}=&fromChain=137&toChain=56&bridge=stargateV2Bus`);

      //   console.log("response from status ",response.data);
      //   const status = response.status;
      //  } catch (error) {
      //   console.error("Error in status: ", error);
      //  }
      // let status;
      //   do {
      //     try {
      //       const result = await getStatus({
      //         //@ts-ignore
      //         txHash: transactionHash.hash,
      //         fromChain: step.action.fromChainId,
      //         toChain: step.action.toChainId,
      //         bridge: step.tool,
      //       });
      //       status = result.status;

      //       console.log(`Transaction status for ${transactionHash}:`, status);

      //       // Wait for a short period before checking the status again
      //       await new Promise((resolve) => setTimeout(resolve, 5000));
      //     } catch (error) {
      //       console.error('Error in status:', error);
      //     }
      //   } while (status !== 'DONE' && status !== 'FAILED');

        // if (status === 'FAILED') {
        //   console.error(`Transaction ${transactionHash} failed`);
        //   return;
        // }
      }

      console.log('All steps executed successfully');
    } catch (error) {
      throw new Error(`Error executing route: ${error.message}`);
    }

    // const execution = await executeRoute(routes.routes[0], executionOptions);
    // const process = execution.steps[0]?.execution?.process[0];

    // if (!process?.status || process.status === 'FAILED') {
    //   throw new Error('Transaction failed');
    // }

    return {
      //@ts-ignore
      hash: process.txHash as `0x${string}`,
      from: fromAddress,
      to: routes.routes[0].steps[0].estimate.approvalAddress as `0x${string}`,
      value: BigInt(BridgePayload.amount),
      chainId: this.walletClientService.chains[BridgePayload.fromChain].id,
    };
  }
}
