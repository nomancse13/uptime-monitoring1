import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common/decorators';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AtGuard } from 'src/monitrix-auth/auth/guards';
import { PaginationDataDto } from 'src/monitrix-auth/common/dtos';
import { SoftDeleteUniqueDto } from 'src/monitrix-auth/common/dtos/soft-delete-unique.dto';
import {
  PaginationOptionsInterface,
  UserInterface,
} from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { ChangeStatusUniqueDto } from 'src/monitrix-auth/utils/dtos/change-status-unique.dto';
import { CreateSSLDto, UpdateSSLDto } from './dto';
import { SSLService } from './ssl.service';

@ApiTags('Subscriber|SSL')
@ApiBearerAuth('jwt')
@UseGuards(AtGuard)
@Controller({
  path: 'ssl',
  version: '1',
})
export class SSLController {
  constructor(private readonly sslService: SSLService) {}

  // get data from influx

  @ApiOperation({
    summary: 'get data from influx',
    description: 'this route is responsible for get data from influx',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'insert limit if you need',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'insert page if you need',
    required: false,
  })
  @ApiQuery({
    name: 'date',
    type: String,
    description: 'insert date if you see only one day data',
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    description: 'insert startDate and endDate if you see multiple day data',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    description: 'insert startDate and endDate if you see multiple day data',
    required: false,
  })
  @Get('ssl-data')
  async getData(
    @UserPayload() userPayload: UserInterface,
    @Query('uniqueId') uniqueId: string,
    @Query() listQueryParam: PaginationOptionsInterface,
    @Query() filter: any,
  ) {
    const result = await this.sslService.getQueryWithPaginate(
      userPayload,
      uniqueId,
      listQueryParam,
      filter,
    );

    return { message: 'successful', result: result };
  }

  // change status of ssl
  @Patch('change-status')
  @ApiOperation({
    summary: 'Change ssl Status',
  })
  @ApiBody({
    type: ChangeStatusUniqueDto,
    examples: {
      a: {
        summary: 'default',
        description: ' Status change one or more ssl',
        value: {
          uniqueIds: ['jyuyjgbu-rvgyugrnvb'],
          status: 'Active || Inactive || Draft || Deleted',
        } as unknown as ChangeStatusUniqueDto,
      },
    },
  })
  async changeStatus(
    @Body() changeStatusUniqueDto: ChangeStatusUniqueDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.sslService.sslStatusChange(
      changeStatusUniqueDto,
      userPayload,
    );

    return { message: 'Successful', result: data };
  }

  // soft delete ssl

  @ApiOperation({
    summary: 'soft delete ssl',
    description: 'this route is responsible for soft delete ssl',
  })
  @ApiBody({
    type: SoftDeleteUniqueDto,
    description:
      'How to delete ssl with Body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          uniqueIds: ['hbkbuvyguy-jkgbuycgey'],
        } as unknown as SoftDeleteUniqueDto,
      },
    },
  })
  @Patch('soft-delete')
  async softDelete(
    @Body() SoftDeleteUniqueDto: SoftDeleteUniqueDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.sslService.softDeleteSSL(
      SoftDeleteUniqueDto,
      userPayload,
      ipClientPayload,
    );

    return {
      message: 'successful!',
      result: data,
    };
  }

  //   create ssl

  @ApiOperation({
    summary: 'create a ssl by a user',
    description: 'this route is responsible for create a ssl',
  })
  @ApiBody({
    type: CreateSSLDto,
    description:
      'How to create a ssl with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'test-ssl',
          url: 'test-url',
          groupId: 1,
          frequency: '2days',
          alertBeforeExpiration: 20,
          locationId: 2,
          team: ['PxleQnrkoXJE5ZIrCAx5W3no', 'PxleQnrkoXJE5ZIrCAx5W3no'],
        } as unknown as CreateSSLDto,
      },
    },
  })
  @Post()
  async create(
    @Body() CreateSSLDto: CreateSSLDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.sslService.createSSL(
      CreateSSLDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }

  // get status count

  @ApiOperation({
    summary: 'Get status count',
    description: 'This route is responsible for get get status count',
  })
  @Get('status-overview')
  async getStatus(@UserPayload() userPayload: UserInterface) {
    const result = await this.sslService.getStatusCount(userPayload);

    return { message: 'successful', result: result };
  }

  //   update ssl

  @ApiOperation({
    summary: 'update ssl by a uniqueId',
    description: 'this route is responsible for update a ssl by uniqueId',
  })
  @ApiBody({
    type: UpdateSSLDto,
    description:
      'How to update a ssl with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'test-ssl',
          url: 'test-url',
          groupId: 1,
          frequency: '2days',
          alertBeforeExpiration: 20,
          locationId: 2,
          team: ['PxleQnrkoXJE5ZIrCAx5W3no', 'PxleQnrkoXJE5ZIrCAx5W3no'],
        } as unknown as UpdateSSLDto,
      },
    },
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for update a ssl required uniqueId',
    required: true,
  })
  @Patch(':uniqueId')
  async update(
    @Param('uniqueId') uniqueId: string,
    @Body() updateSSLDto: UpdateSSLDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.sslService.updateSSL(
      uniqueId,
      updateSSLDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }

  //   get single ssl

  @ApiOperation({
    summary: 'get single ssl',
    description: 'this route is responsible for getting a single ssl',
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for get single ssl required id',
    required: true,
  })
  @Get(':uniqueId')
  async getOne(
    @Param('uniqueId') uniqueId: string,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.sslService.getSingleSSL(
      uniqueId,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }

  // get all ssl with pagination
  @ApiOperation({
    summary: 'get all ssl with pagination',
    description: 'this route is responsible for get all ssl with pagination',
  })
  @ApiBody({
    type: PaginationDataDto,
    description:
      'How to get all ssl with pagination?... here is example given below',
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
  async getAll(
    @Body() paginationDataDto: PaginationDataDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.sslService.getAllSSL(
      paginationDataDto,
      userPayload,
    );

    return { message: 'successful!', result: data };
  }

  // delete ssl by uniqueId
  @ApiOperation({
    summary: 'delete ssl by a uniqueId',
    description: 'this route is responsible for delete a ssl by uniqueId',
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for delete a ssl required uniqueId',
    required: true,
  })
  @Delete(':uniqueId')
  async delete(
    @Param('uniqueId') uniqueId: string,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.sslService.deleteSSL(uniqueId, userPayload);

    return { message: 'successful!', result: data };
  }
}
