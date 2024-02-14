import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Match } from 'src/monitrix-auth/utils/decorators';

class permssions {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  readonly add: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  readonly edit: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  readonly delete: number;
}
export class CreateTeamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Match('password', { message: `Password didn't matched` })
  passwordConfirm: string;

  @ApiPropertyOptional()
  @IsOptional()
  permission: any;
}
