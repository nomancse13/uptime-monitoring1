import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as dnsPromises } from 'dns';
import { decrypt } from 'src/helper/crypto.helper';
import { DateTime } from 'src/helper/date-time-helper';
import { AdminBlacklistServerService } from 'src/modules/admin/blacklist/server.service';
import { PaginationDataDto } from 'src/monitrix-auth/common/dtos';
import { SoftDeleteUniqueDto } from 'src/monitrix-auth/common/dtos/soft-delete-unique.dto';
import {
  ErrorMessage,
  StatusField,
  UserTypesEnum,
  WebsiteAlertStatus,
} from 'src/monitrix-auth/common/enum';
import { Pagination, UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import { ChangeStatusUniqueDto } from 'src/monitrix-auth/utils/dtos/change-status-unique.dto';
import { Brackets } from 'typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { v4 as uuidv4 } from 'uuid';
import { SubscriberUserService } from '../subscriber-user.service';
import { WorkspaceEntity } from '../workspace/entity';
import { CreateBlacklistDto, UpdateBlacklistDto } from './dtos';
import { BlacklistEntity } from './entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
interface Item {
  listed: boolean;
  // other properties of Item
}

const dnsbls = [
  '0.ivmURI',
  'access.redhawk.org',
  'all.rbl.webiron.net',
  'all.spamrats.com',
  'b.barracudacentral.org',
  'bl.blocklist.de',
  'bl.konstant.no',
  'bl.mailspike.net',
  'bl.nosolicitado.org',
  'bl.spamcop.net',
  'bl.spameatingmonkey.net',
  'bl.spamstinks.com',
  'blackholes.five-ten-sg.com',
  'blacklist.woody.ch',
  'bogons.cymru.com',
  'cbl.abuseat.org',
  'cdl.anti-spam.org.cn',
  'combined.abuse.ch',
  'db.wpbl.info',
  'dnsbl-1.uceprotect.net',
  'dnsbl-2.uceprotect.net',
  'dnsbl-3.uceprotect.net',
  'dnsbl.anticaptcha.net',
  'dnsbl.cyberlogic.net',
  'dnsbl.dronebl.org',
  'dnsbl.inps.de',
  'dnsbl.sorbs.net',
  'dnsbl.spfbl.net',
  'dnsbl.zapbl.net',
  'dnsrbl.org',
  'drone.abuse.ch',
  'duinv.aupads.org',
  'dul.dnsbl.sorbs.net',
  'dul.ru',
  'dyna.spamrats.com',
  'dynip.rothen.com',
  'exitnodes.tor.dnsbl.sectoor.de',
  'hostkarma.junkemailfilter.com',
  'http.dnsbl.sorbs.net',
  'ips.backscatterer.org',
  'ix.dnsbl.manitu.net',
  'korea.services.net',
  'misc.dnsbl.sorbs.net',
  'noptr.spamrats.com',
  'ohps.dnsbl.net.au',
  'omrs.dnsbl.net.au',
  'orvedb.aupads.org',
  'osps.dnsbl.net.au',
  'osrs.dnsbl.net.au',
  'owfs.dnsbl.net.au',
  'owps.dnsbl.net.au',
  'pbl.spamhaus.org',
  'phishing.rbl.msrbl.net',
  'probes.dnsbl.net.au',
  'proxies.dnsbl.net.au',
  'proxy.bl.gweep.ca',
  'psbl.surriel.com',
  'rbl.interserver.net',
  'rbl.megarbl.net',
  'rbl.nifty.com',
  'rbl.realtimeblacklist.com',
  'rbl.talkactive.net',
  'rbl2.triumf.ca',
  'relays.bl.gweep.ca',
  'residential.block.transip.nl',
  'ricn.dnsbl.net.au',
  'rmst.dnsbl.net.au',
  'sbl.spamhaus.org',
  'smtp.dnsbl.sorbs.net',
  'socks.dnsbl.sorbs.net',
  'spam.abuse.ch',
  'spam.dnsbl.sorbs.net',
  'spam.rbl.blockedservers.com',
  'spam.spamrats.com',
  'spambot.bls.digibase.ca',
  'spamrbl.imp.ch',
  'spamsources.fabel.dk',
];

const domain = 'm4you555rs.com';

@Injectable()
export class BlacklistService {
  constructor(
    @InjectRepository(BlacklistEntity)
    private readonly blacklistRepository: BaseRepository<BlacklistEntity>,
    private readonly subscriberUserService: SubscriberUserService,
    private readonly adminBlacklistServerService: AdminBlacklistServerService,
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
  // create blacklist
  async createBlacklist(
    createBlacklistDto: CreateBlacklistDto,
    userPayload: UserInterface,
    ipClient: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforAdd(userPayload);
    }
    const checkAllTeamExist = await this.subscriberUserService.checkAllExist(
      createBlacklistDto?.team ?? [],
      userPayload?.id,
    );
    if (
      checkAllTeamExist === true &&
      decrypt(userPayload.hashType) !== UserTypesEnum.TEAMMEMBER
    ) {
      createBlacklistDto['team'] = createBlacklistDto?.team
        ? createBlacklistDto?.team
        : undefined;
    } else {
      throw new BadRequestException(
        'You do not have permission to add others team member',
      );
    }
    const checkValidity = await this.checkUrlHealth(createBlacklistDto.url);

    if (checkValidity == false) {
      throw new BadRequestException(`website url is invalid!`);
    }
    createBlacklistDto['createdBy'] = userPayload.id;
    createBlacklistDto['userId'] = userPayload.id;
    createBlacklistDto['uniqueId'] = uuidv4();

    createBlacklistDto['url'] =
      createBlacklistDto.url?.includes('http') == false
        ? 'http://' + createBlacklistDto.url
        : createBlacklistDto.url;
    const blacklistInfo = await this.checkBlacklists(createBlacklistDto?.url);
    createBlacklistDto['blacklistInfo'] = blacklistInfo;

    const data = await this.blacklistRepository.save(createBlacklistDto);

    if (data) {
      const log = {
        ipAddress: ipClient.ip,
        browser: ipClient.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `new blacklist created`,
          services: {
            tag: 'Blacklist',
            value: data.url,
            identity: data.id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }

    return data;
  }

  // update blacklist

  async updateBlacklist(
    uniqueId: string,
    updateBlacklistDto: UpdateBlacklistDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      await this.subscriberUserService.checkPermissionforAdd(userPayload);
    }
    const checkAllTeamExist = await this.subscriberUserService.checkAllExist(
      updateBlacklistDto?.team ?? [],
      userPayload?.id,
    );
    if (
      checkAllTeamExist === true &&
      decrypt(userPayload.hashType) !== UserTypesEnum.TEAMMEMBER
    ) {
      updateBlacklistDto['team'] = updateBlacklistDto?.team
        ? updateBlacklistDto?.team
        : undefined;
    } else {
      throw new BadRequestException(
        'You do not have permission to add others team member',
      );
    }
    updateBlacklistDto['updatedBy'] = userPayload.id;

    updateBlacklistDto['url'] =
      updateBlacklistDto.url?.includes('http') == false
        ? 'http://' + updateBlacklistDto.url
        : updateBlacklistDto.url;

    const data = await this.blacklistRepository
      .createQueryBuilder('blacklist')
      .update(BlacklistEntity, updateBlacklistDto)
      .where(`uniqueId ='${uniqueId}'`)
      .andWhere(`blacklist."createdBy" = ${userPayload.id}`)
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
          message: `blacklist updated`,
          services: {
            tag: 'Blacklist',
            value: data.raw[0].url,
            identity: data.raw[0].id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }
    return data.raw[0];
  }

  //   get single blacklist

  async getSingleBlacklist(
    uniqueId: string,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const data = await this.blacklistRepository

      .createQueryBuilder('blacklist')
      .leftJoinAndMapOne(
        'blacklist.workspace',
        WorkspaceEntity,
        'workspace',
        `blacklist.groupId = workspace.id`,
      )
      .where('blacklist.uniqueId = :uniqueId', { uniqueId: uniqueId })
      .andWhere('blacklist.createdBy = :createdBy', {
        createdBy: userPayload.id,
      })

      .select([
        'blacklist.status',
        'blacklist.id',
        'blacklist.name',
        'blacklist.url',
        'blacklist.groupId',
        'workspace.name',
        'workspace.id',
        'blacklist.team',
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
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `${data.name} has been fetched`,
          services: {
            tag: 'Blacklist',
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

  //   pagination of blacklist
  async paginateBlacklist(
    paginationDataDto: PaginationDataDto,
    userPayload: UserInterface,
  ) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [results, total] = await this.blacklistRepository
      .createQueryBuilder('blacklist')
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
                    `blacklist.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(blacklist.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .andWhere(`blacklist."createdBy" = ${userPayload.id}`)
      .orderBy(
        `blacklist.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    return new Pagination<BlacklistEntity>({
      results,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  //   delete blacklist data by uniqueId
  async deleteBlacklist(uniqueId: string, userPayload: UserInterface) {
    const data = await this.blacklistRepository.delete({
      uniqueId: uniqueId,
      createdBy: userPayload.id,
    });

    return data.affected > 0
      ? 'Deleted Successfully!'
      : ErrorMessage.DELETE_FAILED;
  }

  // soft delete blacklist

  async softDeleteBlacklist(
    SoftDeleteUniqueDto: SoftDeleteUniqueDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const deletedInfo = {
      deletedAt: new Date(),
      deletedBy: userPayload.id,
      status: StatusField.DELETED,
    };

    const data = await this.blacklistRepository
      .createQueryBuilder()
      .update(BlacklistEntity, deletedInfo)
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
          message: `these Blacklist id you provided successfully deleted softly!`,
          services: {
            tag: 'Blacklist',
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
  // status count

  async getStatusCount(userPayload: UserInterface) {
    const listCount = await this.blacklistRepository
      .createQueryBuilder('list')
      .where(`list."userId" = ${userPayload.id}`)
      .getCount();

    const enableCount = await this.blacklistRepository
      .createQueryBuilder('list')
      .where(`list."userId" = ${userPayload.id}`)
      .andWhere(`list."status" = '${StatusField.ACTIVE}'`)
      .getCount();

    const disableCount = await this.blacklistRepository
      .createQueryBuilder('list')
      .where(`list."userId" = ${userPayload.id}`)
      .andWhere(`list."status" = '${StatusField.INACTIVE}'`)
      .getCount();

    const onlineCount = await this.blacklistRepository
      .createQueryBuilder('list')
      .where(`list."userId" = ${userPayload.id}`)
      .andWhere(`list."alertStatus" = '${WebsiteAlertStatus.UP}'`)
      .getCount();

    const alertCount = await this.blacklistRepository
      .createQueryBuilder('list')
      .where(`list."userId" = ${userPayload.id}`)
      .andWhere(`list."alertStatus" = '${WebsiteAlertStatus.Alert}'`)
      .getCount();

    const offlineCount = await this.blacklistRepository
      .createQueryBuilder('list')
      .where(`list."userId" = ${userPayload.id}`)
      .andWhere(`list."alertStatus" = '${WebsiteAlertStatus.Down}'`)
      .getCount();

    return {
      enable: enableCount,
      disable: disableCount,
      online: onlineCount,
      alert: alertCount,
      offline: offlineCount,
      count: listCount,
    };
  }
  // change status of blacklist
  async blacklistStatusChange(
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

    const data = await this.blacklistRepository
      .createQueryBuilder()
      .update(BlacklistEntity, updatedData)
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

  // get blacklist count by userId

  async blacklistCount(id: number) {
    const countBlacklist = await this.blacklistRepository
      .createQueryBuilder('blacklist')
      .where(`blacklist."userId" = ${id}`)
      .getCount();

    return countBlacklist;
  }

  //   get blacklist details

  async getBlacklistInfo(uniqueId: string, userPayload: UserInterface) {
    const data = await this.blacklistRepository
      .createQueryBuilder('blacklist')
      .where('blacklist.uniqueId = :uniqueId', { uniqueId: uniqueId })
      .andWhere('blacklist.createdBy = :createdBy', {
        createdBy: userPayload.id,
      })

      .select([
        'blacklist.status',
        'blacklist.id',
        'blacklist.name',
        'blacklist.url',
        'blacklist.blacklistInfo',
      ])
      .getOne();

    if (!data) {
      throw new NotFoundException('No data found!');
    } else {
      const blacklistInfo: Item[] = data?.blacklistInfo;
      const listedItems: Item[] =
        blacklistInfo && blacklistInfo.length > 0
          ? blacklistInfo.filter((item) => item.listed === true)
          : [];
      const count: number = listedItems.length;
      data['blocked'] = count;
    }

    return data;
  }

  async checkBlacklists(domain) {
    try {
      const url = domain.replace(
        /^(?:https?:\/\/)?(?:www\.)?([^/]+)\.([^/]+)/,
        '$1.$2',
      );
      const ip = await dnsPromises.lookup(url);
      const results = await Promise.all(
        dnsbls.map(async (list) => {
          const startTime = Date.now();

          try {
            const address = `${ip.address}.${list}`;
            await dnsPromises.lookup(address);
            const responseTime = Date.now() - startTime;
            return {
              blacklist: list,
              address: address,
              listed: true,
              responseTime: responseTime,
            };
          } catch (err) {
            const responseTime = Date.now() - startTime;
            return {
              blacklist: list,
              address: `${ip.address}.${list}`,
              listed: false,
              responseTime: responseTime,
            };
          }
        }),
      );
      return results;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  //cron job for fetch details
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async automatedDomainDetailsFetch() {
    const uniqueDomains: any[] = await this.blacklistRepository
      .createQueryBuilder('domain')
      .select('DISTINCT domain.url', 'url')
      .where('domain.status = :status', { status: 'Active' })
      .getRawMany();
    if (uniqueDomains) {
      for (const item of uniqueDomains) {
        const blacklistInfo = await this.checkBlacklists(item.url);
        item.blacklistInfo = blacklistInfo;
        await this.blacklistRepository
          .createQueryBuilder()
          .update(BlacklistEntity)
          .set({
            blacklistInfo,
          })
          .where(`url = '${item.url}'`)
          .execute();
      }
    }
  }

  // get all blacklist provider

  async getBlacklistProvider() {
    const allProvider =
      await this.adminBlacklistServerService.getAllBlacklistServer();
    return allProvider;
  }
}
