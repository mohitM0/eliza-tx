import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SolanaTxService } from './solana-tx.service';
import { CreateSolanaTxDto } from './dto/create-solana-tx.dto';
import { UpdateSolanaTxDto } from './dto/update-solana-tx.dto';

@Controller('solana-tx')
export class SolanaTxController {
  constructor(private readonly solanaTxService: SolanaTxService) {}

  @Post()
  create(@Body() createSolanaTxDto: CreateSolanaTxDto) {
    return this.solanaTxService.create(createSolanaTxDto);
  }

  @Get()
  findAll() {
    return this.solanaTxService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.solanaTxService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSolanaTxDto: UpdateSolanaTxDto) {
    return this.solanaTxService.update(+id, updateSolanaTxDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.solanaTxService.remove(+id);
  }
}
