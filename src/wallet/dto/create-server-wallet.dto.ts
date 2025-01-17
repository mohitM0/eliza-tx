import { IsString, IsInt, IsEnum, IsNotEmpty } from '@nestjs/class-validator';

export class CreateServerWalletDto {
  @IsString()
  @IsNotEmpty()
  readonly id: string;
}
