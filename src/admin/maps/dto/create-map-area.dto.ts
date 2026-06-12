import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateMapAreaDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  geojson!: object;

  @IsString()
  @IsOptional()
  colorHex?: string;

  @IsString()
  @IsOptional()
  areaType?: string;
}

export class UpdateMapAreaDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  geojson?: object;

  @IsString()
  @IsOptional()
  colorHex?: string;

  @IsString()
  @IsOptional()
  areaType?: string;
}
