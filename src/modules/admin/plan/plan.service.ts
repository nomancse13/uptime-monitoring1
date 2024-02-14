import { InjectRepository } from '@nestjs/typeorm';
import {
  PaginationDataDto,
  SoftDeleteDto,
} from 'src/monitrix-auth/common/dtos';
import { ErrorMessage, StatusField } from 'src/monitrix-auth/common/enum';
import { Pagination, UserInterface } from 'src/monitrix-auth/common/interfaces';
import { Brackets } from 'typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { CreatePlanDto, UpdatePlanDto } from './dtos';
import { PlanEntity } from './entity';

export class PlanService {
  constructor(
    @InjectRepository(PlanEntity)
    private planRepository: BaseRepository<PlanEntity>,
  ) {}

  //   create plan
  async createPlan(createPlanDto: CreatePlanDto, userPayload: UserInterface) {
    createPlanDto['createdBy'] = userPayload.id;

    const data = await this.planRepository.save(createPlanDto);
    return data;
  }

  // update plan by id

  async updatePlan(
    id: number,
    userPayload: UserInterface,
    updatePlanDto: UpdatePlanDto,
  ) {
    updatePlanDto['updatedBy'] = userPayload.id;

    const updatedData = await this.planRepository
      .createQueryBuilder()
      .update(PlanEntity, updatePlanDto)
      .where(`id = ${id}`)
      .returning('*')
      .execute();

    return updatedData.affected == 1
      ? 'updated successfully!'
      : 'updated failed!';
  }

  // get single plan

  async getSinglePlan(id: number, userPayload: UserInterface) {
    const data = await this.planRepository.findOne({
      where: { id: id, createdBy: userPayload.id },
    });
    return data;
  }

  // paginated data plan
  async paginatedPlan(paginationDataDto: PaginationDataDto) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [results, total] = await this.planRepository
      .createQueryBuilder('plan')
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
                    `plan.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(plan.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .orderBy(
        `plan.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    return new Pagination<PlanEntity>({
      results,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  // delete plan by id
  async deletePlan(id: number, userPayload: UserInterface) {
    const data = await this.planRepository.delete({
      id: id,
      createdBy: userPayload.id,
    });
    return data.affected > 1
      ? 'Deleted Successfully!'
      : ErrorMessage.DELETE_FAILED;
  }

  // soft delete plan

  async softDeletePlan(
    softDeleteDto: SoftDeleteDto,
    userPayload: UserInterface,
  ) {
    const updatedData = {
      deletedAt: new Date(),
      deletedBy: userPayload.id,
      status: StatusField.DELETED,
    };

    const data = await this.planRepository
      .createQueryBuilder()
      .update(PlanEntity, updatedData)
      .where('id IN (:...ids)', {
        ids: softDeleteDto.ids,
      })
      .execute();

    return data.affected
      ? 'soft deleted successfully!'
      : ErrorMessage.DELETE_FAILED;
  }
}
