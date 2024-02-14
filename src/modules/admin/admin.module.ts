/**dependencies */
import { forwardRef, Module } from '@nestjs/common';
/**controllers */
/**services */
/**Authentication strategies */
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/monitrix-auth/auth/auth.module';
import { SubscriberUserModule } from 'src/subscriber/subscriber-user/subscriber-user.module';
import { QueueMailModule } from '../queue-mail/queue-mail.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemDelayEntity } from './entities';
import { AvailableIntegrationsEntity } from './integrations/entity';
import { AdminIntegrationService } from './integrations/integration.service';
import { PlanEntity } from './plan/entity';
import { PlanController } from './plan/plan.controller';
import { PlanService } from './plan/plan.service';
import { ServerEntity } from './server/entity';
import { ServerController } from './server/server.controller';
import { ServerService } from './server/server.service';
import { User } from './user/entity/user.entity';
import { UserService } from './user/user.service';
import { BlacklistServersEntity } from './blacklist/entity';
import { AdminBlacklistServerService } from './blacklist/server.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PlanEntity,
      SystemDelayEntity,
      ServerEntity,
      AvailableIntegrationsEntity,
      BlacklistServersEntity,
    ]),
    QueueMailModule,
    forwardRef(() => AuthModule),

    SubscriberUserModule,
  ],
  controllers: [AdminController, PlanController, ServerController],
  providers: [
    AdminService,
    UserService,
    PlanService,
    ServerService,
    AdminIntegrationService,
    AdminBlacklistServerService,
  ],
  exports: [
    UserService,
    PlanService,
    ServerService,
    AdminIntegrationService,
    AdminBlacklistServerService,
  ],
})
export class AdminModule {}
