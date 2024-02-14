import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
} from 'class-validator';
import { FrequerncyTypeEnum } from 'src/monitrix-auth/common/enum/frequency-type.enum';

export class CreateSSLDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  url: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  groupId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  locationId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(FrequerncyTypeEnum)
  frequency: FrequerncyTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  team: any;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Max(365)
  alertBeforeExpiration: number;
}
