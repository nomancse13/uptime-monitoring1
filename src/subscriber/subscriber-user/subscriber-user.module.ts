import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from 'src/modules/admin/admin.module';
import { SystemDelayEntity } from 'src/modules/admin/entities';
import { AvailableIntegrationsEntity } from 'src/modules/admin/integrations/entity';
import { QueueMailModule } from 'src/modules/queue-mail/queue-mail.module';
import { AuthModule } from 'src/monitrix-auth/auth/auth.module';
import { BlacklistController, BlacklistService } from './blacklist';
import { BlacklistEntity } from './blacklist/entity';
import { DomainController, DomainService } from './domain';
import { DomainEntity } from './domain/entity';
import { SubscriberUserEntity } from './entity';
import { LogDetailsEntity } from './entity/log-details.entity';
import { IncidentEntity } from './incident/incident.entity';
import { WebsiteResolveEntity } from './incident/website-resolve.entity';
import { IntegrationConfigureEntity } from './integrations/entity';
import { IntegrationController } from './integrations/integration.controller';
import { IntegrationService } from './integrations/integration.service';
import { SSLController, SSLService } from './ssl';
import { SSLEntity } from './ssl/entity/ssl.entity';
import { SubscriberUserController } from './subscriber-user.controller';
import { SubscriberUserService } from './subscriber-user.service';
import { TeamController } from './team/team.controller';
import { WebsiteController, WebsiteService } from './website';
import { WebsiteAlertEntity } from './website/entity/website-alert.entity';
import { WebsiteEntity } from './website/entity/website.entity';
import { WebsiteAlertController } from './website/website-alert.controller';
import { WorkspaceEntity } from './workspace/entity';
import { WorkspaceController } from './workspace/workspace.controller';
import { WorkspaceService } from './workspace/workspace.service';

@Module({
  controllers: [
    SubscriberUserController,
    WorkspaceController,
    DomainController,
    BlacklistController,
    SSLController,
    WebsiteController,
    TeamController,
    WebsiteAlertController,
    IntegrationController,
  ],
  providers: [
    SubscriberUserService,
    WorkspaceService,
    DomainService,
    BlacklistService,
    SSLService,
    WebsiteService,
    IntegrationService,
  ],
  imports: [
    TypeOrmModule.forFeature([
      SubscriberUserEntity,
      WorkspaceEntity,
      DomainEntity,
      BlacklistEntity,
      SSLEntity,
      LogDetailsEntity,
      WebsiteEntity,
      WebsiteAlertEntity,
      SystemDelayEntity,
      IncidentEntity,
      IntegrationConfigureEntity,
      AvailableIntegrationsEntity,
      WebsiteResolveEntity,
    ]),
    QueueMailModule,
    AuthModule,
    TerminusModule,
    HttpModule,
    forwardRef(() => AdminModule),
  ],
  exports: [WorkspaceService, SubscriberUserService, WebsiteService],
})
export class SubscriberUserModule {}
