import { IsNumber, IsString, IsNotEmpty, Min, Max } from 'class-validator';

export class PingRequestDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsString()
  @IsNotEmpty()
  pingType!: string;
}
