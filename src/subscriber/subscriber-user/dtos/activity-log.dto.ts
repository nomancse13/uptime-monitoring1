import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { LogMessageInterface } from 'src/monitrix-auth/common/interfaces';

export class ActivityLogDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  ipAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  browser: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  time: string;

  @ApiProperty()
  @IsNotEmpty()
  messageDetails: LogMessageInterface;
}
