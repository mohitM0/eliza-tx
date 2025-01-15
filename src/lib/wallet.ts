import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  Address,
  WalletClient,
  PublicClient,
  Chain,
  HttpTransport,
  Account,
  PrivateKeyAccount,
  Hex,
  ByteArray,
} from 'viem';
import * as viemChains from 'viem/chains';
import { Transaction, TransferDTO } from 'src/evm-tx/dto/create-evm-tx.dto';

const _SupportedChainList = Object.keys(viemChains) as Array<
  keyof typeof viemChains
>;
export type SupportedChain = (typeof _SupportedChainList)[number];

export class WalletProvider {
  private currentChain: SupportedChain = 'mainnet';
  chains: Record<string, Chain> = {
    mainnet: viemChains.mainnet,
    sepolia: viemChains.sepolia,
    bsc: viemChains.bsc,
    bscTestnet: viemChains.bscTestnet,
    base: viemChains.base,
    baseSepolia: viemChains.baseSepolia,
    polygon: viemChains.polygon,
  };
  account: PrivateKeyAccount;

  constructor(privateKey: `0x${string}`, chains?: Record<string, Chain>) {
    this.setAccount(privateKey);
    this.setChains(chains);

    if (chains && Object.keys(chains).length > 0) {
      this.setCurrentChain(Object.keys(chains)[0] as SupportedChain);
    }
  }

  getAddress(): Address {
    return this.account.address;
  }

  getCurrentChain(): Chain {
    return this.chains[this.currentChain];
  }

  getPublicClient(
    chainName: SupportedChain,
  ): PublicClient<HttpTransport, Chain, Account | undefined> {
    const transport = this.createHttpTransport(chainName);

    const publicClient = createPublicClient({
      chain: this.chains[chainName],
      transport,
    });
    return publicClient;
  }

  getWalletClient(chainName: SupportedChain): WalletClient {
    const transport = this.createHttpTransport(chainName);

    const walletClient = createWalletClient({
      chain: this.chains[chainName],
      transport,
      account: this.account,
    });

    return walletClient;
  }

  getChainConfigs(chainName: SupportedChain): Chain {
    const chain = viemChains[chainName];

    if (!chain?.id) {
      throw new Error('Invalid chain name');
    }

    return chain;
  }

  async getWalletBalance(): Promise<string | null> {
    try {
      const client = this.getPublicClient(this.currentChain);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return null;
    }
  }

  async getWalletBalanceForChain(
    chainName: SupportedChain,
  ): Promise<string | null> {
    try {
      const client = this.getPublicClient(chainName);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return null;
    }
  }

  addChain(chain: Record<string, Chain>) {
    this.setChains(chain);
  }

  switchChain(chainName: SupportedChain, customRpcUrl?: string) {
    if (!this.chains[chainName]) {
      const chain = WalletProvider.genChainFromName(chainName, customRpcUrl);
      this.addChain({ [chainName]: chain });
    }
    this.setCurrentChain(chainName);
  }

  private setAccount = (pk: `0x${string}`) => {
    this.account = privateKeyToAccount(pk);
  };

  private setChains = (chains?: Record<string, Chain>) => {
    if (!chains) {
      return;
    }
    Object.keys(chains).forEach((chain: string) => {
      this.chains[chain] = chains[chain];
    });
  };

  private setCurrentChain = (chain: SupportedChain) => {
    this.currentChain = chain;
  };

  private createHttpTransport = (chainName: SupportedChain) => {
    const chain = this.chains[chainName];

    if (chain.rpcUrls.custom) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };

  static genChainFromName(
    chainName: string,
    customRpcUrl?: string | null,
  ): Chain {
    const baseChain = viemChains[chainName];

    if (!baseChain?.id) {
      throw new Error('Invalid chain name');
    }

    const viemChain: Chain = customRpcUrl
      ? {
          ...baseChain,
          rpcUrls: {
            ...baseChain.rpcUrls,
            custom: {
              http: [customRpcUrl],
            },
          },
        }
      : baseChain;

    return viemChain;
  }
}

const genChainsFromRuntime = (
): Record<string, Chain> => {
  const chainNames: SupportedChain[] = ['sepolia', 'mainnet','bscTestnet'];
  const chains = {};

  chainNames.forEach((chainName) => {
    const rpcUrl = 
      process.env['ETHEREUM_PROVIDER' + chainName.toUpperCase()];
    const chain = WalletProvider.genChainFromName(chainName, rpcUrl);
    chains[chainName] = chain;
  });

  const mainnet_rpcurl = process.env.EVM_PROVIDER_URL;
  if (mainnet_rpcurl) {
    const chain = WalletProvider.genChainFromName('mainnet', mainnet_rpcurl);
    chains['mainnet'] = chain;
  }

  return chains;
};

export const initWalletProvider = async () => {
  const privateKey =
    '0x1523ae53ba92b720fcebe94671d7d3572bd380e0732226bf6e44efa3bb01cfa6';
  if (!privateKey) {
    throw new Error('EVM_PRIVATE_KEY is missing');
  }

  const chains = genChainsFromRuntime();
  return new WalletProvider(privateKey as `0x${string}`, chains);
};

export class TransferAction {
    constructor(private walletProvider: WalletProvider) {}

    async transfer(params: TransferDTO): Promise<Transaction> {
        console.log(
            `Transferring: ${params.amount} tokens to (${params.toAddress} on ${params.fromChain})`
        );

        if (!params.data) {
            params.data = "0x";
        }

        this.walletProvider.switchChain(params.fromChain);

        const walletClient = this.walletProvider.getWalletClient(
            params.fromChain
        );

        try {
            const hash = await walletClient.sendTransaction({
                account: walletClient.account,
                to: params.toAddress,
                value: parseEther(params.amount),
                data: params.data as Hex,
                kzg: {
                    blobToKzgCommitment: function (_: ByteArray): ByteArray {
                        throw new Error("Function not implemented.");
                    },
                    computeBlobKzgProof: function (
                        _blob: ByteArray,
                        _commitment: ByteArray
                    ): ByteArray {
                        throw new Error("Function not implemented.");
                    },
                },
                chain: undefined,
            });

            return {
                hash,
                from: walletClient.account.address,
                to: params.toAddress,
                value: parseEther(params.amount),
                data: params.data as Hex,
            };
        } catch (error) {
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }
}