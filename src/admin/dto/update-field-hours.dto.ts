import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class FieldHourItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsOptional()
  @IsString()
  openTime?: string | null;

  @IsOptional()
  @IsString()
  closeTime?: string | null;

  @IsBoolean()
  isClosed!: boolean;
}

export class UpdateFieldHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldHourItemDto)
  hours!: FieldHourItemDto[];
}
