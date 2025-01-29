import { Injectable } from '@nestjs/common';
import {
  BridgePayloadDTO,
  SwapPayloadDTO,
  TransferDTO,
} from './dto/create-evm-tx.dto';
import {
  EthereumSendTransactionResponseType,
  PrivyClient,
} from '@privy-io/server-auth';
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
  isSwapStep,
  Step,
  isCrossStep,
  getTokenAllowance,
  getGasRecommendation
} from '@lifi/sdk';
import {
  Account,
  ByteArray,
  Chain,
  Client,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  Hash,
  Hex,
  http,
  LocalAccount,
  parseEther,
  PublicClient,
  TransactionReceipt,
  WalletClient,
  zeroAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import { returnStepsExecution } from 'src/_common/helper/returnStepsExecution';
import { approvalABI, transferABI } from 'src/_common/helper/abi';
import { Transaction } from 'src/_common/utils/interface';

dotenv.config();

@Injectable()
export class EvmTxService {
  private readonly privy: PrivyClient;

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
  
  private async waitForConfirmation(
    publicClient: PublicClient,
    hash: Hash,
    retries = 360,
    interval = 5000,
  ): Promise<TransactionReceipt> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Check transaction receipt to see if it's mined
        const receipt: TransactionReceipt =
          await publicClient.getTransactionReceipt({
            hash: hash,
          });
        if (receipt && receipt.status === 'success') {
          console.log(`Transaction ${hash} confirmed.`);
          return receipt; // Transaction is confirmed
        }
      } catch (error) {
        console.error(
          `Error fetching transaction receipt: ${error.message}`,
        );
      }

      console.log(
        `Waiting for transaction ${hash} to be confirmed... Attempt ${attempt}/${retries}`,
      );
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Transaction ${hash} was not confirmed after ${retries} retries.`,
    );
  }


  async transfer(
    TransferPayload: TransferDTO,
    authToken: string,
  ): Promise<Transaction> {
    let nativeTransfer: boolean = null;
    if (TransferPayload.token) {
      nativeTransfer = false;
    }
    const walletClient: WalletClient =
      await this.walletClientService.createWalletClient({
        authToken,
        chain: TransferPayload.fromChain,
      });
    const fromChain =
      this.walletClientService.chains[TransferPayload.fromChain];

    const publicClient = await this.walletClientService.createPublicClient(
      fromChain.id,
    );
    console.log('nativeTransfer: ', nativeTransfer);

    if (!nativeTransfer) {
      try {
        const erc20TokenAddress = await this.getTokenAddress(
          TransferPayload.token,
          fromChain.id,
        );
        const transferAmount = parseEther(TransferPayload.amount);
        const encodedData = encodeFunctionData({
          abi: transferABI,
          // functionName: 'transfer',
          args: [TransferPayload.toAddress.toLowerCase(), transferAmount],
        });

        const transaction = {
          to: erc20TokenAddress, // Set the token contract address
          data: encodedData, // Encoded transfer data
          value: '0x0', // No MATIC is sent
          chainId: fromChain.id,
        };

        // Send the transaction
        const data: any = await this.privy.walletApi.ethereum.sendTransaction({
          address: walletClient.account.address.toLowerCase(),
          chainType: 'ethereum',
          caip2: `eip155:${fromChain.id}`,
          transaction,
        });

        await this.waitForConfirmation(
          publicClient as PublicClient,
          data.hash as Hash,
        );
        console.log(data.hash);
      } catch (error) {}
    } else {
      try {
        console.log('above');

        const ethValue = parseEther(TransferPayload.amount);
        const value = parseInt(ethValue.toString());

        const data: any = await this.privy.walletApi.ethereum.sendTransaction({
          address: walletClient.account.address.toLowerCase(),
          chainType: 'ethereum',
          caip2: `eip155:${fromChain.id}`,

          transaction: {
            to: TransferPayload.toAddress.toLowerCase(),
            value,
            chainId: fromChain.id,
          },
        });

        await this.waitForConfirmation(
          publicClient as PublicClient,
          data.hash as Hash,
        )
        console.log('hash: ', data.hash);
      } catch (error) {
        console.error('Error signing transaction:', error);
      }
    }

    return {
      // @ts-ignore
      hash,
      from: walletClient.account.address,
      to: TransferPayload.toAddress,
      value: parseEther(TransferPayload.amount),
    };
  }
  catch(error) {
    throw new Error(`Transfer failed: ${error.message}`);
  }

  // async swap(
  //   SwapPayloadDTO: SwapPayloadDTO,
  //   authToken: string,
  // ): Promise<Transaction> {
  //   try {
  //     const walletClient: WalletClient =
  //       await this.walletClientService.createWalletClient({
  //         authToken,
  //         chain: SwapPayloadDTO.chain,
  //       });
  //     const [fromAddress] = await walletClient.getAddresses();

  //     const chainId =
  //       await this.walletClientService.chains[SwapPayloadDTO.chain].id;

  //     // await this.getTokenList(chainId);

  //     const inputTokenAddress = await this.getTokenAddress(
  //       SwapPayloadDTO.inputToken.toUpperCase(),
  //       chainId,
  //     );
  //     const outputTokenAddress = await this.getTokenAddress(
  //       SwapPayloadDTO.outputToken.toUpperCase(),
  //       chainId,
  //     );

  //     const evmProvider = EVM({
  //       getWalletClient: async () => walletClient as Client,
  //       switchChain: async () => walletClient as Client,
  //     });

  //     createConfig({
  //       integrator: 'eliza',
  //       chains: Object.values(this.walletClientService.chains).map(
  //         (config) => ({
  //           id: config.id,
  //           name: config.name,
  //           key: config.name.toLowerCase(),
  //           chainType: 'EVM' as const,
  //           nativeToken: {
  //             ...config.nativeCurrency,
  //             chainId: config.id,
  //             address: '0x0000000000000000000000000000000000000000',
  //             coinKey: config.nativeCurrency.symbol,
  //             priceUSD: '0',
  //             logoURI: '',
  //             symbol: config.nativeCurrency.symbol,
  //             decimals: config.nativeCurrency.decimals,
  //             name: config.nativeCurrency.name,
  //           },
  //           rpcUrls: {
  //             public: { http: [config.rpcUrls.default.http[0]] },
  //           },
  //           blockExplorerUrls: [config.blockExplorers.default.url],
  //           metamask: {
  //             chainId: `0x${config.id.toString(16)}`,
  //             chainName: config.name,
  //             nativeCurrency: config.nativeCurrency,
  //             rpcUrls: [config.rpcUrls.default.http[0]],
  //             blockExplorerUrls: [config.blockExplorers.default.url],
  //           },
  //           coin: config.nativeCurrency.symbol,
  //           mainnet: true,
  //           diamondAddress: '0x0000000000000000000000000000000000000000',
  //         }),
  //       ) as ExtendedChain[],
  //     });

  //     const fromAmount = parseEther(SwapPayloadDTO.amount);
  //     const fromAmountString = fromAmount.toString();

  //     const routes = await getRoutes({
  //       fromChainId: this.walletClientService.chains[SwapPayloadDTO.chain].id,
  //       toChainId: this.walletClientService.chains[SwapPayloadDTO.chain].id,
  //       fromTokenAddress: inputTokenAddress,
  //       toTokenAddress: outputTokenAddress,
  //       fromAmount: fromAmountString as string,
  //       fromAddress: fromAddress,
  //     });

  //     if (!routes.routes.length) throw new Error('No routes found');
  //     const executionOptions = {
  //       updateRouteHook: returnStepsExecution,
  //     };

  //     const route = routes.routes[0];

  //     const approvalABI = [
  //       {
  //         type: 'function',
  //         name: 'approve',
  //         inputs: [
  //           { name: 'spender', type: 'address' },
  //           { name: 'amount', type: 'uint256' },
  //         ],
  //         outputs: [{ name: '', type: 'bool' }],
  //         stateMutability: 'nonpayable',
  //       },
  //     ];

  //     try {
  //       for (const txStep of route.steps) {
  //         // Request transaction data for the current step
  //         console.log('txStep: ', txStep);

  //         const step = await getStepTransaction(txStep);

  //         console.log('step with transaction data: ', step);

  //         const chainId = step.transactionRequest.chainId;
  //         const walletClient =
  //           await this.walletClientService.createWalletClient({
  //             authToken: authToken,
  //             chainId: chainId,
  //           });
  //           const tokenAddress = await this.getTokenAddress(
  //             SwapPayloadDTO.inputToken,
  //             chainId,
  //           );
  //           const token = {
  //             address: tokenAddress,
  //             chainId: chainId,
  //           };

            

  //         const approvalAmount = step.estimate.fromAmount;
  //         const approvalAddress = step.estimate.approvalAddress;

  //         const data = encodeFunctionData({
  //           abi: approvalABI,
  //           // functionName: 'approve',
  //           args: [approvalAddress, approvalAmount],
  //         });

          

  //         const publicClient =
  //           await this.walletClientService.createPublicClient(chainId);

  //         const transactionParam = {
  //           to: tokenAddress,
  //           chainId: chainId,
  //           data: data,
  //         };

  //         const approved: any =
  //           await this.privy.walletApi.ethereum.sendTransaction({
  //             address: walletClient.account.address.toLowerCase(),
  //             chainType: 'ethereum',
  //             caip2: `eip155:${chainId}`,
  //             transaction: transactionParam,
  //           });

  //         console.log('approval hash:', approved.hash);

  //         // Function to wait for transaction confirmation
  //         const waitForConfirmation = async (
  //           hash: Hash,
  //           retries = 360,
  //           interval = 5000,
  //         ) => {
  //           for (let attempt = 1; attempt <= retries; attempt++) {
  //             try {
  //               // Check transaction receipt to see if it's mined
  //               const receipt: TransactionReceipt =
  //                 await publicClient.getTransactionReceipt({
  //                   hash: hash,
  //                 });
  //               if (receipt && receipt.status === 'success') {
  //                 console.log(`Transaction ${hash} confirmed.`);
  //                 return receipt; // Transaction is confirmed
  //               }
  //             } catch (error) {
  //               console.error(
  //                 `Error fetching transaction receipt: ${error.message}`,
  //               );
  //             }

  //             console.log(
  //               `Waiting for transaction ${hash} to be confirmed... Attempt ${attempt}/${retries}`,
  //             );
  //             await new Promise((resolve) => setTimeout(resolve, interval));
  //           }

  //           throw new Error(
  //             `Transaction ${hash} was not confirmed after ${retries} retries.`,
  //           );
  //         };

  //         // Wait for approval transaction to be confirmed
  //         await waitForConfirmation(approved.hash as Hash);
  //         console.log('here1');

          
  //         console.log('here 2');

  //         console.log('token: ', token);
  //         console.log('address: ', walletClient.account.address);
  //         console.log('ap address: ', step.estimate.approvalAddress);

  //         const allowance = await getTokenAllowance(
  //           token,
  //           walletClient.account.address,
  //           step.estimate.approvalAddress,
  //         );
  //         console.log('Allowance:', formatEther(allowance));

  //         // Send the transaction (e.g. using Viem)
  //         const transactionRequestWithParams = {
  //           address: walletClient.account.address.toLowerCase(),
  //           chainType: 'ethereum',
  //           caip2: `eip155:${chainId}`,
  //           transaction: step.transactionRequest,
  //         };
  //         const transactionHash: any =
  //           await this.privy.walletApi.ethereum.sendTransaction(
  //             transactionRequestWithParams,
  //           );

  //         console.log('Transaction hash', transactionHash.hash);
  //         // const transactionHash = {
  //         //   hash: '0x8fbf931596984d1ddb4e5f580d4270f6d9307d1f7d347eab792a3dd7d2316059'
  //         // }

  //         await waitForConfirmation(transactionHash.hash as Hash);

  //         let status;
  //         do {
  //           console.log('above status');

  //           const result = await getStatus({
  //             txHash: transactionHash.hash,
  //             // fromChain: step.action.fromChainId,
  //             // toChain: step.action.toChainId,
  //             // bridge: step.tool,
  //           });
  //           console.log('below status');

  //           status = result.status;
  //           console.log(
  //             `Transaction status for ${transactionHash.hash}:`,
  //             status,
  //           );

  //           // Wait for a short period before checking the status again
  //           await new Promise((resolve) => setTimeout(resolve, 30000));
  //         } while (status !== 'DONE' && status !== 'FAILED');

  //         if (status === 'FAILED') {
  //           console.error(`Transaction ${transactionHash.hash} failed`);
  //           return;
  //         }
  //       }

  //       console.log('All steps executed successfully');
  //     } catch (error) {
  //       throw new Error(`Error executing route: ${error.message}`);
  //     }

  //     return {
  //       //@ts-ignore
  //       hash: process.txHash as `0x${string}`,
  //       from: fromAddress,
  //       to: routes.routes[0].steps[0].estimate.approvalAddress as `0x${string}`,
  //       value: BigInt(SwapPayloadDTO.amount),
  //       //@ts-ignore
  //       data: process.data as `0x${string}`,
  //       chainId: this.walletClientService.chains[SwapPayloadDTO.chain].id,
  //     };
  //   } catch (error) {
  //     console.error('Error during swap:', error);
  //     throw new Error(`Swap failed: ${error.message}`);
  //   }
  // }

  async swap(
    SwapPayloadDTO: SwapPayloadDTO,
    authToken: string,
  ): Promise<Transaction> {
    try {
      const walletClient: WalletClient =
        await this.walletClientService.createWalletClient({
          authToken,
          chain: SwapPayloadDTO.chain,
        });
      const [fromAddress] = await walletClient.getAddresses();
  
      const chainId =
        await this.walletClientService.chains[SwapPayloadDTO.chain].id;
  
      const inputTokenAddress = await this.getTokenAddress(
        SwapPayloadDTO.inputToken.toUpperCase(),
        chainId,
      );
      const outputTokenAddress = await this.getTokenAddress(
        SwapPayloadDTO.outputToken.toUpperCase(),
        chainId,
      );
  
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
      });
  
      const fromAmount = parseEther(SwapPayloadDTO.amount);
      const fromAmountString = fromAmount.toString();

      const publicClient = await this.walletClientService.createPublicClient(chainId);
  
      const routes = await getRoutes({
        fromChainId: this.walletClientService.chains[SwapPayloadDTO.chain].id,
        toChainId: this.walletClientService.chains[SwapPayloadDTO.chain].id,
        fromTokenAddress: inputTokenAddress,
        toTokenAddress: outputTokenAddress,
        fromAmount: fromAmountString as string,
        fromAddress: fromAddress,
      });
  
      if (!routes.routes.length) throw new Error('No routes found');

      const route = routes.routes[0];
  
      try {
        for (const txStep of route.steps) {
          // Request transaction data for the current step
          console.log('txStep: ', txStep);
  
          const step = await getStepTransaction(txStep);
  
          console.log('step with transaction data: ', step);
  
          const chainId = step.transactionRequest.chainId;
          const walletClient =
            await this.walletClientService.createWalletClient({
              authToken: authToken,
              chainId: chainId,
            });
          const tokenAddress = await this.getTokenAddress(
            SwapPayloadDTO.inputToken,
            chainId,
          );
          const token = {
            address: tokenAddress,
            chainId: chainId,
          };
  
          // Check if fromAddress is not the zero address
          if (inputTokenAddress !== zeroAddress) {
            const approvalAmount = step.estimate.fromAmount;
            const approvalAddress = step.estimate.approvalAddress;
  
            const data = encodeFunctionData({
              abi: approvalABI,
              functionName: 'approve',
              args: [approvalAddress, approvalAmount],
            });

            const nativeBalance = await publicClient.getBalance({
              address: walletClient.account.address,
            });
    
            const gas = await publicClient.estimateGas({
              data,
              account: walletClient.account.address,
              to: step.action.fromToken.address,
            })
    
            console.log('Native balance:', nativeBalance);
            console.log('Estimated gas:', gas);
    
            // Check if native balance is less than estimated gas
            if (nativeBalance < gas) {
              console.error('Native balance is less than estimated gas. Transaction cannot proceed.');
              return; // Change when response type is defined
            }    
    
            const transactionParam = {
              to: tokenAddress,
              chainId: chainId,
              data: data,
            };
  
            const approved: any =
              await this.privy.walletApi.ethereum.sendTransaction({
                address: walletClient.account.address.toLowerCase(),
                chainType: 'ethereum',
                caip2: `eip155:${chainId}`,
                transaction: transactionParam,
              });
  
            console.log('approval hash:', approved.hash);
  
            // Wait for approval transaction to be confirmed
            await this.waitForConfirmation(publicClient as PublicClient, approved.hash as Hash);
  
            const allowance = await getTokenAllowance(
              token,
              walletClient.account.address,
              step.estimate.approvalAddress,
            );
            console.log('Allowance:', formatEther(allowance));
          }
  
          // Send the transaction (e.g. using Viem)
          const transactionRequestWithParams = {
            address: walletClient.account.address.toLowerCase(),
            chainType: 'ethereum',
            caip2: `eip155:${chainId}`,
            transaction: step.transactionRequest,
          };
          const transactionHash: any =
            await this.privy.walletApi.ethereum.sendTransaction(
              transactionRequestWithParams,
            );
  
          console.log('Transaction hash', transactionHash.hash);
  
          await this.waitForConfirmation(publicClient as PublicClient, transactionHash.hash as Hash);
  
          let status;
          do {
            console.log('above status');
  
            const result = await getStatus({
              txHash: transactionHash.hash,
            });
            console.log('below status');
  
            status = result.status;
            console.log(
              `Transaction status for ${transactionHash.hash}:`,
              status,
            );
  
            // Wait for a short period before checking the status again
            await new Promise((resolve) => setTimeout(resolve, 30000));
          } while (status !== 'DONE' && status !== 'FAILED');
  
          if (status === 'FAILED') {
            console.error(`Transaction ${transactionHash.hash} failed`);
            return;
          }
        }
  
        console.log('All steps executed successfully');
      } catch (error) {
        throw new Error(`Error executing route: ${error.message}`);
      }
  
      return {
        //@ts-ignore
        hash: process.txHash as `0x${string}`,
        from: fromAddress,
        to: routes.routes[0].steps[0].estimate.approvalAddress as `0x${string}`,
        value: BigInt(SwapPayloadDTO.amount),
        //@ts-ignore
        data: process.data as `0x${string}`,
        chainId: this.walletClientService.chains[SwapPayloadDTO.chain].id,
      };
    } catch (error) {
      console.error('Error during swap:', error);
      throw new Error(`Swap failed: ${error.message}`);
    }
  }

  //TODO: add solana support for bridge later.
  async bridge(
    BridgePayloadDTO: BridgePayloadDTO,
    authToken: string,
  ): Promise<Transaction> {
    const walletClient = await this.walletClientService.createWalletClient({
      authToken: authToken,
      chain: BridgePayloadDTO.fromChain,
    });
    const [fromAddress] = await walletClient.getAddresses();

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
      // providers: [evmProvider],
    });
    console.log('below create config');

    const fromAmount = parseEther(BridgePayloadDTO.amount);
    const fromAmountString = fromAmount.toString();
    const toChainId = this.walletClientService.chains[BridgePayloadDTO.toChain].id;
    const fromChainId = this.walletClientService.chains[BridgePayloadDTO.fromChain].id;
    let routes;

    const gasSuggestion = await this.getGasSuggestion(toChainId, BridgePayloadDTO.fromToken, fromChainId)
    // const fromAmountForGas = gasSuggestion?.available ? gasSuggestion?.recommended.amount : undefined
    const fromAmountForGas = gasSuggestion?.available ? gasSuggestion?.fromAmount : undefined
    console.log('fromAmountForGas:', fromAmountForGas);

    // Fetch the native balance of the wallet address on the toChainId
    const toChainPublicClient = await this.walletClientService.createPublicClient(toChainId);
    const nativeBalance = await toChainPublicClient.getBalance({
      address: fromAddress,
    });
    console.log('Native balance on toChainId:', nativeBalance);

    // Compare the balance with the fromAmountForGas
    const fromAmountForGasBigInt = gasSuggestion?.available ? BigInt(gasSuggestion.recommended.amount) : BigInt(0);
    if (nativeBalance < fromAmountForGasBigInt) {
      console.log('Native balance is less than fromAmountForGas, setting fromAmountForGas in routes.');
      routes = await getRoutes({
        fromTokenAddress: BridgePayloadDTO.fromToken,
        toTokenAddress: BridgePayloadDTO.toToken,
        fromChainId: fromChainId,
        toChainId: toChainId,
        fromAmount: fromAmountString,
        fromAddress: fromAddress,
        toAddress: BridgePayloadDTO.toAddress || fromAddress,
        fromAmountForGas: fromAmountForGas,
        // options: {
        //   fee: 0.02,
        //   integrator: 'elizaM0',
        // },
      });
    } else {
      console.log('Native balance is sufficient, not setting fromAmountForGas in routes.');
      routes = await getRoutes({
        fromTokenAddress: BridgePayloadDTO.fromToken,
        toTokenAddress: BridgePayloadDTO.toToken,
        fromChainId: fromChainId,
        toChainId: toChainId,
        fromAmount: fromAmountString,
        fromAddress: fromAddress,
        toAddress: BridgePayloadDTO.toAddress || fromAddress,
        // options: {
        //   fee: 0.02,
        //   integrator: 'elizaM0',
        // },
      });
    }

    // if([137, 1, 100].includes(toChainId)){
    //   const gasSuggestion = await this.getGasSuggestion(toChainId, BridgePayloadDTO.fromToken, fromChainId)
    //   const fromAmountForGas = gasSuggestion?.available ? gasSuggestion?.recommended.amount : undefined
    //   routes = await getRoutes({
    //     fromTokenAddress: BridgePayloadDTO.fromToken,
    //     toTokenAddress: BridgePayloadDTO.toToken,
    //     fromChainId: this.walletClientService.chains[BridgePayloadDTO.fromChain].id,
    //     toChainId: toChainId,
    //     fromAmount: fromAmountString,
    //     fromAddress: fromAddress,
    //     toAddress: BridgePayloadDTO.toAddress || fromAddress,
    //     fromAmountForGas: fromAmountForGas,
    //     // options: {
    //     //   fee: 0.02,
    //     //   integrator: 'elizaM0',
    //     // },
    //   });
    // } else{
    //   routes = await getRoutes({
    //     fromTokenAddress: BridgePayloadDTO.fromToken,
    //     toTokenAddress: BridgePayloadDTO.toToken,
    //     fromChainId: this.walletClientService.chains[BridgePayloadDTO.fromChain].id,
    //     toChainId: toChainId,
    //     fromAmount: fromAmountString,
    //     fromAddress: fromAddress,
    //     toAddress: BridgePayloadDTO.toAddress || fromAddress,
    //     // options: {
    //     //   fee: 0.02,
    //     //   integrator: 'elizaM0',
    //     // },
    //   });
    // }

    console.log('routes:', routes);

    if (!routes.routes.length) throw new Error('No routes found');

    // const executionOptions = {
    //   updateRouteHook: returnStepsExecution,
    // };


    let i = 1;
    try {
      for (const txStep of routes.routes[0].steps) {
        const step = await getStepTransaction(txStep);
        console.log(`step with transaction data - step ${i}:`, step);
        i++;

        const chainId = step.transactionRequest.chainId;
        const walletClient = await this.walletClientService.createWalletClient({
          authToken: authToken,
          chainId: chainId,
        });

        const approvalAmount = step.estimate.fromAmount;
        const approvalAddress = step.estimate.approvalAddress;

        const data = encodeFunctionData({
          abi: approvalABI,
          functionName: 'approve',
          args: [approvalAddress, approvalAmount],
        });

        

        const publicClient =
          await this.walletClientService.createPublicClient(chainId);

        const nativeBalance = await publicClient.getBalance({
          address: walletClient.account.address,
        });

        const gas = await publicClient.estimateGas({
          data,
          account: walletClient.account.address,
          to: step.action.fromToken.address,
        })

        console.log('Native balance:', nativeBalance);
        console.log('Estimated gas:', gas);

        // Check if native balance is less than estimated gas
        if (nativeBalance < gas) {
          console.error('Native balance is less than estimated gas. Transaction cannot proceed.');
          return; // Chnage when response type is defined
        }

        const nonce = await publicClient.getTransactionCount({
          address: walletClient.account.address,
        });

        const transactionParam = {
          to: step.action.fromToken.address,
          chainId: chainId,
          data: data,
          // gasLimit: parseInt(BigInt(21700).toString()),
          // nonce: Number(nonce),
          // maxFeePerGas: parseInt(BigInt(50000000000).toString()),
          // maxPriorityFeePerGas: parseInt(BigInt(2000000000).toString()),
        };
        let approved: any
        console.log({
          address: walletClient.account.address.toLowerCase(),
          chainType: 'ethereum',
          caip2: `eip155:${chainId}`,
          transaction: transactionParam,
        })
        try {
          approved =
            await this.privy.walletApi.ethereum.sendTransaction({
              address: walletClient.account.address.toLowerCase(),
              chainType: 'ethereum',
              caip2: `eip155:${chainId}`,
              transaction: transactionParam,
            });
            console.log('approval hash:', approved.hash);
        } catch (error) {
          console.error('Error sending transaction:', error);
        }

        // Wait for approval transaction to be confirmed
        await this.waitForConfirmation(
          publicClient as PublicClient,
          approved.hash as Hash,
        );

        const token = {
          address: step.action.fromToken.address,
          chainId: step.action.fromChainId,
        };

        const allowance = await getTokenAllowance(
          token,
          walletClient.account.address,
          step.estimate.approvalAddress,
        );
        console.log('Allowance:', formatEther(allowance));

        // add a check here to see if allowance is given or not. In current implementation,
        //  the allowance shown below in console is the previous transaction allowance.

        const transactionRequestWithParams = {
          address: walletClient.account.address.toLowerCase(),
          chainType: 'ethereum',
          caip2: `eip155:${chainId}`,
          transaction: step.transactionRequest,
        };
        const transactionHash: any =
          await this.privy.walletApi.ethereum.sendTransaction(
            transactionRequestWithParams,
          );

        console.log('Transaction hash', transactionHash.hash);
        // const transactionHash = {
        //   hash: '0x8fbf931596984d1ddb4e5f580d4270f6d9307d1f7d347eab792a3dd7d2316059'
        // }

        await this.waitForConfirmation(
          publicClient as PublicClient,
          transactionHash.hash as Hash,
        )

        const additionalWaitTime = 60000; // 1 minute in milliseconds
        console.log(`Waiting for an additional ${additionalWaitTime / 1000} seconds after confirmation...`);
        await new Promise((resolve) => setTimeout(resolve, additionalWaitTime));


        let status;
        do {
          console.log('above status');

          const result = await getStatus({
            txHash: transactionHash.hash,
            // fromChain: step.action.fromChainId,
            // toChain: step.action.toChainId,
            // bridge: step.tool,
          });
          console.log('below status');

          status = result.status;
          console.log(
            `Transaction status for ${transactionHash.hash}:`,
            status,
          );

          // Wait for a short period before checking the status again
          await new Promise((resolve) => setTimeout(resolve, 30000));
        } while (status !== 'DONE' && status !== 'FAILED');

        if (status === 'FAILED') {
          console.error(`Transaction ${transactionHash.hash} failed`);
          return;
        }
      }

      console.log('All steps executed successfully');
    } catch (error) {
      throw new Error(`Error executing route: ${error.message}`);
    }

    console.log('Below for loop');

    return {
      //@ts-ignore
      hash: process.txHash as `0x${string}`,
      from: fromAddress,
      to: routes.routes[0].steps[0].estimate.approvalAddress as `0x${string}`,
      value: BigInt(BridgePayloadDTO.amount),
      chainId: this.walletClientService.chains[BridgePayloadDTO.fromChain].id,
    };
  }

  async getGasSuggestion(toChainId: number, fromToken: string, fromChainId: number) {
    try {
      const gasSuggestion = await getGasRecommendation({
        chainId: toChainId,
        fromToken: fromToken,
        fromChain: fromChainId,
      });
      console.log('gasSuggestion:', gasSuggestion);
      return gasSuggestion;
    } catch (error) {
      console.error(error);
    }
  }
  
}

// 1) check why 0.3 polygon is deducting from the account
// 2) add the ERC20 token transfer functionality in the transfer function.
// 3) add the allownace and ERC20 token transfer functionality in swap function.
