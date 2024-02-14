import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AlertTypeEnum } from 'src/monitrix-auth/common/enum';

export class CreateWebsiteAlertDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  websiteId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type: AlertTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comparison: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comparisonLimit: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  occurrences: number;

  @ApiPropertyOptional()
  @IsOptional()
  contacts: any;
}
