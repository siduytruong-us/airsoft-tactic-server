import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateMatchDto {
  @IsUUID('4')
  fieldId!: string;

  @IsUUID('4')
  gameModeId!: string;

  @IsInt()
  @Min(2)
  maxPlayers!: number;

  @IsInt()
  @Min(2)
  teamCount!: number;

  @IsBoolean()
  respawnEnabled!: boolean;

  @IsInt()
  @Min(0)
  respawnDelaySeconds!: number;

  @IsDateString()
  @IsOptional()
  scheduledEndAt?: string;

  @IsUUID('4')
  @IsOptional()
  mapId?: string;
}
