import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from 'src/monitrix-auth/utils/decorators';

export class ChangeForgotPassDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly passResetToken: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  readonly password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Match('password', { message: `Password didn't matched` })
  readonly passwordConfirm: string;
}
