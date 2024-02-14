import { HttpService } from '@nestjs/axios/dist';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common/enums';
import { HealthCheckError, HealthCheckService } from '@nestjs/terminus';
import { InjectRepository } from '@nestjs/typeorm';
import * as Influx from 'influxdb-nodejs';
import { isValidHttpUrl } from 'src/helper/common.helper';
import { decrypt } from 'src/helper/crypto.helper';
import { DateTime } from 'src/helper/date-time-helper';
import { websiteAlert } from 'src/helper/website-alert.helper';
import { SystemDelayEntity } from 'src/modules/admin/entities';
import { ServerEntity } from 'src/modules/admin/server/entity';
import {
  PaginationDataDto,
  SoftDeleteDto,
} from 'src/monitrix-auth/common/dtos';
import {
  AlertTypeEnum,
  ErrorMessage,
  StatusField,
  UserTypesEnum,
  WebsiteAlertStatus,
} from 'src/monitrix-auth/common/enum';
import {
  Pagination,
  PaginationOptionsInterface,
  UserInterface,
} from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import { ChangeStatusDto } from 'src/monitrix-auth/utils/dtos';
import { Brackets } from 'typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { v4 as uuidv4 } from 'uuid';
import { IncidentEntity } from '../incident/incident.entity';
import { WebsiteResolveEntity } from '../incident/website-resolve.entity';
import { SubscriberUserService } from '../subscriber-user.service';
import { WorkspaceEntity } from '../workspace/entity';
import {
  CreateWebsiteDto,
  UpdateWebsiteAlertDto,
  UpdateWebsiteDto,
} from './dtos';
import { CreateWebsiteAlertDto } from './dtos/create-website-alert.dto';
import { WebsiteAlertEntity } from './entity/website-alert.entity';
import { WebsiteEntity } from './entity/website.entity';

@Injectable()
export class WebsiteService {
  constructor(
    @InjectRepository(WebsiteEntity)
    private readonly websiteRepository: BaseRepository<WebsiteEntity>,
    @InjectRepository(WebsiteAlertEntity)
    private readonly websiteAlertRepository: BaseRepository<WebsiteAlertEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: BaseRepository<IncidentEntity>,
    @InjectRepository(WebsiteResolveEntity)
    private readonly resolveRepository: BaseRepository<WebsiteResolveEntity>,
    @Inject(forwardRef(() => SubscriberUserService))
    private readonly subscriberUserService: SubscriberUserService,
    private health: HealthCheckService,
    private httpService: HttpService,
  ) {}

  //  check url health
  async checkUrlHealth(url: string): Promise<boolean> {
    try {
      const response = await this.httpService.get(url).toPromise();

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return false;
    }
  }

  // create website

  async createWebsite(
    createWebsiteDto: CreateWebsiteDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforAdd(userPayload);
    }
    createWebsiteDto['createdBy'] = userPayload.id;
    createWebsiteDto['updatedAt'] = null;

    createWebsiteDto['userId'] = userPayload.id;

    createWebsiteDto['uniqueId'] = uuidv4();

    const checkValidity = await this.checkUrlHealth(
      createWebsiteDto.websiteUrl,
    );

    if (checkValidity == false) {
      throw new BadRequestException(`website url is invalid!`);
    }
    if (!isValidHttpUrl(createWebsiteDto.websiteUrl)) {
      throw new BadRequestException(
        `website url is invalid! simply add "http://" or "https://" to the beginning of the URL`,
      );
    }

    const dupWebsiteUrlCheck = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website.websiteUrl = '${createWebsiteDto.websiteUrl}'`)
      .getCount();
    if (dupWebsiteUrlCheck > 0) {
      throw new BadRequestException(`website url you insert, already exist!`);
    }

    const data = await this.websiteRepository.save(createWebsiteDto);

    if (data) {
      // try {
      const loadTiemAlert = websiteAlert(
        data.id,
        AlertTypeEnum.LOAD_TIME,
        '>',
        createWebsiteDto.loadTime,
        createWebsiteDto.occurrences,
        createWebsiteDto.team,
      );

      if (loadTiemAlert) {
        loadTiemAlert['createdBy'] = userPayload.id;
        await this.websiteAlertRepository.save(loadTiemAlert);
      }
      const responsCodeAleart = await websiteAlert(
        data.id,
        AlertTypeEnum.RESPONSE_CODE,
        '!=',
        200,
        createWebsiteDto.occurrences,
        createWebsiteDto.team,
      );
      if (responsCodeAleart) {
        responsCodeAleart['createdBy'] = userPayload.id;
        await this.websiteAlertRepository.save(responsCodeAleart);
      }
      if (
        createWebsiteDto.searchString != null &&
        createWebsiteDto.searchStringMissing == true
      ) {
        const searchStringAlert = await websiteAlert(
          data.id,
          AlertTypeEnum.SEARCH_STRING_MISSING,
          '==',
          createWebsiteDto.searchString,
          createWebsiteDto.occurrences,
          createWebsiteDto.team,
        );
        searchStringAlert['createdBy'] = userPayload.id;

        await this.websiteAlertRepository.save(searchStringAlert);
      }
      // } catch (exception) {
      //   //todo
      // }

      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `new website created by ${decrypt(userPayload.hashType)}`,
          services: {
            tag: 'Website',
            value: data.websiteUrl,
            identity: data.id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }

    return data;
  }

  //   update a website

  async updateWebsite(
    uniqueId: any,
    userPayload: UserInterface,
    updateWebsiteDto: UpdateWebsiteDto,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforEdit(userPayload);
    }

    updateWebsiteDto['updatedBy'] = userPayload.id;

    const singleWebsite = await this.websiteRepository.findOne({
      where: { uniqueId: uniqueId },
    });

    if (
      updateWebsiteDto.websiteUrl &&
      !isValidHttpUrl(updateWebsiteDto.websiteUrl)
    ) {
      throw new BadRequestException(
        `website url is invalid! simply add "http://" or "https://" to the beginning of the URL`,
      );
    }

    const checkValidity = await this.checkUrlHealth(
      updateWebsiteDto.websiteUrl,
    );

    if (checkValidity == false) {
      throw new BadRequestException(`website url is invalid!`);
    }

    const dupWebsiteUrlCheck = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website.websiteUrl = '${updateWebsiteDto.websiteUrl}'`)
      .andWhere(`website.uniqueId != '${uniqueId}'`)
      .getCount();

    if (dupWebsiteUrlCheck > 0) {
      throw new BadRequestException(`website url you insert, already exist!`);
    }

    const updatedWebsiteData = {
      name: updateWebsiteDto.name ? updateWebsiteDto.name : singleWebsite.name,
      websiteUrl: updateWebsiteDto.websiteUrl
        ? updateWebsiteDto.websiteUrl
        : singleWebsite.websiteUrl,
      groupId: updateWebsiteDto.groupId
        ? updateWebsiteDto.groupId
        : singleWebsite.groupId,
      team: updateWebsiteDto.team ? updateWebsiteDto.team : singleWebsite.team,
      updatedBy: userPayload.id,
      searchString: updateWebsiteDto.searchString
        ? updateWebsiteDto.searchString
        : singleWebsite.searchString,
      delayDurationId: updateWebsiteDto.delayDurationId
        ? updateWebsiteDto.delayDurationId
        : singleWebsite.delayDurationId,
      locationId: updateWebsiteDto.locationId
        ? updateWebsiteDto.locationId
        : singleWebsite.locationId,
    };

    const finalData = await this.websiteRepository
      .createQueryBuilder()
      .update(WebsiteEntity, updatedWebsiteData)
      .where(`uniqueId = '${uniqueId}'`)
      .andWhere(`createdBy = ${userPayload.id}`)
      .returning('*')
      .execute();

    if (!finalData) {
      throw new NotFoundException(ErrorMessage.UPDATE_FAILED);
    }

    if (finalData) {
      const deleteALertData = await this.websiteAlertRepository.delete({
        websiteId: singleWebsite.id,
      });

      if (deleteALertData.affected >= 0) {
        const loadTiemAlert = websiteAlert(
          singleWebsite.id,
          AlertTypeEnum.LOAD_TIME,
          '>',
          updateWebsiteDto.loadTime,
          updateWebsiteDto.occurrences,
          updateWebsiteDto.team,
        );

        if (loadTiemAlert) {
          await this.websiteAlertRepository.save(loadTiemAlert);
        }
        const responsCodeAleart = await websiteAlert(
          singleWebsite.id,
          AlertTypeEnum.RESPONSE_CODE,
          '!=',
          200,
          updateWebsiteDto.occurrences,
          updateWebsiteDto.team,
        );
        if (responsCodeAleart) {
          await this.websiteAlertRepository.save(responsCodeAleart);
        }
        if (
          updateWebsiteDto.searchString != null &&
          updateWebsiteDto.searchStringMissing == true
        ) {
          const searchStringAlert = await websiteAlert(
            singleWebsite.id,
            AlertTypeEnum.SEARCH_STRING_MISSING,
            '!=',
            200,
            updateWebsiteDto.occurrences,
            updateWebsiteDto.team,
          );
          await this.websiteAlertRepository.save(searchStringAlert);
        }
      }
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `website updated by ${decrypt(userPayload.hashType)}`,
          services: {
            tag: 'Website',
            value: finalData.raw[0].websiteUrl,
            identity: singleWebsite.id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }
    return finalData.raw[0];
  }

  // change status of website
  async websiteStatusChange(
    changeStatusDto: ChangeStatusDto,
    userPayload: UserInterface,
  ) {
    let updatedData: any;
    if (changeStatusDto.status === StatusField.DELETED) {
      updatedData = {
        deletedBy: userPayload.id,
        deletedAt: new Date(),
        updatedBy: null,
        status: changeStatusDto.status,
      };
    } else if (changeStatusDto.status === StatusField.ACTIVE) {
      updatedData = {
        deletedBy: userPayload.id,
        deletedAt: null,
        updatedBy: null,
        status: changeStatusDto.status,
      };
    } else {
      updatedData = {
        deletedAt: null,
        deletedBy: null,
        updatedBy: userPayload.id,
        status: changeStatusDto.status,
      };
    }

    const data = await this.websiteRepository
      .createQueryBuilder()
      .update(WebsiteEntity, updatedData)
      .andWhere('id IN(:...ids)', {
        ids: changeStatusDto.ids,
      })
      .returning('*')
      .execute();

    if (data.affected === 0) {
      throw new BadRequestException(ErrorMessage.UPDATE_FAILED);
    }

    return data.raw;
  }

  //   get single website

  async singleWebsite(
    uniqueId: any,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const data: any = await this.websiteRepository
      .createQueryBuilder('website')
      .leftJoinAndMapOne(
        'website.alert',
        WebsiteAlertEntity,
        'alert',
        `website.id = alert.websiteId`,
      )
      .leftJoinAndMapOne(
        'website.location',
        ServerEntity,
        'location',
        `website.locationId = location.id`,
      )
      .leftJoinAndMapOne(
        'website.workspace',
        WorkspaceEntity,
        'workspace',
        `website.groupId = workspace.id`,
      )
      .leftJoinAndMapOne(
        'website.delayDuration',
        SystemDelayEntity,
        'delayDuration',
        `website.delayDurationId = delayDuration.id`,
      )
      .where(`website.uniqueId = '${uniqueId}'`)
      .andWhere(`website."userId" = ${userPayload.id}`)
      .select([
        'website.status',
        'website.id',
        'website.name',
        'website.websiteUrl',
        'website.groupId',
        'website.locationId',
        'website.searchString',
        'website.delayDurationId',
        `website.alertStatus`,
        `website.lastCheckTime`,
        `website.lastLoadTime`,
        'workspace.name',
        `website.uniqueId`,
        'workspace.id',
        'delayDuration.name',
        'delayDuration.value',
        'alert.contacts',
        'alert.comparisonLimit',
        'website.occurrences',
        'location.countryName',
        'location.id',
      ])
      .getOne();

    if (data) {
      // const getInfluxData = await this.getQuery(data.websiteUrl);
      // const loadData = [];

      // getInfluxData?.values?.filter((e, i, arr) => {
      //   if (new Date(arr[i][0]).getTime() > Date.now() - 60 * 60 * 1000) {
      //     loadData.push(arr[i][2]);
      //   }
      // });

      // if (loadData && loadData.length >= 0) {
      //   data['loadData'] = loadData;
      // }

      // location data structured
      if (data.location == null) {
        data['location'] = null;
      } else {
        data['location']['label'] = data?.location?.countryName;
        delete data?.location?.countryName;

        data['location']['value'] = data?.location?.id;
        delete data?.location?.id;
      }

      // workspace data structured
      if (data.workspace == null) {
        data['workspace'] = null;
      } else {
        data['workspace']['label'] = data?.workspace?.name;
        delete data?.workspace?.name;

        data['workspace']['value'] = data?.workspace?.id;
        delete data?.workspace?.id;
      }

      if (data.alert == null) {
        data['loadTime'] = null;
      } else {
        data['loadTime'] = data?.alert?.comparisonLimit;
        delete data?.alert?.comparisonLimit;
      }
      // duraton data structured

      data['delayDuration']['label'] =
        data.delayDuration == null ? null : data?.delayDuration?.name;
      delete data?.delayDuration?.name;

      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `${data.name} has been fetched`,
          services: {
            tag: 'Website',
            value: data.name,
            identity: data.id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }
    if (data) {
      return data;
    } else {
      throw new NotFoundException(`Data Not Found!`);
    }
  }

  //   paginate website data

  async paginateWebsite(
    paginationDataDto: PaginationDataDto,
    userPayload: UserInterface,
  ) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [results, total] = await this.websiteRepository
      .createQueryBuilder('website')
      .leftJoinAndMapOne(
        'website.location',
        ServerEntity,
        'location',
        `website.locationId = location.id`,
      )
      .leftJoinAndMapOne(
        'website.alert',
        WebsiteAlertEntity,
        'alert',
        `website.id = alert.websiteId`,
      )
      .leftJoinAndMapOne(
        'website.workspace',
        WorkspaceEntity,
        'workspace',
        `website.groupId = workspace.id`,
      )
      .leftJoinAndMapOne(
        'website.delayDuration',
        SystemDelayEntity,
        'delayDuration',
        `website.delayDurationId = delayDuration.id`,
      )
      .where(
        new Brackets((qb) => {
          if (
            paginationDataDto.filter &&
            Object.keys(paginationDataDto.filter).length > 0
          ) {
            Object.keys(paginationDataDto.filter).forEach(function (key) {
              if (paginationDataDto.filter[key] !== '') {
                if (key === 'status') {
                  qb.andWhere(
                    `website.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(website.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .andWhere(`website."createdBy" = ${userPayload.id}`)
      .select([
        'website.status',
        `website.id`,
        `website.name`,
        `website.websiteUrl`,
        `website.groupId`,
        `workspace`,
        `website.userId`,
        `website.uniqueId`,
        `website.team`,
        `website.searchString`,
        `website.updatedAt`,
        `website.alertStatus`,
        `website.lastCheckTime`,
        `website.lastLoadTime`,
        `website.locationId`,
        `location.countryName`,
        `location.countryCode`,
        `website.delayDurationId`,
        'delayDuration.name',
        'delayDuration.value',
        'alert.contacts',
        'alert.comparisonLimit',
        'alert.occurrences',
      ])
      .orderBy(
        `website.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    const result = await Promise.all(
      results.map(async (e) => {
        const getInfluxData = await this.getQuery(e.websiteUrl);

        const loadData = [];

        getInfluxData?.values?.filter((e, i, arr) => {
          if (
            new Date(arr[i][0]).getTime() >
            Date.now() - 24 * 60 * 60 * 1000
          ) {
            const numberLoadData = arr[i][2].split(' ')[0];
            const actualData = Number(numberLoadData);
            loadData.push(actualData);
          }
        });

        return {
          ...e,
          loadData: loadData,
        };
      }),
    );

    // const results = await Promise.all(result.map((e) => {
    // }));

    return new Pagination<WebsiteEntity>({
      results: result,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  // get website api
  async getWebsiteApi(userPayload: UserInterface) {
    const data: any = await this.websiteRepository
      .createQueryBuilder('website')
      .andWhere(`website."userId" = ${userPayload.id}`)
      .select(['website.id as "value"', 'website.name as "label"'])
      .getRawMany();

    if (data.length > 0) {
      return data;
    } else {
      throw new BadRequestException(`data not found`);
    }
  }

  //   delete website with id

  async deleteWebsite(id: any, userPayload: UserInterface) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforDelete(userPayload);
    }
    const data = await this.websiteRepository.delete({
      uniqueId: id,
      createdBy: userPayload.id,
    });
    if (data.affected > 0) {
      return 'deleted successfully!';
    } else {
      throw new BadRequestException(ErrorMessage.DELETE_FAILED);
    }
  }

  // soft delete website

  async softDeleteWebsite(
    softDeleteDto: SoftDeleteDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const deletedInfo = {
      deletedAt: new Date(),
      deletedBy: userPayload.id,
      status: StatusField.DELETED,
    };

    const data = await this.websiteRepository
      .createQueryBuilder()
      .update(WebsiteEntity, deletedInfo)
      .where('id IN (:...ids)', {
        ids: softDeleteDto.ids,
      })
      .execute();

    if (data) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `these website id you provided successfully deleted softly!`,
          services: {
            tag: 'Website',
            identity: softDeleteDto.ids,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }

    return data.affected
      ? `Soft delete successfully!`
      : ErrorMessage.DELETE_FAILED;
  }

  // get domain count by userId

  async websiteCount(id: number) {
    const countWebsite = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website."userId" = ${id}`)
      .getCount();

    return countWebsite;
  }

  // status count

  async getStatusCount(userPayload: UserInterface) {
    const websiteCount = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website."userId" = ${userPayload.id}`)
      .getCount();

    const enableCount = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website."userId" = ${userPayload.id}`)
      .andWhere(`website."status" = '${StatusField.ACTIVE}'`)
      .getCount();

    const disableCount = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website."userId" = ${userPayload.id}`)
      .andWhere(`website."status" = '${StatusField.INACTIVE}'`)
      .getCount();

    const onlineCount = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website."userId" = ${userPayload.id}`)
      .andWhere(`website."alertStatus" = '${WebsiteAlertStatus.UP}'`)
      .getCount();

    const alertCount = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website."userId" = ${userPayload.id}`)
      .andWhere(`website."alertStatus" = '${WebsiteAlertStatus.Alert}'`)
      .getCount();

    const offlineCount = await this.websiteRepository
      .createQueryBuilder('website')
      .where(`website."userId" = ${userPayload.id}`)
      .andWhere(`website."alertStatus" = '${WebsiteAlertStatus.Down}'`)
      .getCount();

    return {
      enable: enableCount,
      disable: disableCount,
      online: onlineCount,
      alert: alertCount,
      offline: offlineCount,
      count: websiteCount,
    };
  }

  // ------------ MONITORING API -----------

  async monitoringSite(url: string) {
    const presentTime = Date.now();
    // const check = await this.health.check(
    //   () => await this.httpService.get(url),
    // );
    // const check = this.httpService.get(url);
    // console.log(check, 'check');

    const data = await this.health.check([
      () =>
        this.httpService
          .get(url)
          .toPromise()
          .then(
            ({
              statusText,
              config: { url },
              data,
              request,
              headers,
              // response,
            }) => {
              const reqData = request.host;
              const status: any =
                statusText === 'OK' ? HttpStatus.OK : HttpStatus.FORBIDDEN;

              let responseTime: any;
              // let loadTimeFinal: any;
              let loadTimeNum: any;
              let loadTime: any;
              let sec: any;
              if (status) {
                responseTime = Date.now();
                loadTimeNum = (responseTime - presentTime) / 1000;
                loadTime = `${(responseTime - presentTime) / 1000} sec`;
                // loadTimeFinal = loadTimeNum + 0.2;
                sec = ((loadTimeNum % 60000) / 1000).toFixed(0);
              }

              return {
                otherService: {
                  status,
                  url,
                  // request,
                  reqData,
                  responseTime,
                  presentTime,
                  loadTime,
                  // loadTimeFinal,
                  sec,
                  data,
                },
              };
            },
          )
          .catch(({ code, config: { url } }) => {
            throw new HealthCheckError('Other service check failed', {
              otherService: {
                status: HttpStatus.FORBIDDEN,
                code,
                url,
              },
            });
          }),
    ]);

    const monitoringData = data?.details?.otherService;

    const websiteData = await this.websiteRepository.findOne({
      where: { websiteUrl: url },
    });

    if (websiteData) {
      const stringCheck = monitoringData?.data?.includes(
        `${websiteData.searchString}`,
      );
      // const stringCheck = monitoringData?.data?.includes(
      //   '/' + `${websiteData.searchString}` + '/' + 'gi',
      // );
      // const stringCheck = await this.includesString()

      if (stringCheck == true) {
        monitoringData['searchStringStatus'] = true;
        return monitoringData;
      } else {
        monitoringData['searchStringStatus'] = false;
        return monitoringData;
      }
    } else {
      return monitoringData;
    }

    // return Object.keys(data.error).length > 0
    //   ? data?.details?.otherService
    //   : data?.details?.otherService;
  }

  //  _______WEBSITE ALERT_________

  // create website alert
  async createWebsiteAlert(
    createWebsiteAlertDto: CreateWebsiteAlertDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    createWebsiteAlertDto['createdBy'] = userPayload.id;
    createWebsiteAlertDto['updatedAt'] = null;

    const alertCheck = await this.websiteAlertRepository.findOne({
      where: {
        type: createWebsiteAlertDto.type,
        websiteId: createWebsiteAlertDto.websiteId,
      },
    });

    if (alertCheck) {
      throw new BadRequestException('type you insert is duplicate!!!');
    }

    const data = await this.websiteAlertRepository.save(createWebsiteAlertDto);

    if (data) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `new Website Alert created by ${decrypt(
            userPayload.hashType,
          )}`,
          services: {
            tag: 'Website Alert',
            value: data.type,
            identity: data.id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }

    return data;
  }

  // update single website alert

  async updateSingleAlert(
    id: number,
    userPayload: UserInterface,
    updateWebsiteAlertDto: UpdateWebsiteAlertDto,
  ) {
    const checkAllTeamExist = await this.subscriberUserService.checkAllExist(
      updateWebsiteAlertDto?.contacts ?? [],
      userPayload?.id,
    );

    const alertCheck = await this.websiteAlertRepository
      .createQueryBuilder('alert')

      .where(`alert.type = '${updateWebsiteAlertDto.type}'`)
      .andWhere(`alert.websiteId = ${updateWebsiteAlertDto.websiteId}`)
      .andWhere(`alert.id != ${id}`)
      .getOne();

    if (alertCheck) {
      throw new BadRequestException('type you insert is duplicate!!!');
    }

    if (
      checkAllTeamExist === true &&
      decrypt(userPayload.hashType) !== UserTypesEnum.TEAMMEMBER
    ) {
      updateWebsiteAlertDto['contacts'] = updateWebsiteAlertDto?.contacts ?? [];
    } else {
      throw new BadRequestException(
        'You do not have permission to add others team member',
      );
    }

    updateWebsiteAlertDto['updatedBy'] = userPayload.id;

    const updateSingleAlert = await this.websiteAlertRepository
      .createQueryBuilder()
      .update(WebsiteAlertEntity, updateWebsiteAlertDto)
      .where(`id = ${id}`)
      .andWhere(`websiteId = ${updateWebsiteAlertDto.websiteId}`)
      .returning('*')
      .execute();

    if (updateSingleAlert.affected == 0) {
      throw new NotFoundException(ErrorMessage.UPDATE_FAILED);
    }

    return updateSingleAlert.raw[0];
  }

  //  get single website alert

  async getSingleWebsiteAlert(id: number, userPayload: UserInterface) {
    const data = await this.websiteAlertRepository.findOne({
      where: {
        id: id,
      },
    });

    if (data) {
      return data;
    } else {
      throw new NotFoundException('Data Not Found!');
    }
  }

  //   delete single website alert with id

  async deleteWebsiteALert(id: number) {
    const data = await this.websiteAlertRepository.delete({
      id: id,
    });
    if (data.affected > 0) {
      return 'deleted successfully!';
    } else {
      throw new BadRequestException(ErrorMessage.DELETE_FAILED);
    }
  }

  // get all website alert

  async getAllWebsiteAlert(
    listQueryParam: PaginationOptionsInterface,
    websiteId: number,
  ): Promise<Pagination<WebsiteAlertEntity>> {
    const limit: number = listQueryParam.limit ? listQueryParam.limit : 10;
    const page: number = listQueryParam.page
      ? +listQueryParam.page == 1
        ? 0
        : listQueryParam.page
      : 1;

    const [results, total] = await this.websiteAlertRepository
      .createQueryBuilder('alert')
      .where('alert.status = :status', { status: StatusField.ACTIVE })
      .andWhere(`alert.websiteId = ${websiteId}`)
      .orderBy('alert.id', 'DESC')
      .take(limit)
      .skip(page > 0 ? page * limit - limit : 0)
      .getManyAndCount();

    return new Pagination<WebsiteAlertEntity>({
      results,
      total,
      currentPage: +page === 0 ? 1 : +page,
      limit: +limit,
    });
  }

  //   async includesString(str: string) {
  //     const dynamicReg = new RegExp(`${str}`);
  //     const result = str.includes(dynamicReg);
  //     return result;
  // }

  // __________________Data fetching from InfluxDb_______________
  // get client

  // connection with influx
  async getClient() {
    const client = new Influx(
      'http://monitrixinflux:influx[2023]!@dev.monitrix.online:8086/monitrix_db?auth=basic',
    );
    return client;
  }

  // website checking
  async checkWebsite(url: string) {
    const websiteData = await this.websiteRepository.findOne({
      where: { websiteUrl: url },
    });
    if (!websiteData) {
      throw new BadRequestException(`website url not matched!`);
    } else {
      return websiteData;
    }
  }

  // get query from influx db
  async getQuery(url: string) {
    await this.checkWebsite(url);
    const client = await this.getClient();

    const data = await client
      .query('website-monitor')
      .where('method', ['GET', 'POST'])
      .where('status', 200)
      .where('url', url)
      .then()
      .catch(console.error);

    return data?.results[0].series && data?.results[0].series.length > 0
      ? data?.results[0]?.series[0]
      : {};
  }

  // get data from influx
  async getQueryWithPaginate(
    userPaload: UserInterface,
    uniqueId: string,
    listQueryParam?: PaginationOptionsInterface,
    filter?: any,
  ) {
    const websiteData = await this.websiteRepository.findOne({
      where: { uniqueId: uniqueId, userId: userPaload.id },
    });

    if (!websiteData) {
      throw new NotFoundException(
        `website id you insert not exist on your storage!!!`,
      );
    }
    await this.checkWebsite(websiteData.websiteUrl);

    const limit: number = listQueryParam.limit ? listQueryParam.limit : 10;
    const page: number = listQueryParam.page
      ? +listQueryParam.page == 1
        ? 0
        : listQueryParam.page
      : 1;
    const client = await this.getClient();

    let data: any;

    if (filter && filter.startDate && filter.endDate) {
      data = await client
        .query('website-monitor')
        .where('method', ['GET', 'POST'])
        .where('status', 200)
        .where('url', websiteData.websiteUrl)
        .where('time', filter.startDate, '>=')
        .where('time', filter.endDate, '<=')
        .then()
        .catch(console.error);
    } else if (filter && filter.date) {
      // const regex = new RegExp(filter.date + '*');
      data = await client
        .query('website-monitor')
        .where('method', ['GET', 'POST'])
        .where('status', 200)
        .where('url', websiteData.websiteUrl)
        .where('time', filter.date + 'T00:00:00.000000000Z', '>=')
        .where('time', filter.date + 'T23:59:00.000000000Z', '<=')
        // .addFunction('count', 'url')
        .then()
        .catch(console.error);
    } else {
      data = await client
        .query('website-monitor')
        .where('method', ['GET', 'POST'])
        .where('status', 200)
        .where('url', websiteData.websiteUrl)
        // .addFunction('order by', 'resTime', 'DESC')
        // .where('time', 'DESC')
        .then()
        .catch(console.error);
    }

    const startIndex = page > 0 ? page * limit - limit : page;

    const endIndex = Number(startIndex) + Number(limit);

    let finalData: any;

    if (data?.results[0].series && data?.results[0].series.length > 0) {
      const valuesData = data?.results[0]?.series[0].values;

      // sorted time data
      const sortedData = valuesData.sort((a, b) => {
        const ab = new Date(a[0]);
        const ba = new Date(b[0]);

        return Number(ba) - Number(ab);
      });

      finalData = data?.results[0]?.series[0];
      delete finalData?.values;
      const values = sortedData.slice(startIndex, endIndex);

      const col = finalData?.columns;
      delete finalData?.columns;

      const result = values.map((row: any) => {
        return col.reduce((obj: any, column: any, index: any) => {
          obj[column] = row[index];
          return obj;
        }, {});
      });

      finalData['values'] = result;
      finalData['total'] = valuesData.length;
      finalData['currentPage'] = +page === 0 ? 1 : +page;
      finalData['limit'] = +limit;

      return finalData;
    } else {
      return {
        values: [],
        total: 0,
        currentPage: +page === 0 ? 1 : +page,
        limit: +limit,
      };
    }
  }

  // single chart data

  async getSingleChartData(
    userPaload: UserInterface,
    uniqueId: string,
    filter: any,
  ) {
    const websiteData = await this.websiteRepository.findOne({
      where: { uniqueId: uniqueId, userId: userPaload.id },
    });

    if (!websiteData) {
      throw new NotFoundException(
        `website id you insert not exist on your storage!!!`,
      );
    }
    await this.checkWebsite(websiteData.websiteUrl);

    const getInfluxData = await this.getQuery(websiteData.websiteUrl);

    const loadData = [];
    const label = [];

    if (filter.filter == 1) {
      getInfluxData?.values?.filter((e, i, arr) => {
        if (new Date(arr[i][0]).getTime() > Date.now() - 24 * 60 * 60 * 1000) {
          const numberLoadData = arr[i][2].split(' ')[0];
          const actualData = Number(numberLoadData);

          if (
            new Date(arr[i][0]).getHours() >= 6 &&
            new Date(arr[i][0]).getHours() <= 12
          ) {
            loadData.push(actualData);
            label.push(`${new Date(arr[i][0]).getHours()} AM`);
          } else if (
            new Date(arr[i][0]).getHours() >= 12 &&
            new Date(arr[i][0]).getHours() <= 18
          ) {
            loadData.push(actualData);
            label.push(`${new Date(arr[i][0]).getHours() - 12} PM`);
          } else if (
            new Date(arr[i][0]).getHours() >= 18 &&
            new Date(arr[i][0]).getHours() <= 24
          ) {
            loadData.push(actualData);
            label.push(`${new Date(arr[i][0]).getHours() - 12} PM`);
          } else if (
            new Date(arr[i][0]).getHours() >= 0 &&
            new Date(arr[i][0]).getHours() <= 6
          ) {
            loadData.push(actualData);
            label.push(`${new Date(arr[i][0]).getHours()} AM`);
          }

          // else {
          //   loadData.push(actualData);
          //   label.push(new Date(arr[i][0]).getHours());

          //   console.log(e, 'vv');
          // }

          // console.log(e, 'ee');

          // loadData.push(actualData);
        }
      });

      // return { loadData: loadData, label: label };
    } else if (filter.filter == 7) {
      getInfluxData?.values?.filter((e, i, arr) => {
        if (
          new Date(arr[i][0]).getTime() >
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ) {
          const numberLoadData = arr[i][2].split(' ')[0];
          const actualData = Number(numberLoadData);

          const date = new Date(`${arr[i][0]}`).toDateString().split(' ');
          const dateFormat = date[0] + ', ' + date[2] + ' ' + date[1];

          if (
            new Date(arr[i][0]).getDay() >= 1 &&
            new Date(arr[i][0]).getDay() <= 2
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 2 &&
            new Date(arr[i][0]).getDay() <= 3
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 3 &&
            new Date(arr[i][0]).getDay() <= 4
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 4 &&
            new Date(arr[i][0]).getDay() <= 5
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 5 &&
            new Date(arr[i][0]).getDay() <= 6
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else {
            loadData.push(actualData);
            label.push(dateFormat);
          }
        }
      });

      // return { loadData: loadData, label: label };
    } else if (filter.filter == 30) {
      getInfluxData?.values?.filter((e, i, arr) => {
        if (
          new Date(arr[i][0]).getTime() >
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ) {
          const numberLoadData = arr[i][2].split(' ')[0];
          const actualData = Number(numberLoadData);

          const date = new Date(`${arr[i][0]}`).toDateString().split(' ');
          const dateFormat = date[0] + ', ' + date[2] + ' ' + date[1];

          if (
            new Date(arr[i][0]).getDay() >= 1 &&
            new Date(arr[i][0]).getDay() <= 5
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 5 &&
            new Date(arr[i][0]).getDay() <= 10
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 10 &&
            new Date(arr[i][0]).getDay() <= 15
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 15 &&
            new Date(arr[i][0]).getDay() <= 20
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 20 &&
            new Date(arr[i][0]).getDay() <= 25
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else {
            loadData.push(actualData);
            label.push(dateFormat);
          }
        }
      });

      // return { loadData: loadData, label: label };
    } else if (filter.filter == '1m') {
      getInfluxData?.values?.filter((e, i, arr) => {
        if (new Date(arr[i][0]).getMonth() == new Date().getMonth() - 1) {
          const numberLoadData = arr[i][2].split(' ')[0];
          const actualData = Number(numberLoadData);

          const date = new Date(`${arr[i][0]}`).toDateString().split(' ');
          const dateFormat = date[0] + ', ' + date[2] + ' ' + date[1];

          if (
            new Date(arr[i][0]).getDate() >= 1 &&
            new Date(arr[i][0]).getDate() <= 5
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 5 &&
            new Date(arr[i][0]).getDay() <= 10
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 10 &&
            new Date(arr[i][0]).getDay() <= 15
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 15 &&
            new Date(arr[i][0]).getDay() <= 20
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else if (
            new Date(arr[i][0]).getDay() >= 20 &&
            new Date(arr[i][0]).getDay() <= 25
          ) {
            loadData.push(actualData);
            label.push(dateFormat);
          } else {
            loadData.push(actualData);
            label.push(dateFormat);
          }
        }
      });
    } else {
      getInfluxData?.values?.filter((e, i, arr) => {
        if (new Date(arr[i][0]).getTime() > Date.now() - 24 * 60 * 60 * 1000) {
          const numberLoadData = arr[i][2].split(' ')[0];
          const actualData = Number(numberLoadData);

          if (
            new Date(arr[i][0]).getHours() >= 6 &&
            new Date(arr[i][0]).getHours() <= 12
          ) {
            loadData.push(actualData);
            label.push(`${new Date(arr[i][0]).getHours()} AM`);
          } else if (
            new Date(arr[i][0]).getHours() >= 12 &&
            new Date(arr[i][0]).getHours() <= 18
          ) {
            loadData.push(actualData);
            label.push(`${new Date(arr[i][0]).getHours() - 12} PM`);
          } else if (
            new Date(arr[i][0]).getHours() >= 18 &&
            new Date(arr[i][0]).getHours() <= 24
          ) {
            loadData.push(actualData);
            label.push(`${new Date(arr[i][0]).getHours() - 12} PM`);
          } else if (
            new Date(arr[i][0]).getHours() >= 0 &&
            new Date(arr[i][0]).getHours() <= 6
          ) {
            loadData.push(actualData);
            label.push(`${new Date(arr[i][0]).getHours()} AM`);
          }

          // else {
          //   loadData.push(actualData);
          //   label.push(new Date(arr[i][0]).getHours());

          //   console.log(e, 'vv');
          // }

          // console.log(e, 'ee');

          // loadData.push(actualData);
        }
      });
    }

    const loadD = [];
    const labelData = await Promise.all(
      label.filter((e, i, arr) => {
        if (label.indexOf(e) == i) {
          loadD.push(loadData[Math.max(i)]);
          return label.indexOf(e) === i;
        }
      }),
    );
    return { load: loadD, labelData: labelData };
  }

  // ___________get latest incident data ________

  // get incident data
  async getIncidentData(
    websiteId: number,
    listQueryParam: PaginationOptionsInterface,
    filter: any,
  ): Promise<Pagination<IncidentEntity>> {
    const limit: number = listQueryParam.limit ? listQueryParam.limit : 10;
    const page: number = listQueryParam.page
      ? +listQueryParam.page == 1
        ? 0
        : listQueryParam.page
      : 1;

    const [results, total] = await this.incidentRepository
      .createQueryBuilder('incident')
      .where(`incident.status = '${StatusField.ACTIVE}'`)
      .andWhere(
        new Brackets((qb) => {
          if (filter && filter.startDate && filter.endDate) {
            qb.andWhere(
              `Date(incident.createdAt) BETWEEN ('${filter.startDate}') AND ('${filter.endDate}')`,
            );
          } else if (filter && filter.date) {
            qb.andWhere(`Date(incident.createdAt) = ('${filter.date}')`);
          }
        }),
      )
      .andWhere(`incident.websiteId = ${websiteId}`)
      .andWhere(`incident.message != ''`)
      .andWhere(`incident.comparisonLimit != ''`)
      .select([
        'incident.id',
        'incident.message',
        'incident.comparison',
        'incident.comparisonLimit',
        'incident.type',
        'incident.websiteId',
        'incident.createdAt',
      ])
      .orderBy('incident.id', 'DESC')
      .take(limit)
      .skip(page > 0 ? page * limit - limit : 0)
      .getManyAndCount();

    return new Pagination<IncidentEntity>({
      results,
      total,
      currentPage: +page === 0 ? 1 : +page,
      limit: +limit,
    });
  }

  // total incident count
  async totalIncidentAndResolveCount(websiteId: number) {
    const totalIncident = await this.incidentRepository
      .createQueryBuilder('incident')
      .where(`incident."websiteId" = '${websiteId}'`)
      .andWhere(`incident."message" != ''`)
      .andWhere(`incident."comparisonLimit" != ''`)
      .getCount();

    const totalResolve = await this.resolveRepository
      .createQueryBuilder('resolve')
      .andWhere(`resolve."websiteId" = '${websiteId}'`)
      .getCount();

    return {
      totalIncident: totalIncident ? totalIncident : 0,
      totalResolve: totalResolve ? totalResolve : 0,
    };
  }

  // delete incident of a website

  async deleteIncident(websiteId: number) {
    const data = await this.incidentRepository.delete({ websiteId: websiteId });

    if (data.affected > 0) {
      return 'deleted successfully!';
    } else {
      throw new BadRequestException(ErrorMessage.DELETE_FAILED);
    }
  }

  // get waiting for resolve data
  async getResolveData(
    websiteId: number,
    listQueryParam: PaginationOptionsInterface,
  ): Promise<Pagination<WebsiteResolveEntity>> {
    const limit: number = listQueryParam.limit ? listQueryParam.limit : 10;
    const page: number = listQueryParam.page
      ? +listQueryParam.page == 1
        ? 0
        : listQueryParam.page
      : 1;

    const [results, total] = await this.resolveRepository
      .createQueryBuilder('resolve')
      .where(`resolve.status = '${StatusField.ACTIVE}'`)
      .andWhere(`resolve.websiteId = ${websiteId}`)
      // .andWhere(`incident.type = '${AlertTypeEnum.RESPONSE_CODE}'`)
      .select([
        'resolve.id',
        'resolve.message',
        'resolve.comparisonLimit',
        'resolve.type',
        'resolve.websiteId',
      ])
      .orderBy('resolve.id', 'DESC')
      .take(limit)
      .skip(page > 0 ? page * limit - limit : 0)
      .getManyAndCount();

    return new Pagination<WebsiteResolveEntity>({
      results,
      total,
      currentPage: +page === 0 ? 1 : +page,
      limit: +limit,
    });
  }

  // total resolve count
  async totalResolveCount(websiteId: number) {
    const totalResolve = await this.resolveRepository
      .createQueryBuilder('resolve')
      .andWhere(`resolve."websiteId" = '${websiteId}'`)
      .getCount();

    return totalResolve ? totalResolve : 0;
  }

  // delete resolve

  async deleteResolve(resolveId: number) {
    const resolveData = await this.resolveRepository.findOne({
      where: { id: resolveId },
    });
    const data = await this.resolveRepository.delete({
      id: resolveId,
    });
    if (data.affected > 0) {
      const updatedData = {
        isOccured: 0,
      };

      await this.incidentRepository.update(
        {
          websiteId: resolveData.websiteId,
          type: AlertTypeEnum.LOAD_TIME,
        },
        updatedData,
      );
      return 'deleted successfully!';
    } else {
      throw new BadRequestException(ErrorMessage.DELETE_FAILED);
    }
  }

  // get unique array of element

  async getUniqueListBy(arr, key) {
    return [...new Map(arr.map((item) => [item[key], item])).values()];
  }
}
