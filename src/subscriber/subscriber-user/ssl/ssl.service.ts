import {
  BadRequestException,
  forwardRef,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common/decorators';
import { InjectRepository } from '@nestjs/typeorm';
import * as Influx from 'influxdb-nodejs';
import { isValidHttpUrl } from 'src/helper/common.helper';
import { decrypt } from 'src/helper/crypto.helper';
import { DateTime } from 'src/helper/date-time-helper';
import { ServerEntity } from 'src/modules/admin/server/entity';
import { PaginationDataDto } from 'src/monitrix-auth/common/dtos';
import { SoftDeleteUniqueDto } from 'src/monitrix-auth/common/dtos/soft-delete-unique.dto';
import {
  ErrorMessage,
  StatusField,
  UserTypesEnum,
} from 'src/monitrix-auth/common/enum';
import {
  Pagination,
  PaginationOptionsInterface,
  UserInterface,
} from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import { ChangeStatusUniqueDto } from 'src/monitrix-auth/utils/dtos/change-status-unique.dto';
import { Brackets } from 'typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { v4 as uuidv4 } from 'uuid';
import { SubscriberUserService } from '../subscriber-user.service';
import { WebsiteService } from '../website';
import { WorkspaceEntity } from '../workspace/entity';
import { CreateSSLDto, UpdateSSLDto } from './dto';
import { SSLEntity } from './entity';

@Injectable()
export class SSLService {
  constructor(
    @InjectRepository(SSLEntity)
    private readonly sslRepository: BaseRepository<SSLEntity>,
    @Inject(forwardRef(() => SubscriberUserService))
    private readonly subscriberUserService: SubscriberUserService,
    private readonly websiteService: WebsiteService,
  ) {}

  //   create ssl

  async createSSL(
    createSSLDto: CreateSSLDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforAdd(userPayload);
    }
    const checkAllTeamExist = await this.subscriberUserService.checkAllExist(
      createSSLDto?.team ?? [],
      userPayload?.id,
    );

    if (
      checkAllTeamExist === true &&
      decrypt(userPayload.hashType) !== UserTypesEnum.TEAMMEMBER
    ) {
      createSSLDto['team'] = createSSLDto?.team ?? [];
    } else {
      throw new BadRequestException('Team member not found');
    }

    const checkValidity = await this.websiteService.checkUrlHealth(
      createSSLDto.url,
    );

    if (checkValidity == false) {
      throw new BadRequestException(`website url is invalid!`);
    }
    if (!isValidHttpUrl(createSSLDto.url)) {
      throw new BadRequestException(
        `ssl url is invalid! simply add "http://" or "https://" to the beginning of the URL`,
      );
    }
    createSSLDto['createdBy'] = userPayload.id;
    createSSLDto['userId'] = userPayload.id;
    createSSLDto['uniqueId'] = uuidv4();

    const data = await this.sslRepository.save(createSSLDto);

    if (data) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `new ssl created`,
          services: {
            tag: 'SSL',
            value: data.url,
            identity: data.id,
          },
        },
      };
      await this.subscriberUserService.activityLog(log);
    }

    return data;
  }

  // status count

  async getStatusCount(userPayload: UserInterface) {
    const certificatesCount = await this.sslRepository
      .createQueryBuilder('ssl')
      .where(`ssl."userId" = ${userPayload.id}`)
      .getCount();

    const validCount = await this.sslRepository
      .createQueryBuilder('ssl')
      .where(`ssl."userId" = ${userPayload.id}`)
      .andWhere(`ssl."validUntil" >= '${new Date().getTime()}'`)
      .getCount();

    const inactiveCount = await this.sslRepository
      .createQueryBuilder('ssl')
      .where(`ssl."userId" = ${userPayload.id}`)
      .andWhere(`ssl."status" = '${StatusField.INACTIVE}'`)
      .getCount();

    const expiredCount = await this.sslRepository
      .createQueryBuilder('ssl')
      .where(`ssl."userId" = ${userPayload.id}`)
      .andWhere(`ssl."validUntil" < '${new Date().getTime()}'`)
      .getCount();

    const expiringSoonCount = await this.sslRepository
      .createQueryBuilder('ssl')
      .where(`ssl."userId" = ${userPayload.id}`)
      .andWhere(`ssl."expiringDays" > '${0}'`)
      .andWhere(`ssl."expiringDays" < '${15}'`)
      .getCount();

    return {
      valid: validCount,
      inactive: inactiveCount,
      expired: expiredCount,
      expiringSoon: expiringSoonCount,
      certificates: certificatesCount,
    };
  }

  //   update ssl

  async updateSSL(
    uniqueId: string,
    updateSSLDto: UpdateSSLDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforAdd(userPayload);
    }
    const checkAllTeamExist = await this.subscriberUserService.checkAllExist(
      updateSSLDto?.team ?? [],
      userPayload?.id,
    );
    if (
      checkAllTeamExist === true &&
      decrypt(userPayload.hashType) !== UserTypesEnum.TEAMMEMBER
    ) {
      updateSSLDto['team'] = updateSSLDto?.team
        ? updateSSLDto?.team
        : undefined;
    } else {
      throw new BadRequestException(
        'You do not have permission to add others team member',
      );
    }
    updateSSLDto['updatedBy'] = userPayload.id;

    if (updateSSLDto.url && !isValidHttpUrl(updateSSLDto.url)) {
      throw new BadRequestException(
        `ssl url is invalid! simply add "http://" or "https://" to the beginning of the URL`,
      );
    }

    const checkValidity = await this.websiteService.checkUrlHealth(
      updateSSLDto.url,
    );

    if (checkValidity == false) {
      throw new BadRequestException(`website url is invalid!`);
    }

    const data = await this.sslRepository
      .createQueryBuilder()
      .update(SSLEntity, updateSSLDto)
      .where(`uniqueId ='${uniqueId}'`)
      .andWhere(`createdBy = ${userPayload.id}`)
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
          message: `ssl updated`,
          services: {
            tag: 'SSL',
            value: data.raw[0].url,
            identity: data.raw[0].id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }

    return data.raw[0];
  }

  //   get single ssl
  async getSingleSSL(
    uniqueId: string,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const data: any = await this.sslRepository
      .createQueryBuilder('ssl')
      .leftJoinAndMapOne(
        'ssl.workspace',
        WorkspaceEntity,
        'workspace',
        `ssl.groupId = workspace.id`,
      )
      .leftJoinAndMapOne(
        'ssl.location',
        ServerEntity,
        'location',
        `ssl.locationId = location.id`,
      )
      .where('ssl.uniqueId = :uniqueId', { uniqueId: uniqueId })
      .andWhere('ssl.createdBy = :createdBy', { createdBy: userPayload.id })

      .select([
        'ssl.status',
        'ssl.id',
        'ssl.name',
        'ssl.url',
        'ssl.groupId',
        'ssl.frequency',
        'ssl.alertBeforeExpiration',
        'workspace.name',
        'workspace.id',
        'ssl.team',
        'location.countryName',
        'location.id',
      ])
      .getOne();

    if (data?.team && data?.team?.length > 0) {
      const teamInfo = await this.subscriberUserService.getTeamInfoByIds(
        data?.team,
      );
      data['teamDetails'] = teamInfo;
    }

    if (data) {
      const getInfluxData = await this.getQueryWithPaginate(
        userPayload,
        uniqueId,
      );

      if (getInfluxData && getInfluxData.values) {
        data['startTime'] = getInfluxData.values[0].time;
        data['authorizationError'] = getInfluxData.values[0].authorizationError;
        data['bits'] = getInfluxData.values[0].bits;
        data['result'] = getInfluxData.values[0].statusMsg;
      } else {
        data['startTime'] = null;
        data['bits'] = null;
        data['result'] = null;
      }

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
      if (data?.workspace == null) {
        data['workspace'] = null;
      } else {
        data['workspace']['label'] = data?.workspace?.name;
        delete data?.workspace?.name;

        data['workspace']['value'] = data?.workspace?.id;
        delete data?.workspace?.id;
      }
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `${data.name} has been fetched`,
          services: {
            tag: 'SSL',
            value: data.url,
            identity: data.id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }
    if (!data) {
      throw new NotFoundException('No data found!');
    }

    return data;
  }

  //   get all ssl with pagination

  async getAllSSL(
    paginationDataDto: PaginationDataDto,
    userPayload: UserInterface,
  ) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [results, total] = await this.sslRepository
      .createQueryBuilder('ssl')
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
                    `ssl.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(ssl.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .andWhere(`ssl."createdBy" = ${userPayload.id}`)
      .orderBy(
        `ssl.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    const result = await Promise.all(
      results.map(async (e) => {
        const getInfluxData = await this.getQueryWithPaginate(
          userPayload,
          e.uniqueId,
        );

        return {
          ...e,
          validFrom: getInfluxData.values[0]?.valid_from
            ? getInfluxData.values[0]?.valid_from
            : null,
          validTo: getInfluxData.values[0]?.valid_to
            ? getInfluxData.values[0]?.valid_to
            : null,
        };
      }),
    );

    return new Pagination<SSLEntity>({
      results: result,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  // get query from influx db
  async getQuery(url: string) {
    await this.checkSsl(url);
    const client = await this.getClient();

    const data = await client
      .query('ssl-monitor')
      .where('method', ['GET', 'POST'])
      .where('url', url)
      .then()
      .catch(console.error);

    return data?.results[0].series && data?.results[0].series.length > 0
      ? data?.results[0]?.series[0]
      : {};
  }

  //   delete ssl by id

  async deleteSSL(uniqueId: string, userPayload: UserInterface) {
    const data = await this.sslRepository.delete({
      uniqueId: uniqueId,
      createdBy: userPayload.id,
    });
    return data.affected > 0
      ? `Deleted Successfully!`
      : ErrorMessage.DELETE_FAILED;
  }

  // soft delete ssl
  async softDeleteSSL(
    SoftDeleteUniqueDto: SoftDeleteUniqueDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const updatedData = {
      deletedAt: new Date(),
      deletedBy: userPayload.id,
      status: StatusField.DELETED,
    };

    const data = await this.sslRepository
      .createQueryBuilder()
      .update(SSLEntity, updatedData)
      .where('uniqueId IN (:...uniqueIds)', {
        uniqueIds: SoftDeleteUniqueDto.uniqueIds,
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
          message: `these ssl id you provided successfully deleted softly!`,
          services: {
            tag: 'SSL',
            identity: 200,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }

    return data.affected
      ? 'soft deleted successfully!'
      : ErrorMessage.DELETE_FAILED;
  }

  // change status of ssl
  async sslStatusChange(
    ChangeStatusUniqueDto: ChangeStatusUniqueDto,
    userPayload: UserInterface,
  ) {
    let updatedData: any;
    if (ChangeStatusUniqueDto.status === StatusField.DELETED) {
      updatedData = {
        deletedBy: userPayload.id,
        deletedAt: new Date(),
        updatedBy: null,
        status: ChangeStatusUniqueDto.status,
      };
    } else if (ChangeStatusUniqueDto.status === StatusField.ACTIVE) {
      updatedData = {
        deletedBy: userPayload.id,
        deletedAt: null,
        updatedBy: null,
        status: ChangeStatusUniqueDto.status,
      };
    } else {
      updatedData = {
        deletedAt: null,
        deletedBy: null,
        updatedBy: userPayload.id,
        status: ChangeStatusUniqueDto.status,
      };
    }

    const data = await this.sslRepository
      .createQueryBuilder()
      .update(SSLEntity, updatedData)
      .andWhere('uniqueId IN(:...uniqueIds)', {
        uniqueIds: ChangeStatusUniqueDto.uniqueIds,
      })
      .returning('*')
      .execute();

    if (data.affected === 0) {
      throw new BadRequestException(ErrorMessage.UPDATE_FAILED);
    }

    return data.raw;
  }

  // get ssl count by userId

  async sslCount(id: number) {
    const countSsl = await this.sslRepository
      .createQueryBuilder('ssl')
      .where(`ssl."userId" = ${id}`)
      .getCount();

    return countSsl;
  }

  // connection with influx
  async getClient() {
    const client = new Influx(
      'http://monitrixinflux:influx[2023]!@dev.monitrix.online:8086/monitrix_db?auth=basic',
    );
    return client;
  }

  // ssl checking
  async checkSsl(url: string) {
    const sslData = await this.sslRepository.findOne({
      where: { url: url },
    });
    if (!sslData) {
      throw new BadRequestException(`ssl url not matched!`);
    } else {
      return sslData;
    }
  }

  // get ssl data from influx
  async getQueryWithPaginate(
    userPaload: UserInterface,
    uniqueId: string,
    listQueryParam?: PaginationOptionsInterface,
    filter?: any,
  ) {
    const sslData = await this.sslRepository.findOne({
      where: { uniqueId: uniqueId, userId: userPaload.id },
    });

    if (!sslData) {
      throw new NotFoundException(
        `ssl id you insert not exist on your storage!!!`,
      );
    }
    await this.checkSsl(sslData.url);

    const limit: number =
      listQueryParam && listQueryParam.limit ? listQueryParam.limit : 10;
    const page: number =
      listQueryParam && listQueryParam.page
        ? +listQueryParam.page == 1
          ? 0
          : listQueryParam.page
        : 1;
    const client = await this.getClient();

    let data: any;

    if (filter && filter.startDate && filter.endDate) {
      data = await client
        .query('ssl-monitor')
        .where('method', ['GET', 'POST'])
        // .where('status', 200)
        .where('url', sslData.url)
        .where('time', filter.startDate, '>=')
        .where('time', filter.endDate, '<=')
        .then()
        .catch(console.error);
    } else if (filter && filter.date) {
      // const regex = new RegExp(filter.date + '*');
      data = await client
        .query('ssl-monitor')
        .where('method', ['GET', 'POST'])
        // .where('status', 200)
        .where('url', sslData.url)
        .where('time', filter.date + 'T00:00:00.000000000Z', '>=')
        .where('time', filter.date + 'T23:59:00.000000000Z', '<=')
        // .addFunction('count', 'url')
        .then()
        .catch(console.error);
    } else {
      data = await client
        .query('ssl-monitor')
        .where('method', ['GET', 'POST'])
        // .where('status', 200)
        .where('url', sslData.url)
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
}
