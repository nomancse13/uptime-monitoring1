import { PartialType } from '@nestjs/swagger';
import { CreateSSLDto } from './create-ssl.dto';

export class UpdateSSLDto extends PartialType(CreateSSLDto) {}
