import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { StatusField } from 'src/monitrix-auth/common/enum';

export class UserBannedDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(StatusField)
  status: StatusField;
}
