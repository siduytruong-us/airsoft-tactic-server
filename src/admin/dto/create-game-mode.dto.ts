import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateGameModeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  rules?: string[];

  @IsInt()
  @Min(2)
  maxPlayers!: number;

  @IsInt()
  @Min(2)
  teamCount!: number;

  @IsBoolean()
  @IsOptional()
  respawnEnabled?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  respawnDelaySeconds?: number;
}
