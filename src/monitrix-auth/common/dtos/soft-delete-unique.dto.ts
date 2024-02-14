import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SoftDeleteUniqueDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString({ each: true })
  readonly uniqueIds: string;
}
