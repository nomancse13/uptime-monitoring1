import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateWebsiteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUrl()
  @IsString()
  websiteUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @ApiPropertyOptional()
  @IsOptional()
  readonly team: any;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  locationId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  searchString: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  searchStringMissing: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  delayDurationId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  loadTime: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  occurrences: number;
}
