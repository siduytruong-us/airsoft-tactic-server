import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMapDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateMapDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  coverImageUrl?: string | null;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
