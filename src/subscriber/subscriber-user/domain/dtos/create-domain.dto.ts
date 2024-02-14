import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
} from 'class-validator';
import { FrequerncyTypeEnum } from 'src/monitrix-auth/common/enum/frequency-type.enum';

export class CreateDomainDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUrl()
  @IsString()
  domainUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(FrequerncyTypeEnum)
  frequencyType: FrequerncyTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  team: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Max(365)
  alertBeforeExpiration: number;
}
