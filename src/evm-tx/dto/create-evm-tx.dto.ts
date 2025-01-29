import { Address, Hash } from 'viem';
import { SupportedChain } from 'src/_common/utils/types';
import { IsEthereumAddress, IsOptional, IsString ,} from '@nestjs/class-validator';

export class TransferDTO {

  @IsString()
  fromChain: SupportedChain;

  @IsEthereumAddress()
  toAddress: Address;

  @IsString()
  amount: string;

  @IsString()
  token: string;
}

export class SwapPayload {

  @IsString()
  inputToken: string;

  @IsString()
  outputToken: string;

  @IsString()
  amount: string;

  @IsString()
  chain: SupportedChain;
}


export class BridgePayload {

  @IsString()
  fromChain: SupportedChain;

  @IsString()
  toChain: SupportedChain;

  @IsEthereumAddress()
  fromToken: Address;

  @IsEthereumAddress()
  toToken: Address;

  @IsString()
  amount: string;

  @IsOptional()
  @IsEthereumAddress()
  toAddress?: Address;
}
