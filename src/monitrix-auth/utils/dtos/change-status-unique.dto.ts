import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { StatusField } from 'src/monitrix-auth/common/enum';

export class ChangeStatusUniqueDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString({ each: true, message: 'each value in  must be a string' })
  uniqueIds: string[];

  @ApiProperty({
    enum: StatusField,
    examples: [
      StatusField.ACTIVE,
      StatusField.INACTIVE,
      StatusField.DRAFT,
      StatusField.DELETED,
    ],
  })
  @IsNotEmpty()
  @IsEnum(StatusField)
  status: StatusField;
}
