import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

//swagger doc
@ApiTags('Admin|User')
//guards
// @ApiBearerAuth('jwt')
// @UseGuards(JwtAuthGuard)
@Controller({
  //path name
  path: 'user',
  //route version
  version: '1',
})
export class UserController {}
