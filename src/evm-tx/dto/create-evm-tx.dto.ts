import { SupportedChain } from 'src/lib/wallet';
import { Address, Hash } from 'viem';

export class TransferDTO {
  fromChain: SupportedChain;
  toAddress: Address;
  amount: string;
  data?: `0x${string}`;
}

export class SwapDTO {
  fromChain: number;
  toChain: number;
  fromTokenAddress: Address;
  toTokenAddress: Address;
  amount: string;
  fromAddress: Address;
}

export interface Transaction {
  hash: Hash;
  from: Address;
  to: Address;
  value: bigint;
  data?: `0x${string}`;
  chainId?: number;
}
