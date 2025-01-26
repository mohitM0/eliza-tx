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
  token: string;
}

// export class SwapPayload {
//   chain: SupportedChain;
//   fromToken: Address;
//   toToken: Address;
//   amount: string;
//   slippage?: number;
// }

export class SwapPayload {
  inputToken: string;
  outputToken: string;
  amount: string;
  chain: SupportedChain;
}


export class BridgePayload {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  fromToken: Address;
  toToken: Address;
  amount: string;
  toAddress?: Address;
}

export interface Transaction {
  hash: Hash;
  from: Address;
  to: Address;
  value: bigint;
  data?: `0x${string}`;
  chainId?: number;
}

export interface walletClientInputType {
  authToken: string;
  chain?: SupportedChain;
  chainId?: number;
}