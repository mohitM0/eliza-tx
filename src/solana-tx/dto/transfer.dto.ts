import { IsOptional, IsString } from "@nestjs/class-validator";

export class TransferDTO {
    @IsString()
    recipient: string;

    @IsString()
    amount: string;

    @IsString()
    @IsOptional()
    tokenAddress: string;
}