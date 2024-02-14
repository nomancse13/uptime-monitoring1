import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'src/helper/date-time-helper';
import {
  PaginationDataDto,
  SoftDeleteDto,
} from 'src/monitrix-auth/common/dtos';
import {
  ErrorMessage,
  StatusField,
  UserTypesEnum,
} from 'src/monitrix-auth/common/enum';
import { Pagination, UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import { Brackets } from 'typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { SubscriberUserService } from '../subscriber-user.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';
import { WorkspaceEntity } from './entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: BaseRepository<WorkspaceEntity>,
    @Inject(forwardRef(() => SubscriberUserService))
    private readonly subscriberUserService: SubscriberUserService,
  ) {}

  //   create work space
  async createWorkspace(
    createWorkspaceDto: CreateWorkspaceDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const userData = await this.subscriberUserService.findUserById(
      userPayload.id,
    );
    createWorkspaceDto['createdBy'] = userPayload.id;
    if (userData.userType === UserTypesEnum.TEAMMEMBER) {
      createWorkspaceDto['userId'] = userData.parentId;
    } else {
      createWorkspaceDto['userId'] = userData.id;
    }
    const data = await this.workspaceRepository.save(createWorkspaceDto);

    if (data) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `new workspace created`,
          services: {
            tag: 'Workspace',
            value: data.name,
            identity: data.id,
          },
        },
      };
      await this.subscriberUserService.activityLog(log);
    }
    return data;
  }

  //   update work space

  async updateWorkspace(
    id: number,
    updateWorkspaceDto: UpdateWorkspaceDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const userData = await this.subscriberUserService.findUserById(
      userPayload.id,
    );
    const updateData = {
      name: updateWorkspaceDto.name ?? null,
    };

    if (userData.userType === UserTypesEnum.TEAMMEMBER) {
      updateData['userId'] = userData.parentId;
    } else {
      updateData['userId'] = userData.id;
    }

    // const data = await this.workspaceRepository.update(
    //   { id: id, createdBy: userPayload.id },
    //   updateData,
    // );

    const finalData = await this.workspaceRepository
      .createQueryBuilder()
      .update(WorkspaceEntity, updateData)
      .where(`id = '${id}'`)
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
          message: `Workspace updated`,
          services: {
            tag: 'Workspace',
            value: finalData.raw[0].name,
            identity: id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }

    return finalData.raw[0];
  }

  //   get workspace by id
  async getSingleWorkspace(
    id: number,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const data = await this.workspaceRepository.findOne({
      where: { id: id, createdBy: userPayload.id },
    });

    if (data) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `${data.name} has been fetched`,
          services: {
            tag: 'Workspace',
            value: data.name,
            identity: data.id,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }
    return data;
  }

  //   paginate workspace

  async paginateWorkspace(
    paginationDataDto: PaginationDataDto,
    userPayload: UserInterface,
  ) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [results, total] = await this.workspaceRepository
      .createQueryBuilder('workspace')
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
                    `workspace.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(workspace.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .andWhere(`workspace."createdBy" = ${userPayload.id}`)
      .orderBy(
        `workspace.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    return new Pagination<WorkspaceEntity>({
      results,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  // delete workspace
  async deleteWorkspace(id: number, userPayload: UserInterface) {
    const data = await this.workspaceRepository.delete({
      id: id,
      createdBy: userPayload.id,
    });

    return data.affected > 0
      ? 'Deleted Successfully!'
      : ErrorMessage.DELETE_FAILED;
  }

  // soft delete workspace
  async softDeleteWorkspace(
    softDeleteDto: SoftDeleteDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const deletedData = {
      deletedAt: new Date(),
      deletedBy: userPayload.id,
      status: StatusField.DELETED,
    };

    const data = await this.workspaceRepository
      .createQueryBuilder()
      .update(WorkspaceEntity, deletedData)
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
          message: `these workspace id you provided successfully deleted softly!`,
          services: {
            tag: 'Workspace',
            identity: softDeleteDto.ids,
          },
        },
      };

      await this.subscriberUserService.activityLog(log);
    }

    return data.affected
      ? 'soft deleted successfully!'
      : ErrorMessage.DELETE_FAILED;
  }

  // get workspace by userId

  async getWorkspaceByUserId(userPayload: UserInterface) {
    const data = await this.workspaceRepository
      .createQueryBuilder('workspace')
      .where(`workspace.createdBy = ${userPayload.id}`)
      .getMany();

    if (data.length >= 0) {
      return data;
    } else {
      throw new NotFoundException(`Data not Found!`);
    }
  }
}
