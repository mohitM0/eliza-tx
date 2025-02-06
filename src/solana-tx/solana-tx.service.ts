import { Injectable } from '@nestjs/common';
import { CreateSolanaTxDto } from './dto/create-solana-tx.dto';
import { UpdateSolanaTxDto } from './dto/update-solana-tx.dto';

@Injectable()
export class SolanaTxService {
  create(createSolanaTxDto: CreateSolanaTxDto) {
    return 'This action adds a new solanaTx';
  }

  findAll() {
    return `This action returns all solanaTx`;
  }

  findOne(id: number) {
    return `This action returns a #${id} solanaTx`;
  }

  update(id: number, updateSolanaTxDto: UpdateSolanaTxDto) {
    return `This action updates a #${id} solanaTx`;
  }

  remove(id: number) {
    return `This action removes a #${id} solanaTx`;
  }
}
