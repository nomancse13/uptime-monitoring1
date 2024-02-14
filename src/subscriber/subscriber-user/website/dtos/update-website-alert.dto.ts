import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateWebsiteAlertDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comparison: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  occurrences: number;

  @ApiPropertyOptional()
  @IsOptional()
  contacts: any;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  websiteId: number;

  @ApiProperty()
  @IsNotEmpty()
  comparisonLimit: any;
}
