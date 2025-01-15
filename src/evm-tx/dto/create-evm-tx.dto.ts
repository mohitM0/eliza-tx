import { Address } from "viem";

export class TransferDTO {
    fromChain: String;
    toAddress: Address;
    amount: string;
    data?: `0x${string}`;
}
