/**dependencies */
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubscriberUserService } from './subscriber-user/subscriber-user.service';
import { SubscriberService } from './subscriber.service';
/**services */

@ApiTags('Subscriber')
@Controller({
  //path name
  path: 'subscriber',
  //version
  version: '1',
})
export class SubscriberController {
  constructor(
    private readonly subscriberService: SubscriberService,
    private readonly subscriberUserService: SubscriberUserService,
  ) {}
}
