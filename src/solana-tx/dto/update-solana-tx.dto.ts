import { PartialType } from '@nestjs/mapped-types';
import { CreateSolanaTxDto } from './create-solana-tx.dto';

export class UpdateSolanaTxDto extends PartialType(CreateSolanaTxDto) {}
