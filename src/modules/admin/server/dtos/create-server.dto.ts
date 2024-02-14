import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateServerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serverUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode: string;
}
