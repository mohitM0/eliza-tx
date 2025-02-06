import { IsOptional, IsString } from "@nestjs/class-validator";

export class TransferDTO {
    @IsString()
    toAddress: string;

    @IsString()
    amount: string;

    @IsString()
    @IsOptional()
    token: string;
}