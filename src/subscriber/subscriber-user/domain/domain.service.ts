import {
  BadRequestException,
  forwardRef,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator';

import { InjectRepository } from '@nestjs/typeorm';

import { exec } from 'child_process';
import * as dns from 'dns';
import { decrypt } from 'src/helper/crypto.helper';
import { DateTime } from 'src/helper/date-time-helper';
import {
  PaginationDataDto,
  SoftDeleteDto,
} from 'src/monitrix-auth/common/dtos';
import {
  ErrorMessage,
  StatusField,
  UserTypesEnum,
  WebsiteAlertStatus,
} from 'src/monitrix-auth/common/enum';
import { Pagination, UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import { ChangeStatusDto } from 'src/monitrix-auth/utils/dtos';
import { Brackets } from 'typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { promisify } from 'util';
import { SubscriberUserService } from '../subscriber-user.service';
import { WorkspaceEntity } from '../workspace/entity';
import { CreateDomainDto, UpdateDomainDto } from './dtos';
import { DomainEntity } from './entity';
import { Cron, CronExpression } from '@nestjs/schedule';
// import dns  from 'dns-socket';
import axios from 'axios';
import { HttpService } from '@nestjs/axios/dist';
const DnsSocket = require('dns-socket');

const whois = require('whois');
const lookup = promisify(whois.lookup);

@Injectable()
export class DomainService {
  constructor(
    @InjectRepository(DomainEntity)
    private readonly domainRepository: BaseRepository<DomainEntity>,
    @Inject(forwardRef(() => SubscriberUserService))
    private readonly subscriberUserService: SubscriberUserService,
    private httpService: HttpService,
  ) {}
  private readonly dnsResolveAny = promisify(dns.resolveAny);

  //  check url health
  async checkUrlHealth(url: string): Promise<boolean> {
    try {
      const response = await this.httpService.get(url).toPromise();

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return false;
    }
  }

  //   create domain
  async createDomain(
    createDomainDto: CreateDomainDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforAdd(userPayload);
    }
    const checkAllTeamExist = await this.subscriberUserService.checkAllExist(
      createDomainDto?.team ?? [],
      userPayload?.id,
    );
    const checkValidity = await this.checkUrlHealth(createDomainDto.domainUrl);

    if (checkValidity == false) {
      throw new BadRequestException(`website url is invalid!`);
    }
    createDomainDto['createdBy'] = userPayload.id;

    createDomainDto['userId'] = userPayload.id;

    createDomainDto['domainUrl'] =
      createDomainDto.domainUrl?.includes('http') == false
        ? 'http://' + createDomainDto.domainUrl
        : createDomainDto.domainUrl;
    if (
      checkAllTeamExist === true &&
      decrypt(userPayload.hashType) !== UserTypesEnum.TEAMMEMBER
    ) {
      createDomainDto['team'] = createDomainDto?.team ?? [];
    } else {
      throw new BadRequestException(
        'You do not have permission to add others team member',
      );
    }
    const details = await this.domainInfo(createDomainDto?.domainUrl);
    const dnsRecords = await this.resolveDomain(createDomainDto?.domainUrl);
    const nameServers = await this.getNameServers(createDomainDto?.domainUrl);

    createDomainDto['nameServers'] = nameServers;
    createDomainDto['details'] = details;
    createDomainDto['dnsRecords'] = dnsRecords;
    createDomainDto['expireAt'] =
      details?.registrar_registration_expiration_date ?? undefined;
    createDomainDto['registeredOn'] = details?.creation_date ?? undefined;
    createDomainDto['updatedOn'] = details?.updated_date ?? undefined;

    const data = await this.domainRepository.save(createDomainDto);

    if (data) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `new domain created by ${decrypt(userPayload.hashType)}`,
          services: {
            tag: 'Domain',
            value: data.domainUrl,
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
    const domainCount = await this.domainRepository
      .createQueryBuilder('domain')
      .where(`domain."userId" = ${userPayload.id}`)
      .getCount();

    const enableCount = await this.domainRepository
      .createQueryBuilder('domain')
      .where(`domain."userId" = ${userPayload.id}`)
      .andWhere(`domain."status" = '${StatusField.ACTIVE}'`)
      .getCount();

    const disableCount = await this.domainRepository
      .createQueryBuilder('domain')
      .where(`domain."userId" = ${userPayload.id}`)
      .andWhere(`domain."status" = '${StatusField.INACTIVE}'`)
      .getCount();

    const onlineCount = await this.domainRepository
      .createQueryBuilder('domain')
      .where(`domain."userId" = ${userPayload.id}`)
      .andWhere(`domain."alertStatus" = '${WebsiteAlertStatus.UP}'`)
      .getCount();

    const alertCount = await this.domainRepository
      .createQueryBuilder('domain')
      .where(`domain."userId" = ${userPayload.id}`)
      .andWhere(`domain."alertStatus" = '${WebsiteAlertStatus.Alert}'`)
      .getCount();

    const offlineCount = await this.domainRepository
      .createQueryBuilder('domain')
      .where(`domain."userId" = ${userPayload.id}`)
      .andWhere(`domain."alertStatus" = '${WebsiteAlertStatus.Down}'`)
      .getCount();

    return {
      enable: enableCount,
      disable: disableCount,
      online: onlineCount,
      alert: alertCount,
      offline: offlineCount,
      count: domainCount,
    };
  }

  //   update a domain

  async updateDomain(
    id: number,
    userPayload: UserInterface,
    updateDomainDto: UpdateDomainDto,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforEdit(userPayload);
    }
    const checkAllTeamExist = await this.subscriberUserService.checkAllExist(
      updateDomainDto?.team ?? [],
      userPayload?.id,
    );
    if (
      checkAllTeamExist === true &&
      decrypt(userPayload.hashType) !== UserTypesEnum.TEAMMEMBER
    ) {
      updateDomainDto['team'] = updateDomainDto?.team ?? [];
    } else {
      throw new BadRequestException(
        'You do not have permission to add others team member',
      );
    }
    updateDomainDto['updatedBy'] = userPayload.id;

    const domainCollect = await this.domainRepository.findOne({
      where: { id: id },
    });

    updateDomainDto['domainUrl'] = updateDomainDto.domainUrl
      ? updateDomainDto.domainUrl?.includes('http') == false
        ? 'http://' + updateDomainDto.domainUrl
        : updateDomainDto.domainUrl
      : domainCollect.domainUrl;

    const finalData = await this.domainRepository
      .createQueryBuilder()
      .update(DomainEntity, updateDomainDto)
      .where(`id = ${id}`)
      .andWhere(`createdBy = ${userPayload.id}`)
      .returning('*')
      .execute();
    if (!finalData) {
      throw new NotFoundException(ErrorMessage.UPDATE_FAILED);
    }
    if (finalData) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `Domain updated by ${decrypt(userPayload.hashType)}`,
          services: {
            tag: 'Domain',
            value: finalData.raw[0].domainUrl,
            identity: id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }
    return finalData.raw[0];
  }

  //   get single domain

  async singleDomain(id: number, userPayload: UserInterface) {
    const data = await this.domainRepository
      .createQueryBuilder('domains')
      .leftJoinAndMapOne(
        'domains.workspace',
        WorkspaceEntity,
        'workspace',
        `domains.groupId = workspace.id`,
      )
      .where('domains.id = :id', { id: id })
      .andWhere('domains.createdBy = :createdBy', { createdBy: userPayload.id })

      .select([
        'domains.status',
        'domains.id',
        'domains.name',
        'domains.domainUrl',
        'domains.frequencyType',
        'domains.groupId',
        'workspace.name',
        'workspace.id',
        'domains.alertBeforeExpiration',
        'domains.team',
      ])
      .getOne();
    if (data?.team && data?.team?.length > 0) {
      const teamInfo = await this.subscriberUserService.getTeamInfoByIds(
        data?.team,
      );
      data['teamDetails'] = teamInfo;
    }

    if (data) {
      // workspace data structured
      if (data?.workspace == null) {
        data['workspace'] = null;
      } else {
        data['workspace']['label'] = data?.workspace?.name;
        delete data?.workspace?.name;

        data['workspace']['value'] = data?.workspace?.id;
        delete data?.workspace?.id;
      }
    }
    if (!data) {
      throw new NotFoundException('No data found!');
    }
    return data;
  }
  //   get single domain details

  async singleDomainDetails(id: number, userPayload: UserInterface) {
    const data = await this.domainRepository
      .createQueryBuilder('domains')

      .where('domains.id = :id', { id: id })
      .andWhere('domains.createdBy = :createdBy', { createdBy: userPayload.id })

      .select([
        'domains.status',
        'domains.id',
        'domains.name',
        'domains.domainUrl',
        'domains.expireAt',
        'domains.alertStatus',
        'domains.registeredOn',
        'domains.dnsRecords',
        'domains.nameServers',
      ])
      .getOne();
    if (!data) {
      throw new NotFoundException('No data found!');
    }
    if (Object.keys(data?.dnsRecords).length !== 0) {
      const flattened = Object.values(data?.dnsRecords)
        .flat()
        .map((record: any) => record.type);

      data['totalDns'] = flattened.length;
    } else {
      data['totalDns'] = 0;
    }

    return data;
  }

  // change status of domain
  async domainStatusChange(
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

    const data = await this.domainRepository
      .createQueryBuilder()
      .update(DomainEntity, updatedData)
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

  //   paginate domain data

  async paginateDomain(
    paginationDataDto: PaginationDataDto,
    userPayload: UserInterface,
  ) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [results, total] = await this.domainRepository
      .createQueryBuilder('domain')
      .select([
        'domain.id',
        'domain.status',
        'domain.name',
        'domain.domainUrl',
        'domain.frequencyType',
        'domain.alertStatus',
        'domain.registeredOn',
        'domain.expireAt',
        'domain.updatedOn',
      ])
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
                    `domain.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(domain.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .andWhere(`domain."createdBy" = ${userPayload.id}`)
      .orderBy(
        `domain.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    return new Pagination<DomainEntity>({
      results,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  //   delete domain with id

  async deleteDomain(id: number, userPayload: UserInterface) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforDelete(userPayload);
    }
    const data = await this.domainRepository.delete({
      id: id,
      createdBy: userPayload.id,
    });
    return data.affected > 0
      ? 'Deleted Successfully!'
      : ErrorMessage.DELETE_FAILED;
  }

  // soft delete domain

  async softDeleteDomain(
    softDeleteDto: SoftDeleteDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const deletedInfo = {
      deletedAt: new Date(),
      deletedBy: userPayload.id,
      status: StatusField.DELETED,
    };

    const data = await this.domainRepository
      .createQueryBuilder()
      .update(DomainEntity, deletedInfo)
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
          message: `these domain id you provided successfully deleted softly!`,
          services: {
            tag: 'Domain',
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

  async domainCount(id: number) {
    const countDomain = await this.domainRepository
      .createQueryBuilder('domain')
      .where(`domain."userId" = ${id}`)
      .getCount();

    return countDomain;
  }

  // get domain info

  async domainInfo(url: string) {
    const domainName = url.replace(
      /^(?:https?:\/\/)?(?:www\.)?([^/]+)\.([^/]+)/,
      '$1.$2',
    );
    const domainInfo = await lookup(domainName, { follow: 1 });
    const lines = domainInfo.split('\n');
    const parsedData: { [key: string]: any } = {};
    let currentKey = '';
    for (let line of lines) {
      line = line.trim();
      if (line === '') continue;
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1]
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        const value = match[2];
        if (key === 'Registrar') {
          parsedData[key] = {};
          const registrarFields = value.split(',').map((field) => field.trim());
          for (const registrarField of registrarFields) {
            const fieldMatch = registrarField.match(/^([^:]+):\s*(.*)$/);
            if (fieldMatch) {
              const fieldKey = fieldMatch[1]
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
              const fieldValue = fieldMatch[2];
              parsedData[key][fieldKey] = fieldValue;
            }
          }
        } else if (key === 'Registrant' || key === 'Admin' || key === 'Tech') {
          parsedData[key.toLowerCase()] = {};
          const contactFields = value.split('\n').map((field) => field.trim());
          for (const contactField of contactFields) {
            const fieldMatch = contactField.match(/^([^:]+):\s*(.*)$/);
            if (fieldMatch) {
              const fieldKey = fieldMatch[1]
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
              const fieldValue = fieldMatch[2];
              parsedData[key.toLowerCase()][fieldKey] = fieldValue;
            }
          }
        } else if (key === 'Name Server') {
          parsedData[key.replace(/ /g, '_').toLowerCase()] = value
            .split('\n')
            .map((ns) => ns.trim());
        } else {
          parsedData[key.replace(/ /g, '_').toLowerCase()] = value;
        }
        currentKey = key;
      } else {
        parsedData[currentKey] += ` ${line}`;
      }
    }
    return parsedData;
  }

  async setDnsServers(dnsServers: string[]): Promise<void> {
    const command = `networksetup -setdnsservers Wi-Fi ${dnsServers.join(' ')}`;
    const data = await new Promise<void>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    return data;
  }

  async resolveDomainFromGoogle(
    domain: string,
    types: string[],
  ): Promise<any[]> {
    const urls = types.map(
      (recordType) =>
        `https://dns.google/resolve?name=${domain}&type=${recordType}&cd=0`,
    );

    try {
      const responses = await Promise.all(urls.map((url) => axios.get(url)));

      const records = responses.reduce(
        (allRecords, response) => allRecords.concat(response.data.Answer),
        [],
      );
      const filteredData = records.filter((item) => item !== undefined);

      const filtered = function changeType(data: any[]): any[] {
        return data.map((item) => {
          switch (item.type) {
            case 1:
              return {
                type: 'A',
                address: item.data,
                ttl: item.TTL,
              };
            case 2:
              return {
                type: 'NS',
                value: item.data,
                ttl: item.TTL,
              };
            case 6:
              const [
                nsname,
                hostmaster,
                serial,
                refresh,
                retry,
                expire,
                minttl,
              ] = item.data.split(' ');
              return {
                type: 'SOA',
                nsname,
                hostmaster,
                serial,
                refresh,
                retry,
                expire,
                minttl,
                ttl: item.TTL,
              };
            case 15:
              const [priority, exchange] = item.data.split(' ');
              return {
                type: 'MX',
                exchange,
                priority,
                ttl: item.TTL,
              };
            case 16:
              return {
                type: 'TXT',
                entries: [item.data],
                ttl: item.TTL,
              };
            case 28:
              return {
                type: 'AAAA',
                address: item.data,
                ttl: item.TTL,
              };
            case 257:
              const [, critical, issue] = item.data.match(
                /(\d+) issue "([^"]+)"/,
              );
              return {
                type: 'CAA',
                critical,
                issue,
                ttl: item.TTL,
              };
            default:
              return item;
          }
        });
      };

      const datas = filtered(filteredData);
      return datas;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async resolveDomain(url: string): Promise<any> {
    const domain = url.match(
      /^(?:https?:\/\/)?(?:www\.)?([^/]+)\.[^/.]+$/i,
    )?.[1];
    if (!domain) {
      return {};
    }
    try {
      const ips = await this.dnsResolveAny(domain);
      if (ips.length > 0) {
        const datas = this.resolveDomainFromGoogle(domain, [
          'A',
          'AAAA',
          'CAA',
          'MX',
          'NS',
          'SOA',
          'TXT',
        ]);
        return datas;
      }

      return ips;
    } catch (error) {
      console.warn(`Failed to resolve domain ${domain}: ${error}`);
      return {};
    }
  }
  async getNameServers(url: string): Promise<string[]> {
    const domain = url.match(
      /^(?:https?:\/\/)?(?:www\.)?([^/]+)\.[^/.]+$/i,
    )?.[1];
    const resolveNs = promisify(dns.resolveNs);
    try {
      const nameServers = await resolveNs(domain);
      // if (nameServers.length === 0) {
      // const NSData = this.resolveDomainFromGoogle(domain, ['SOA']);

      // console.log(NSData);
      // }

      // return NSData;
      return nameServers;
    } catch (error) {
      console.error(`Failed to resolve name servers for ${domain}: ${error}`);
      return [];
    }
  }

  //get domain details
  async updateDomainDetails() {
    const uniqueDomains: any[] = await this.domainRepository
      .createQueryBuilder('domain')
      .select('DISTINCT domain.domainUrl', 'domainUrl')
      .where('domain.status = :status', { status: 'Active' })
      .getRawMany();

    if (uniqueDomains) {
      for (const item of uniqueDomains) {
        const details = await this.domainInfo(item.domainUrl);
        item.details = details;
        const dnsRecords = await this.resolveDomain(item.domainUrl);
        item.dnsRecords = dnsRecords;
        const nameServers = await this.getNameServers(item.domainUrl);
        item.nameServers = nameServers;
        await this.domainRepository
          .createQueryBuilder()
          .update(DomainEntity)
          .set({
            nameServers,
            details,
            dnsRecords,
            expireAt:
              details?.registrar_registration_expiration_date ?? undefined,
            registeredOn: details?.creation_date ?? undefined,
            updatedOn: details?.updated_date ?? undefined,
          })
          .where(`domainUrl = '${item.domainUrl}'`)
          .execute();
      }
    }
  }

  //domain alert
  async updateDomainAlert() {
    const domainDetails: any[] = await this.domainRepository
      .createQueryBuilder('details')
      .select([
        'details.id',
        'details.alertBeforeExpiration',
        'details.expireAt',
      ])
      .where('details.status = :status', { status: 'Active' })
      .getRawMany();

    if (domainDetails) {
      for (const item of domainDetails) {
        let alertStatus: string;
        const date1 = new Date();
        const date2 = new Date(item?.details_expireAt);
        const diffInDays = Math.floor(
          (date2.getTime() - date1.getTime()) / (1000 * 3600 * 24),
        );

        if (diffInDays > item?.details_alertBeforeExpiration) {
          alertStatus = 'up';
        } else if (
          diffInDays < item?.details_alertBeforeExpiration &&
          diffInDays > 0
        ) {
          alertStatus = 'alert';
        } else {
          alertStatus = 'down';
        }
        await this.domainRepository
          .createQueryBuilder()
          .update(DomainEntity)
          .set({
            alertStatus,
          })
          .where(`id = '${item.details_id}'`)
          .execute();
      }
    }
  }
  //cron job for fetch details
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async automatedDomainDetailsFetch() {
    await this.updateDomainDetails();
    await this.updateDomainAlert();
  }

  //cron job for set dns servers
  //   @Cron(CronExpression.EVERY_10_SECONDS)
  //   async setDns() {
  //     await this.setDnsServers(['1.1.1.1', '1.0.0.1']);
  //   }
}
