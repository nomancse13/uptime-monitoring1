import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class ConfigureUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnableNow: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  configure: any;
}
