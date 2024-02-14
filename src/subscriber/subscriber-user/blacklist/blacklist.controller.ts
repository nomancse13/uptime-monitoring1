import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AtGuard } from 'src/monitrix-auth/auth/guards';
import { PaginationDataDto } from 'src/monitrix-auth/common/dtos';
import { SoftDeleteUniqueDto } from 'src/monitrix-auth/common/dtos/soft-delete-unique.dto';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { ChangeStatusUniqueDto } from 'src/monitrix-auth/utils/dtos/change-status-unique.dto';
import { BlacklistService } from './blacklist.service';
import { CreateBlacklistDto, UpdateBlacklistDto } from './dtos';

@ApiTags('Subscriber | Blacklist')
@ApiBearerAuth('jwt')
@UseGuards(AtGuard)
@Controller({
  path: 'blacklist',
  version: '1',
})
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  // get providers
  @ApiOperation({
    summary: 'Get providers',
    description: 'This route is responsible for get providers',
  })
  @Get('providers')
  async getProviders() {
    const result = await this.blacklistService.getBlacklistProvider();

    return { message: 'successful', result: result };
  }

  // change status of blacklist
  @Patch('change-status')
  @ApiOperation({
    summary: 'Change blacklist Status',
  })
  @ApiBody({
    type: ChangeStatusUniqueDto,
    examples: {
      a: {
        summary: 'default',
        description: ' Status change one or more blacklist',
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
    const data = await this.blacklistService.blacklistStatusChange(
      changeStatusUniqueDto,
      userPayload,
    );

    return { message: 'Successful', result: data };
  }

  // get status count

  @ApiOperation({
    summary: 'Get status count',
    description: 'This route is responsible for get get status count',
  })
  @Get('status-overview')
  async getStatus(@UserPayload() userPayload: UserInterface) {
    const result = await this.blacklistService.getStatusCount(userPayload);

    return { message: 'successful', result: result };
  }

  // soft delete one or more blacklist

  @ApiOperation({
    summary: 'soft delete blacklist',
    description: 'this route is responsible for delete one or more blacklist',
  })
  @ApiBody({
    type: SoftDeleteUniqueDto,
    description:
      'How to delete softly one or more blacklist?... here is the example given below!',
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
    const softDeleteData = await this.blacklistService.softDeleteBlacklist(
      SoftDeleteUniqueDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'Successful!', result: softDeleteData };
  }

  //   create blacklist

  @ApiOperation({
    summary: 'create blacklist for a user',
    description: 'this route is responsible for creating a blacklist',
  })
  @ApiBody({
    type: CreateBlacklistDto,
    description:
      'How to create a blacklist link with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          groupId: 1,
          name: 'test blacklist',
          url: 'test-host.net',
          team: ['PxleQnrkoXJE5ZIrCAx5W3no', 'PxleQnrkoXJE5ZIrCAx5W3no'],
        } as unknown as CreateBlacklistDto,
      },
    },
  })
  @Post()
  async create(
    @Body() createBlacklistDto: CreateBlacklistDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientInterface: IpClientInterface,
  ) {
    const data = await this.blacklistService.createBlacklist(
      createBlacklistDto,
      userPayload,
      ipClientInterface,
    );

    return { message: 'successful!', result: data };
  }

  //   update blacklist
  @ApiOperation({
    summary: 'update blacklist by a uniqueId',
    description:
      'this route is responsible for updating a blacklist by a uniqueId',
  })
  @ApiBody({
    type: UpdateBlacklistDto,
    description:
      'How to update a blacklist with Body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          groupId: 1,
          name: 'test blacklist',
          url: 'test-host.net',
          team: ['PxleQnrkoXJE5ZIrCAx5W3no', 'PxleQnrkoXJE5ZIrCAx5W3no'],
        } as unknown as UpdateBlacklistDto,
      },
    },
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for update blacklist required uniqueId',
    required: true,
  })
  @Patch(':uniqueId')
  async updateBlacklist(
    @Param('uniqueId') uniqueId: string,
    @Body() updateBlacklistDto: UpdateBlacklistDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.blacklistService.updateBlacklist(
      uniqueId,
      updateBlacklistDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }

  //get blacklist info

  @ApiOperation({
    summary: 'for getting blacklist info by uniqueId',
    description:
      'this route is responsible for getting blacklist info by uniqueId',
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for getting blacklist info required uniqueId',
    required: true,
  })
  @Get('get-info/:uniqueId')
  async getBlacklistInfo(
    @Param('uniqueId') uniqueId: string,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.blacklistService.getBlacklistInfo(
      uniqueId,
      userPayload,
    );
    return { message: 'successful!', result: data };
  }

  //   pagination data of blacklist

  @ApiOperation({
    summary: 'pagination of all blacklist data',
    description:
      'this route is responsible for getting all blacklist data with pagination',
  })
  @ApiBody({
    type: PaginationDataDto,
    description:
      'How to get all blacklist data with body?... here is the example given below!',
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
    const data = await this.blacklistService.paginateBlacklist(
      paginationDataDto,
      userPayload,
    );
    return { message: 'successful!', result: data };
  }

  @ApiOperation({
    summary: 'delete a blacklist by uniqueId',
    description: 'this route is responsible for delete a blacklist by uniqueId',
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for delete a blacklist required uniqueId',
    required: true,
  })
  @Delete(':uniqueId')
  async delete(
    @Param('uniqueId') uniqueId: string,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.blacklistService.deleteBlacklist(
      uniqueId,
      userPayload,
    );
    return {
      message: 'successful!',
      result: data,
    };
  }

  //single get

  @ApiOperation({
    summary: 'for getting single blacklist data by uniqueId',
    description:
      'this route is responsible for getting single blacklist data by uniqueId',
  })
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for getting single blacklist required uniqueId',
    required: true,
  })
  @Get(':uniqueId')
  async getOne(
    @Param('uniqueId') uniqueId: string,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.blacklistService.getSingleBlacklist(
      uniqueId,
      userPayload,
      ipClientPayload,
    );
    return { message: 'successful!', result: data };
  }
}
