import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class OtpVerifyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly otpCode: string;
}
