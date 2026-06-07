import { IsUUID } from 'class-validator';

export class JoinTeamDto {
  @IsUUID('4')
  teamId!: string;
}
