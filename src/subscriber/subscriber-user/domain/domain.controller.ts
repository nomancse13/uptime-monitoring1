import { Body, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Controller } from '@nestjs/common/decorators/core/controller.decorator';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AtGuard } from 'src/monitrix-auth/auth/guards';
import {
  PaginationDataDto,
  SoftDeleteDto,
} from 'src/monitrix-auth/common/dtos';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { ChangeStatusDto } from 'src/monitrix-auth/utils/dtos';
import { promisify } from 'util';
import { DomainService } from './domain.service';
import { CreateDomainDto, UpdateDomainDto } from './dtos';

@ApiTags('Subscriber | Domain')
@ApiBearerAuth('jwt')
@UseGuards(AtGuard)
@Controller({
  path: 'domain',
  version: '1',
})
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  // change status of domain
  @Patch('change-status')
  @ApiOperation({
    summary: 'Change domain Status',
  })
  @ApiBody({
    type: ChangeStatusDto,
    examples: {
      a: {
        summary: 'default',
        description: ' Status change one or more domain',
        value: {
          ids: [1],
          status: 'Active || Inactive || Draft || Deleted',
        } as unknown as ChangeStatusDto,
      },
    },
  })
  async changeStatus(
    @Body() changeStatusDto: ChangeStatusDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.domainService.domainStatusChange(
      changeStatusDto,
      userPayload,
    );

    return { message: 'Successful', result: data };
  }

  // soft delete domain

  @ApiOperation({
    summary: 'soft delete domain',
    description: 'this route is responsible for soft delete domain',
  })
  @ApiBody({
    type: SoftDeleteDto,
    description:
      'How to delete softly one or more domain with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          ids: [2, 3],
        } as unknown as SoftDeleteDto,
      },
    },
  })
  @Patch('soft-delete')
  async softDelete(
    @Body() softDeleteDto: SoftDeleteDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.domainService.softDeleteDomain(
      softDeleteDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful', result: data };
  }

  // get status count

  @ApiOperation({
    summary: 'Get status count',
    description: 'This route is responsible for get get status count',
  })
  @Get('status-overview')
  async getStat(@UserPayload() userPayload: UserInterface) {
    const result = await this.domainService.getStatusCount(userPayload);

    return { message: 'successful', result: result };
  }

  //   create a new domain
  @ApiOperation({
    summary: 'create domain by a subscriber user',
    description: 'this route is responsible for create a domain',
  })
  @ApiBody({
    type: CreateDomainDto,
    description:
      'How to create a domain with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'test-domain',
          domainUrl: 'test-domain.com',
          groupId: 1,
          frequencyType: '2days',
          alertBeforeExpiration: 20,
          team: ['PxleQnrkoXJE5ZIrCAx5W3no', 'PxleQnrkoXJE5ZIrCAx5W3no'],
        } as unknown as CreateDomainDto,
      },
    },
  })
  @Post()
  async create(
    @Body() createDomainDto: CreateDomainDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.domainService.createDomain(
      createDomainDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }

  //   update an existing domain

  @ApiOperation({
    summary: 'update an existing domain',
    description: 'this route is responsible for updating an existin domain',
  })
  @ApiBody({
    type: UpdateDomainDto,
    description:
      'How to update a domain with id?... here is example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'test-domain',
          domainUrl: 'test-domain.com',
          groupId: 1,
          frequencyType: '2days',
          alertBeforeExpiration: 20,
          team: ['PxleQnrkoXJE5ZIrCAx5W3no', 'PxleQnrkoXJE5ZIrCAx5W3no'],
        } as unknown as UpdateDomainDto,
      },
    },
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for update a domain required id',
    required: true,
  })
  @Patch(':id')
  async updateDomain(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
    @Body() updateDomainDto: UpdateDomainDto,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.domainService.updateDomain(
      id,
      userPayload,
      updateDomainDto,
      ipClientPayload,
    );
    return { message: 'successful!', result: data };
  }

  //   get dns

  @ApiOperation({
    summary: 'domain  by domain name',
    description: 'domain info by domain name',
  })
  @ApiParam({
    name: 'url',
    type: String,
    description: 'for getting domain details required url',
    required: true,
  })
  @Get('get-dns/:url')
  async getDomainInfo(@Param('url') url: string) {
    try {
      // const data = await this.domainService.getNameServers(url);
      const data = await this.domainService.getNameServers(url);

      return {
        message: 'successful!',
        result: data,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  //   get single domain

  @ApiOperation({
    summary: 'get single domain by domain id',
    description: 'this route is responsible for getting single domain',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for getting single domain required id',
    required: true,
  })
  @Get(':id')
  async getSingleDomain(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.domainService.singleDomain(id, userPayload);
    return { message: 'successful!', result: data };
  }

  //   get single get

  @ApiOperation({
    summary: 'get single domain details by domain id',
    description: 'this route is responsible for getting single domain details',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for getting single domain details required id',
    required: true,
  })
  @Get('details/:id')
  async getDomain(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.domainService.singleDomainDetails(id, userPayload);
    return { message: 'successful!', result: data };
  }

  //   pagination domain

  @ApiOperation({
    summary: 'pagination of domain data',
    description: 'this route is responsible for paginated domain all data',
  })
  @ApiBody({
    type: PaginationDataDto,
    description:
      'How to paginate get all data with pagination?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          filter: {},
          sortOrder: 'ASC',
          sortField: 'id',
          pageNumber: 1,
          pageSize: 10,
        } as unknown as PaginationDataDto,
      },
    },
  })
  @Post('pagination')
  async getAllData(
    @Body() paginationDataDto: PaginationDataDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.domainService.paginateDomain(
      paginationDataDto,
      userPayload,
    );
    return {
      message: 'successful!',
      result: data,
    };
  }

  //   delete single domain

  @ApiOperation({
    summary: 'delete single domain by id',
    description: 'this route is responsible for delete single domain with id',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for delete single domain required id',
    required: true,
  })
  @Delete(':id')
  async delete(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.domainService.deleteDomain(id, userPayload);
    return { message: 'successful!', result: data };
  }
}
