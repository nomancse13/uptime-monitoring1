import { Module } from '@nestjs/common';
import { QueueMailModule } from 'src/modules/queue-mail/queue-mail.module';
import { SubscriberUserModule } from './subscriber-user/subscriber-user.module';

@Module({
  controllers: [],
  providers: [],
  imports: [QueueMailModule, SubscriberUserModule],
})
export class SubscriberModule {}
