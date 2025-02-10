import { Injectable } from '@nestjs/common';
import { TransferDTO } from './dto/transfer.dto';
import WalletClientService from 'src/_common/service/walletClient.service';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/server-auth';
import AuthTokenService from 'src/_common/service/authToken.service';
import { Transaction , LAMPORTS_PER_SOL, SystemProgram, PublicKey, Connection, ParsedAccountData, Keypair, TransactionMessage, VersionedTransaction, BlockheightBasedTransactionConfirmationStrategy } from "@solana/web3.js";
// import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { SwapDTO } from './dto/swap.dto';
import { getQuote, getRoutes, getStepTransaction } from '@lifi/sdk';


@Injectable()
export class SolanaTxService {

  private readonly privy: PrivyClient;
  private readonly connection: Connection;

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

    this.connection = new Connection(this.configService.getOrThrow<string>('SOLANA_RPC_URL'));
  }

  async getNumberDecimals(mintAddress: string):Promise<number> {
    const info = await this.connection.getParsedAccountInfo(new PublicKey(mintAddress));
    const result = (info.value?.data as ParsedAccountData).parsed.info.decimals as number;
    return result;
  }

  async transfer(
    transferDTO: TransferDTO, 
    authToken: string
  ){
    const solanaAddress = await this.walletClientService.verifyAndGetSolAddress(authToken)
    
    const recipientPubKey = new PublicKey(transferDTO.recipient);
    const senderPubKey = new PublicKey(solanaAddress);    
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();


    if(transferDTO.tokenAddress){
      const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } = await import('@solana/spl-token');
      const tokenPubKey = new PublicKey(transferDTO.tokenAddress)
      const senderATAdata = await getAssociatedTokenAddress(tokenPubKey,senderPubKey );
      const recieverATAdata = await getAssociatedTokenAddress(tokenPubKey , recipientPubKey );

      const accountInfo = await this.connection.getAccountInfo(recieverATAdata); 
      let instruction = [];
      if(!accountInfo) {
        console.log(`2 - Creating ATA for Recipient since there accountInfo is not present`);
        const a = await createAssociatedTokenAccountInstruction(
          senderPubKey,
          recieverATAdata,
          recipientPubKey,
          tokenPubKey,
        )
        instruction.push(a);  
      }

      const decimals: number = await this.getNumberDecimals(transferDTO.tokenAddress);

      instruction.push(createTransferInstruction(
        senderATAdata,
        recieverATAdata,
        senderPubKey,
        parseInt(transferDTO.amount) * Math.pow(10, decimals) 
      ));

      const messageV0 = new TransactionMessage({
        payerKey: senderPubKey,
        recentBlockhash: blockhash,
        instructions: instruction,
      }).compileToV0Message();

      const versionedTransaction = new VersionedTransaction(messageV0);

      const data = await this.privy.walletApi.solana.signAndSendTransaction({
        address: solanaAddress,
        caip2: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', //solana devnet - TODO: make it dynamic according to chain - mainnet/ devnet/ testnet
        chainType: 'solana',
        transaction: versionedTransaction
      })

      console.log({data})
      await this.connection.confirmTransaction(data.hash) // TODO: Check later

      console.log(`3 - Transfering ${transferDTO.amount} ${transferDTO.tokenAddress} from ${solanaAddress} to ${recipientPubKey.toString()}: DONE`);

      return `ATA for ${transferDTO.tokenAddress} created for ${recipientPubKey.toString()}`;
      
    }

    const amountToSend = parseFloat(transferDTO.amount)  * LAMPORTS_PER_SOL;
    
    const transaction = new Transaction({
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
      feePayer: senderPubKey,// Set the fee payer
    }).add(
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

    return `Transfering ${transferDTO.amount} SOL from ${solanaAddress} to ${recipientPubKey.toString()}: DONE`;
  }

    async swap1(
    swapDTO: SwapDTO,
    authToken: string
  ) {
    const solanaAddress = await this.walletClientService.verifyAndGetSolAddress(authToken);

    const amountToSend = parseFloat(swapDTO.amount)  * LAMPORTS_PER_SOL;

    const routes = await getQuote({
      fromChain: "SOL",
      fromAmount: amountToSend.toString(),
      fromToken: "11111111111111111111111111111111 ", // NATIVE SOL,
      toChain: "SOL",
      toToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on SOL,
      fromAddress: solanaAddress,
      toAddress: solanaAddress,
    })


    console.log(routes);
  }

  async swap(
    swapDTO: SwapDTO, 
    authToken: string
  ) {

    const solanaAddress = await this.walletClientService.verifyAndGetSolAddress(authToken);

    let amountToSend;

    if(swapDTO.tokenAddress === '11111111111111111111111111111111'){
      amountToSend = parseFloat(swapDTO.amount)  * LAMPORTS_PER_SOL;
    } else {
      const decimals: number = await this.getNumberDecimals('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')
      amountToSend = parseFloat(swapDTO.amount)  * Math.pow(10, decimals);  
    }

    const routes = await getRoutes({
      fromChainId: 1151111081099710,
      fromAmount: amountToSend.toString(),
      toChainId: 1151111081099710,
      fromTokenAddress: "11111111111111111111111111111111",
      toTokenAddress:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      fromAddress: solanaAddress,
      toAddress: solanaAddress
    })

    console.log(routes);
    const stepTX = await getStepTransaction(routes.routes[0].steps[0])

    console.log({stepTX});
    console.log('steps',routes.routes[0].steps[0].includedSteps);

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

    const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
    const recieverTokenPubKey = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    const senderPubKey = new PublicKey(solanaAddress);
    const recievedTokenATAdata = await getAssociatedTokenAddress(recieverTokenPubKey , senderPubKey );

    const accountInfo = await this.connection.getAccountInfo(recievedTokenATAdata);
    console.log({accountInfo})

    if(!accountInfo) {
      console.log(`2 - Creating ATA for Recipient since there accountInfo is not present`);
      const transferInstruction = await createAssociatedTokenAccountInstruction(
        senderPubKey,
        recievedTokenATAdata,
        senderPubKey,
        recieverTokenPubKey,
      )

      const transaction = new Transaction({
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        feePayer: senderPubKey,// Set the fee payer
      }).add(transferInstruction);

      const data = await this.privy.walletApi.solana.signAndSendTransaction({
        address: solanaAddress,
        caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', //solana mainnet - TODO: make it dynamic according to chain - mainnet/ devnet/ testnet
        chainType: 'solana',
        transaction: transaction
      })
      
      console.log({data})
      await this.connection.confirmTransaction(
        {
          signature: data.hash,
        } as BlockheightBasedTransactionConfirmationStrategy,
        'confirmed'
      )      
    }

    const transactionBuf = Buffer.from(
      stepTX.transactionRequest.data,
      "base64"
    );

    const swapTransaction =  VersionedTransaction.deserialize(transactionBuf);

    const sign = await this.privy.walletApi.solana.signTransaction({
      address: solanaAddress,
      chainType: 'solana',
      transaction: swapTransaction
    })

    const txnId = await this.connection.sendTransaction(
      sign.signedTransaction as VersionedTransaction, 
      {
      maxRetries: 5,
      skipPreflight: true,
    });
    console.log({txnId});

    await this.connection.confirmTransaction(
      {
        signature: txnId,
      } as BlockheightBasedTransactionConfirmationStrategy,
      'confirmed'
    )

    return `ATA for ${swapDTO.tokenAddress} created for ${solanaAddress}`;
     
  }

  // async getRoutes(
  //   transferDTO: TransferDTO, 
  // ) {
  //   const solanaAddress = 'EYQW8SWkZFFmea5hXmro45az3JVxuFhNxvG63c7srokW'

  //   let amountToSend;

  //   if(transferDTO.tokenAddress === '11111111111111111111111111111111'){
  //     amountToSend = parseFloat(transferDTO.amount)  * LAMPORTS_PER_SOL;
  //   } else {
  //     const decimals: number = await this.getNumberDecimals('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')
  //     amountToSend = parseFloat(transferDTO.amount)  * Math.pow(10, decimals);  
  //   }


  //   const response = await fetch('https://li.quest/v1/advanced/routes', {
  //     method: 'POST',
  //     headers: {
  //       'accept': 'application/json',
  //       'content-type': 'application/json'
  //     },
  //     body: JSON.stringify({
  //       fromChainId: "SOL",
  //       fromAmount: amountToSend.toString(),
  //       toChainId: "SOL",
  //       fromTokenAddress: "11111111111111111111111111111111",
  //       toTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  //       fromAddress: solanaAddress,
  //       toAddress: solanaAddress
  //     })
  //   });

  //   const routes = await response.json();
  //   console.log(routes);
  // }

}
