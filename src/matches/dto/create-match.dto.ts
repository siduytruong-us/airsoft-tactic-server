import { IsUUID } from 'class-validator';

export class CreateMatchDto {
  @IsUUID('4')
  fieldId!: string;

  @IsUUID('4')
  gameModeId!: string;
}
