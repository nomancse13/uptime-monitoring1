import { PartialType } from '@nestjs/swagger';
import { CreateTeamDto } from './add-team.dto';

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}
