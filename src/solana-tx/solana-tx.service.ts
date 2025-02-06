import { Injectable } from '@nestjs/common';
import { TransferDTO } from './dto/transfer.dto';
import WalletClientService from 'src/_common/service/walletClient.service';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';
import { Transaction , LAMPORTS_PER_SOL, SystemProgram, PublicKey } from "@solana/web3.js";
import { swapDTO } from './dto/swap.dto';


@Injectable()
export class SolanaTxService {

  private readonly privy: PrivyClient;

  constructor(
    private authTokenService: AuthTokenService,
    private walletClientService: WalletClientService,
    private configService: ConfigService,
  ){
    const appId = this.configService.getOrThrow<string>('PRIVY_APP_ID');
    const appSecret = this.configService.getOrThrow<string>('PRIVY_APP_SECRET');

    this.privy = new PrivyClient(appId, appSecret, {
      walletApi: {
        authorizationPrivateKey: this.configService.getOrThrow<string>('PRIVY_AUTHORIZATION_PRIVATE_KEY'),
      },
    });
  }

  async transfer(
    transferDTO: TransferDTO, 
    authToken: string
  ){
    const solanaAddress = await this.walletClientService.verifyAndGetSolAddress(authToken)

    
    const recipientPubKey = new PublicKey(transferDTO.toAddress);
    const senderPubKey = new PublicKey(solanaAddress);
    
    const amountToSend = parseFloat(transferDTO.amount)  * LAMPORTS_PER_SOL
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderPubKey,
        toPubkey: recipientPubKey,
        lamports: amountToSend,
      }),
    )

    const data = await this.privy.walletApi.solana.signAndSendTransaction({
      address: solanaAddress,
      caip2: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', //solana devnet - TODO: make it dynamic according to chain - mainnet/ devnet/ testnet
      chainType: 'solana',
      transaction: transaction

    })
    console.log({data}) 
  }

  async swap(swapDTO: swapDTO) {
    
  }

}
