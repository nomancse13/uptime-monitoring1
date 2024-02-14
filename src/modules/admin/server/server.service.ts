import { BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isValidHttpUrl } from 'src/helper/common.helper';
import { StatusField } from 'src/monitrix-auth/common/enum';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { CreateServerDto } from './dtos';
import { ServerEntity } from './entity';

export class ServerService {
  constructor(
    @InjectRepository(ServerEntity)
    private serverRepository: BaseRepository<ServerEntity>,
  ) {}

  //   create server
  async createServer(
    createServerDto: CreateServerDto,
    userPayload: UserInterface,
  ) {
    createServerDto['createdBy'] = userPayload.id;

    if (!isValidHttpUrl(createServerDto.serverUrl)) {
      throw new BadRequestException(
        `server url is invalid! simply add "http://" or "https://" to the beginning of the URL`,
      );
    }
    const data = await this.serverRepository.save(createServerDto);
    return data;
  }

  //   // update plan by id

  //   async updatePlan(
  //     id: number,
  //     userPayload: UserInterface,
  //     updatePlanDto: UpdatePlanDto,
  //   ) {
  //     updatePlanDto['updatedBy'] = userPayload.id;

  //     const updatedData = await this.planRepository
  //       .createQueryBuilder()
  //       .update(PlanEntity, updatePlanDto)
  //       .where(`id = ${id}`)
  //       .returning('*')
  //       .execute();

  //     return updatedData.affected == 1
  //       ? 'updated successfully!'
  //       : 'updated failed!';
  //   }

  // get single server

  async getSingleServer(id: number, userPayload: UserInterface) {
    const data = await this.serverRepository.findOne({
      where: { id: id, createdBy: userPayload.id },
    });
    return data;
  }

  //   // paginated data plan
  //   async paginatedPlan(paginationDataDto: PaginationDataDto) {
  //     const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
  //     const page = paginationDataDto.pageNumber
  //       ? paginationDataDto.pageNumber == 1
  //         ? 0
  //         : paginationDataDto.pageNumber
  //       : 1;

  //     const [results, total] = await this.planRepository
  //       .createQueryBuilder('plan')
  //       .where(
  //         new Brackets((qb) => {
  //           if (
  //             paginationDataDto.filter &&
  //             Object.keys(paginationDataDto.filter).length > 0
  //           ) {
  //             Object.keys(paginationDataDto.filter).forEach(function (key) {
  //               if (paginationDataDto.filter[key] !== '') {
  //                 if (key === 'status') {
  //                   qb.andWhere(
  //                     `plan.${key} = '${paginationDataDto.filter[key]}'`,
  //                   );
  //                 } else {
  //                   qb.andWhere(
  //                     `CAST(plan.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
  //                   );
  //                 }
  //               }
  //             });
  //           }
  //         }),
  //       )
  //       .orderBy(
  //         `plan.${paginationDataDto.sortField}`,
  //         paginationDataDto.sortOrder,
  //       )
  //       .take(limit)
  //       .skip(page > 0 ? page * limit - limit : page)
  //       .getManyAndCount();

  //     return new Pagination<PlanEntity>({
  //       results,
  //       total,
  //       currentPage: page === 0 ? 1 : page,
  //       limit,
  //     });
  //   }

  //   // delete plan by id
  //   async deletePlan(id: number, userPayload: UserInterface) {
  //     const data = await this.planRepository.delete({
  //       id: id,
  //       createdBy: userPayload.id,
  //     });
  //     return data.affected > 1
  //       ? 'Deleted Successfully!'
  //       : ErrorMessage.DELETE_FAILED;
  //   }

  //   // soft delete plan

  //   async softDeletePlan(
  //     softDeleteDto: SoftDeleteDto,
  //     userPayload: UserInterface,
  //   ) {
  //     const updatedData = {
  //       deletedAt: new Date(),
  //       deletedBy: userPayload.id,
  //       status: StatusField.DELETED,
  //     };

  //     const data = await this.planRepository
  //       .createQueryBuilder()
  //       .update(PlanEntity, updatedData)
  //       .where('id IN (:...ids)', {
  //         ids: softDeleteDto.ids,
  //       })
  //       .execute();

  //     return data.affected
  //       ? 'soft deleted successfully!'
  //       : ErrorMessage.DELETE_FAILED;
  //   }

  //   get single info of server

  async getServerInfo(id: number) {
    const data = await this.serverRepository
      .createQueryBuilder('server')
      .where(`server.id = ${id}`)
      .select(['server.countryName', 'server.countryCode', 'server.serverUrl'])
      .getOne();
    return data;
  }
  //   get all info of server

  async getMultipleServerInfo(userPayload: UserInterface) {
    const data = await this.serverRepository
      .createQueryBuilder('server')
      .where(`server.status = '${StatusField.ACTIVE}'`)
      .select(['server.id', 'server.countryName', 'server.countryCode'])
      .getMany();
    return data;
  }
}
