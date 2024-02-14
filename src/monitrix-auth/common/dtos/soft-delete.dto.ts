import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class SoftDeleteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  readonly ids: number;
}
