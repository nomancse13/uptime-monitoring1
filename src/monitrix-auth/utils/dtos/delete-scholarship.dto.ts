import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class DeleteScholarshipDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({}, { each: true, message: 'each value in  must be a number' })
  ids: number[];
}
