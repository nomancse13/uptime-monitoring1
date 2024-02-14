import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly mobile: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly gender: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly maritalStatus: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly birthDate: string;
}
