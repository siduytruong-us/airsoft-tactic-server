import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsObject()
  geometry!: object;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  colorHex?: string;

  @IsString()
  @IsOptional()
  areaType?: string;
}

export class UpdateAreaDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsObject()
  @IsOptional()
  geometry?: object;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  colorHex?: string;

  @IsString()
  @IsOptional()
  areaType?: string;
}
