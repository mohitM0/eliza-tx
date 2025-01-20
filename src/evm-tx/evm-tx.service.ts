import { Injectable } from '@nestjs/common';
import { SwapPayload, Transaction, TransferDTO } from './dto/create-evm-tx.dto';
import { initWalletProvider, TransferAction } from 'src/lib/wallet';
import { PrivyClient } from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';
import WalletClientService from 'src/_common/service/walletClient.service';
import {
  // createConfig,
  executeRoute,
  // ExtendedChain,
  getRoutes,
} from '@lifi/sdk';
import { ByteArray, Hex, parseEther } from 'viem';

@Injectable()
export class EvmTxService {
  private readonly privy: PrivyClient;
  // private swapConfig;
  // private bridgeConfig;

  constructor(private walletClientService: WalletClientService) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'Privy App ID and App Secret must be set in environment variables.',
      );
    }

    this.privy = new PrivyClient(appId, appSecret);
  }

  async transfer(
    TransferPayload: TransferDTO,
    authToken: string,
  ): Promise<Transaction> {

    const walletClient = await this.walletClientService.createWalletClient(
      authToken,
      TransferPayload.fromChain,
    );

    console.log(
      `Transferring: ${TransferPayload.amount} tokens to (${TransferPayload.toAddress} on ${TransferPayload.fromChain})`,
    );

    if (!TransferPayload.data) {
      TransferPayload.data = '0x';
    }
    await walletClient.switchChain(TransferPayload.fromChain);
    try {
      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: TransferPayload.toAddress,
        value: parseEther(TransferPayload.amount),
        data: TransferPayload.data as Hex,
        kzg: {
          blobToKzgCommitment: function (_: ByteArray): ByteArray {
            throw new Error('Function not implemented.');
          },
          computeBlobKzgProof: function (
            _blob: ByteArray,
            _commitment: ByteArray,
          ): ByteArray {
            throw new Error('Function not implemented.');
          },
        },
        chain: undefined,
      });

      return {
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
    const walletClient = await this.walletClientService.createWalletClient(
      authToken,
      SwapPayload.chain,
    );
    const [fromAddress] = await walletClient.getAddresses();

    const routes = await getRoutes({
      fromChainId: walletClient.getChainConfigs(SwapPayload.chain).id,
      toChainId: walletClient.getChainConfigs(SwapPayload.chain).id,
      fromTokenAddress: SwapPayload.fromToken,
      toTokenAddress: SwapPayload.toToken,
      fromAmount: SwapPayload.amount,
      fromAddress: fromAddress,
      options: {
        slippage: SwapPayload.slippage || 0.5,
        order: 'RECOMMENDED',
        fee: 0.02,
        integrator: 'elizaM0',
      },
    });

    if (!routes.routes.length) throw new Error('No routes found');

    const execution = await executeRoute(routes.routes[0], this.config);
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
      chainId: walletClient.getChainConfigs(SwapPayload.chain).id,
    };
  }

  // async bridge(BridgePayload:  ): Promise<Transaction>{

  // }
}
