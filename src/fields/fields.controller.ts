import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { FieldsService } from './fields.service';

@Controller('v1/fields')
@UseGuards(JwtAuthGuard)
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get()
  async getFields(
    @Query('page') page = 0,
    @Query('size') size = 20,
  ) {
    return this.fieldsService.getFields(Number(page), Number(size));
  }

  @Get(':id')
  async getField(@Param('id') id: string) {
    return this.fieldsService.getField(id);
  }
}
