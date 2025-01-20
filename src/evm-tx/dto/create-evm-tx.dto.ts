import { Address, Hash } from 'viem';
import * as viemChains from 'viem/chains';

const _SupportedChainList = Object.keys(viemChains) as Array<
  keyof typeof viemChains
>;
export type SupportedChain = (typeof _SupportedChainList)[number];

export class TransferDTO {
  fromChain: SupportedChain;
  toAddress: Address;
  amount: string;
  data?: `0x${string}`;
}

export class SwapPayload {
  chain: SupportedChain;
  fromToken: Address;
  toToken: Address;
  amount: string;
  slippage?: number;
}

export class BridgePayload {}

export interface Transaction {
  hash: Hash;
  from: Address;
  to: Address;
  value: bigint;
  data?: `0x${string}`;
  chainId?: number;
}
