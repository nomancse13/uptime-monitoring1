import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { decrypt } from 'src/helper/crypto.helper';
import { DateTime } from 'src/helper/date-time-helper';
import { AvailableIntegrationsEntity } from 'src/modules/admin/integrations/entity';
import {
  ErrorMessage,
  StatusField,
  UserTypesEnum,
} from 'src/monitrix-auth/common/enum';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { SubscriberUserService } from '../subscriber-user.service';
import { ConfigureUpdateDto } from './dtos';
import { IntegrationConfigureEntity } from './entity';

@Injectable()
export class IntegrationService {
  constructor(
    @InjectRepository(IntegrationConfigureEntity)
    private readonly integrationRepository: BaseRepository<IntegrationConfigureEntity>,
    @Inject(forwardRef(() => SubscriberUserService))
    private readonly subscriberUserService: SubscriberUserService,
    @InjectRepository(AvailableIntegrationsEntity)
    private readonly availableIntegrationRepository: BaseRepository<AvailableIntegrationsEntity>,
  ) {}

  //   get all integration

  async getAllIntegrations(userPayload: UserInterface) {
    const integrationIds =
      await this?.subscriberUserService?.getInstalledIntegrationIds(
        userPayload?.id,
      );

    const data: any = await this.availableIntegrationRepository.find({
      where: {
        status: 'Active',
      },
      order: {
        id: 'ASC',
      },
    });

    if (data) {
      data.map((item: any) => {
        if (
          integrationIds?.integrationIds.length &&
          integrationIds?.integrationIds.includes(parseInt(item?.id))
        ) {
          item['installed'] = true;
        } else {
          item['installed'] = false;
        }
      });

      return data;
    } else {
      throw new NotFoundException(`Data Not Found!`);
    }
  }

  //   get Installed integration

  async getInstalledIntegrations(userPayload: UserInterface) {
    const integrationIds =
      await this?.subscriberUserService?.getInstalledIntegrationIds(
        userPayload?.id,
      );
    if (integrationIds?.integrationIds.length > 0) {
      const data: any = await this.availableIntegrationRepository
        .createQueryBuilder('integration')
        .orderBy('integration.id', 'ASC')

        .leftJoinAndMapOne(
          'integration.int',
          IntegrationConfigureEntity,
          'int',
          `integration.id = int.integrationId And int.userId = ${userPayload.id}`,
        )
        .select([
          `integration.id`,
          `integration.status`,
          `integration.name`,
          `integration.iconSrc`,
          `integration.shortDescription`,
          `integration.overview`,
          `integration.badgeText`,
          'int.isEnableNow as "isEnable"',
          'int.connectionStatus as connectionStatus',
        ])
        .where(`integration."status" = 'Active'`)
        .andWhere('integration."id" IN(:...ids)', {
          ids: integrationIds?.integrationIds,
        })
        .getRawMany();

      return data;
    } else {
      throw new NotFoundException(`Data Not Found!`);
    }
  }

  //   update   integration

  async updateIntegration(
    id: number,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const integrationIds =
      await this?.subscriberUserService?.getInstalledIntegrationIds(
        userPayload?.id,
      );

    if (integrationIds?.integrationIds) {
      const index = integrationIds?.integrationIds.indexOf(id);
      if (index > -1) {
        // Number exists in array, so remove it
        integrationIds?.integrationIds.splice(index, 1);
        await this.integrationRepository.delete({
          integrationId: id,
          userId: userPayload.id,
        });
      } else {
        // Number does not exist in array, so add it
        integrationIds?.integrationIds.push(id);

        const integration = new IntegrationConfigureEntity();
        integration.updatedAt = new Date();
        integration.userId = userPayload.id;
        integration.integrationId = id;
        integration.connectionStatus = 'notConnected';

        await this.integrationRepository.insert(integration);
      }

      const updateIntegration =
        await this?.subscriberUserService?.updateInstalledIntegrationIds(
          userPayload?.id,
          integrationIds?.integrationIds,
        );

      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload?.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `${userPayload?.id} update integration`,
          id: id,
        },
      };

      await this.subscriberUserService.activityLog(log);

      return updateIntegration.affected >= 1
        ? 'Updated Successfully!'
        : ErrorMessage.UPDATE_FAILED;
    }
  }

  //   get single configuration

  async getSingleConfigure(id: number, userPayload: UserInterface) {
    const data = await this.integrationRepository

      .createQueryBuilder('integration')
      .where('integration.integrationId = :integrationId', {
        integrationId: id,
      })
      .andWhere('integration.userId = :userId', {
        userId: userPayload.id,
      })

      .select([
        'integration.id',
        'integration.configure',
        'integration.isEnableNow',
        'integration.integrationId',
        'integration.connectionStatus',
      ])
      .getOne();

    if (!data) {
      throw new NotFoundException('No data found!');
    }

    return data;
  }

  // update intConfig

  async updateIntegrationConfig(
    id: number,
    updateIntegrationDto: ConfigureUpdateDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforAdd(userPayload);
    }

    updateIntegrationDto['updatedBy'] = userPayload.id;

    const data = await this.integrationRepository
      .createQueryBuilder()
      .update(IntegrationConfigureEntity, updateIntegrationDto)
      .where(`integrationId ='${id}'`)
      .andWhere(`userId = ${userPayload.id}`)
      .returning('*')
      .execute();

    if (!data) {
      throw new NotFoundException(ErrorMessage.UPDATE_FAILED);
    }

    if (data) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `Integration updated`,
          services: {
            tag: 'Integration',
            value: data?.raw[0]?.userId,
            identity: data.raw[0]?.id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }
    return data.raw[0];
  }
}
