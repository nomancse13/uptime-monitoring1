import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name: string;
}
