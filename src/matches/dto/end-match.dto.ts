import { IsOptional, IsUUID } from 'class-validator';

export class EndMatchDto {
  @IsOptional()
  @IsUUID('4')
  winningTeamId?: string;
}
