import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TimeIntervalEnum } from 'src/monitrix-auth/common/enum';

export class CreatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  isActive: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  periodInterval: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timePeriod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(TimeIntervalEnum)
  timeInterval: TimeIntervalEnum;

  @ApiPropertyOptional()
  @IsOptional()
  features: any;
}
