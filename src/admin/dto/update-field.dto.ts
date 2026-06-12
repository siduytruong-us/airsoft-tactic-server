import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateFieldDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  website?: string;

  @IsInt()
  @Min(0)
  @Max(99)
  @IsOptional()
  minAge?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  entryFee?: number;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  entryFeeCurrency?: string;

  @IsString()
  @IsIn(['yes', 'no', 'unknown'])
  @IsOptional()
  rentalAvailable?: string;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
