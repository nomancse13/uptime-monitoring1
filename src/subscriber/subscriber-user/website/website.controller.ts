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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ServerService } from 'src/modules/admin/server/server.service';
import { AtGuard } from 'src/monitrix-auth/auth/guards';
import {
  PaginationDataDto,
  SoftDeleteDto,
} from 'src/monitrix-auth/common/dtos';
import {
  PaginationOptionsInterface,
  UserInterface,
} from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { ChangeStatusDto } from 'src/monitrix-auth/utils/dtos';
import { CreateWebsiteDto, UpdateWebsiteDto } from './dtos';
import { WebsiteService } from './website.service';

@ApiTags('Subscriber | Website')
@ApiBearerAuth('jwt')
@UseGuards(AtGuard)
@Controller({
  path: 'website',
  version: '1',
})
export class WebsiteController {
  constructor(
    private readonly websiteService: WebsiteService,
    private readonly serverService: ServerService,
  ) {}

  // get single website incident data

  @ApiOperation({
    summary: 'get incident data',
    description: 'this route is responsible for get incident data',
  })
  @ApiParam({
    name: 'websiteId',
    type: Number,
    description: 'for getting incident data required websiteId',
    required: true,
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
  @Get('incident-data/:websiteId')
  async incidentData(
    @Param('websiteId') websiteId: number,
    @Query() listQueryParam: PaginationOptionsInterface,
    @Query() filter: any,
  ) {
    const result = await this.websiteService.getIncidentData(
      websiteId,
      listQueryParam,
      filter,
    );

    return { message: 'successful', result: result };
  }

  //   delete incident data of a website

  @ApiOperation({
    summary: 'delete incident data of a website',
    description:
      'this route is responsible for delete incident data of a website',
  })
  @ApiParam({
    name: 'websiteId',
    type: Number,
    description: 'for delete incident data of a website required website id',
    required: true,
  })
  @Delete('incident/:websiteId')
  async delIncident(@Param('websiteId') websiteId: number) {
    const data = await this.websiteService.deleteIncident(websiteId);
    return { message: 'successful!', result: data };
  }

  // get single website resolve data

  @ApiOperation({
    summary: 'get resolve data',
    description: 'this route is responsible for get resolve data',
  })
  @ApiParam({
    name: 'websiteId',
    type: Number,
    description: 'for getting resolve data required websiteId',
    required: true,
  })
  @Get('resolve-data/:websiteId')
  async resolveData(
    @Param('websiteId') websiteId: number,
    @Query() listQueryParam: PaginationOptionsInterface,
  ) {
    const result = await this.websiteService.getResolveData(
      websiteId,
      listQueryParam,
    );

    return { message: 'successful', result: result };
  }

  //   delete single resolve

  @ApiOperation({
    summary: 'delete single resolve by id',
    description: 'this route is responsible for delete single resolve by id',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for delete single resolve by id',
    required: true,
  })
  @Delete('resolve/:id')
  async delResolve(@Param('id') id: number) {
    const data = await this.websiteService.deleteResolve(id);
    return { message: 'successful!', result: data };
  }
  // get single chart data

  @ApiOperation({
    summary: 'get data from influx',
    description: 'this route is responsible for get data from influx',
  })
  @ApiQuery({
    name: 'filter',
    description:
      'insert 1 if you need last 24 hours data, insert 7 if you need last 7 days data, insert 30 if you need last 30 days data, insert 1m if you need last 1 month data',
    required: false,
  })
  @Get('chart-data')
  async chartData(
    @UserPayload() userPayload: UserInterface,
    @Query('uniqueId') uniqueId: string,
    @Query() filter: any,
  ) {
    const result = await this.websiteService.getSingleChartData(
      userPayload,
      uniqueId,
      filter,
    );

    return { message: 'successful', result: result };
  }
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
  @Get('load-data')
  async getData(
    @UserPayload() userPayload: UserInterface,
    @Query('uniqueId') uniqueId: string,
    @Query() listQueryParam: PaginationOptionsInterface,
    @Query() filter: any,
  ) {
    const result = await this.websiteService.getQueryWithPaginate(
      userPayload,
      uniqueId,
      listQueryParam,
      filter,
    );

    return { message: 'successful', result: result };
  }

  // get incident and resolve count

  @ApiOperation({
    summary: 'get incident and resolve count',
    description: 'this route is responsible for incident and resolve count',
  })
  @ApiParam({
    name: 'websiteId',
    type: Number,
    description: 'for counting incident and resolve required websiteId',
    required: true,
  })
  @Get('incident-resolve-count/:websiteId')
  async getCount(@Param('websiteId') websiteId: number) {
    const result = await this.websiteService.totalIncidentAndResolveCount(
      websiteId,
    );

    return { message: 'successful', result: result };
  }

  // // total resolve count

  // @ApiOperation({
  //   summary: 'total resolve count',
  //   description: 'this route is responsible for total resolve count',
  // })
  // @ApiParam({
  //   name: 'websiteId',
  //   type: Number,
  //   description: 'for counting total resolve required websiteId',
  //   required: true,
  // })
  // @Get('resolve-count/:websiteId')
  // async getResolveCount(@Param('websiteId') websiteId: number) {
  //   const result = await this.websiteService.totalResolveCount(websiteId);

  //   return { message: 'successful', result: result };
  // }

  // get status count

  @ApiOperation({
    summary: 'get status count',
    description: 'this route is responsible for get get status count',
  })
  @Get('status-overview')
  async getStat(@UserPayload() userPayload: UserInterface) {
    const result = await this.websiteService.getStatusCount(userPayload);

    return { message: 'successful', result: result };
  }

  //   pagination website
  @ApiOperation({
    summary: 'get of website data',
    description: 'this route is responsible for website all data',
  })
  @Get('website-info')
  async getAll(@UserPayload() userPayload: UserInterface) {
    const data = await this.websiteService.getWebsiteApi(userPayload);
    return {
      message: 'successful!',
      result: data,
    };
  }

  // change status of website
  @Patch('change-status')
  @ApiOperation({
    summary: 'Change website Status',
  })
  @ApiBody({
    type: ChangeStatusDto,
    examples: {
      a: {
        summary: 'default',
        description: ' Status change one or more website',
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
    const data = await this.websiteService.websiteStatusChange(
      changeStatusDto,
      userPayload,
    );

    return { message: 'Successful', result: data };
  }

  //   get all location
  @ApiOperation({
    summary: 'get all location',
    description: 'this route is responsible for getting all location',
  })
  @Get('all-loc')
  async getAllLoc(@UserPayload() userPayload: UserInterface) {
    const data = await this.serverService.getMultipleServerInfo(userPayload);
    return { message: 'successful!', result: data };
  }

  // soft delete website

  @ApiOperation({
    summary: 'soft delete website',
    description: 'this route is responsible for soft delete website',
  })
  @ApiBody({
    type: SoftDeleteDto,
    description:
      'How to delete softly one or more website with body?... here is the example given below!',
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
    const data = await this.websiteService.softDeleteWebsite(
      softDeleteDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful', result: data };
  }
  //   create a new website
  @ApiOperation({
    summary: 'create website by a subscriber user',
    description: 'this route is responsible for create a website',
  })
  @ApiBody({
    type: CreateWebsiteDto,
    description:
      'How to create a website with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'test-domain',
          websiteUrl: 'test-domain.com',
          groupId: 1,
          locationId: 2,
          delayDurationId: 2,
          team: ['sfdfsdsfd'],
          searchString: 'dfsdfd',
          searchStringMissing: true,
          loadTime: 0.3,
          occurrences: 4,
        } as unknown as CreateWebsiteDto,
      },
    },
  })
  @Post()
  async create(
    @Body() createWebsiteDto: CreateWebsiteDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.websiteService.createWebsite(
      createWebsiteDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }

  //   update an existing website

  @ApiOperation({
    summary: 'update an existing website',
    description: 'this route is responsible for updating an existing website',
  })
  @ApiBody({
    type: UpdateWebsiteDto,
    description:
      'How to update a website with id?... here is example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'test-website',
          websiteUrl: 'https://dev.myunisearch.com/',
          groupId: 1,
          delayDurationId: 2,
          team: ['sfdfsdsfd'],
          occurrences: 4,
          loadTime: 0.3,
          searchString: 'dfsdfd',
          searchStringMissing: true,
        } as unknown as UpdateWebsiteDto,
      },
    },
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for update a website required id',
    required: true,
  })
  @Patch(':uniqueId')
  async update(
    @Param('uniqueId') uniqueId: any,
    @UserPayload() userPayload: UserInterface,
    @Body() updateWebsiteDto: UpdateWebsiteDto,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.websiteService.updateWebsite(
      uniqueId,
      userPayload,
      updateWebsiteDto,
      ipClientPayload,
    );
    return { message: 'successful!', result: data };
  }

  //   get single website
  @ApiOperation({
    summary: 'get single website by website id',
    description: 'this route is responsible for getting single website',
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for getting single website required id',
    required: true,
  })
  @Get(':uniqueId')
  async getWebsite(
    @Param('uniqueId') uniqueId: any,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.websiteService.singleWebsite(
      uniqueId,
      userPayload,
      ipClientPayload,
    );
    return { message: 'successful!', result: data };
  }

  //   pagination website
  @ApiOperation({
    summary: 'pagination of website data',
    description: 'this route is responsible for paginated website all data',
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
    const data = await this.websiteService.paginateWebsite(
      paginationDataDto,
      userPayload,
    );
    return {
      message: 'successful!',
      result: data,
    };
  }

  //   delete single website

  @ApiOperation({
    summary: 'delete single website by uniqueId',
    description:
      'this route is responsible for delete single website with uniqueId',
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for delete single website required uniqueId',
    required: true,
  })
  @Delete(':uniqueId')
  async delete(
    @Param('uniqueId') uniqueId: string,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.websiteService.deleteWebsite(uniqueId, userPayload);
    return { message: 'successful!', result: data };
  }

  // //   update single alert of a website

  // @ApiOperation({
  //   summary: 'update single alert of a website',
  //   description:
  //     'this route is responsible for update single alert of a website',
  // })
  // @ApiBody({
  //   type: UpdateWebsiteAlertDto,
  //   description:
  //     'How to update a single website alert with id?... here is example given below!',
  //   examples: {
  //     a: {
  //       summary: 'default',
  //       value: {
  //         occurrences: 4,
  //         contacts: ['lsdflsdfj', 'dkldflsd'],
  //         websiteId: 1,
  //         type: 'responseCode',
  //         comparison: '!=',
  //         comparisonLimit: 20.3,
  //       } as unknown as UpdateWebsiteAlertDto,
  //     },
  //   },
  // })
  // @ApiParam({
  //   name: 'id',
  //   type: Number,
  //   description: 'for update a website alert required id',
  //   required: true,
  // })
  // @Patch('single-alert/:id')
  // async updateAlert(
  //   @Param('id') id: number,
  //   @UserPayload() userPayload: UserInterface,
  //   @Body() updateWebsiteAlertDto: UpdateWebsiteAlertDto,
  // ) {
  //   const data = await this.websiteService.updateSingleAlert(
  //     id,
  //     userPayload,
  //     updateWebsiteAlertDto,
  //   );
  //   return { message: 'successful!', result: data };
  // }

  // //   get single website alert
  // @ApiOperation({
  //   summary: 'get single website alert by alert id',
  //   description: 'this route is responsible for getting single website alert',
  // })
  // @ApiParam({
  //   name: 'id',
  //   type: Number,
  //   description: 'for getting single website alert required id',
  //   required: true,
  // })
  // @Get('single-alert/:id')
  // async getSingleAlert(
  //   @Param('id') id: number,
  //   @UserPayload() userPayload: UserInterface,
  // ) {
  //   const data = await this.websiteService.getSingleWebsiteAlert(
  //     id,
  //     userPayload,
  //   );
  //   return { message: 'successful!', result: data };
  // }

  //   get location
  @ApiOperation({
    summary: 'get location by id',
    description: 'this route is responsible for getting location',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for getting location required id',
    required: true,
  })
  @Get('loc/:id')
  async getLoc(@Param('id') id: number) {
    const data = await this.serverService.getServerInfo(id);
    return { message: 'successful!', result: data };
  }
}
