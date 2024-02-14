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
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';
import { WorkspaceService } from './workspace.service';
@ApiTags('Subscriber | Workspace')
@ApiBearerAuth('jwt')
@UseGuards(AtGuard)
@Controller({
  // path name
  path: 'workspace',
  // version
  version: '1',
})
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  //   get workspace

  @ApiOperation({
    summary: ' workspace',
    description: 'this route is responsible for getting workspace',
  })
  @Get()
  async getGroup(@UserPayload() userPayload: UserInterface) {
    const data = await this.workspaceService.getWorkspaceByUserId(userPayload);
    return { message: 'successful!', result: data };
  }

  // soft delete workspace

  @ApiOperation({
    summary: 'soft delete workspace',
    description: 'this route is responsible for soft delete workspace',
  })
  @ApiBody({
    type: SoftDeleteDto,
    description:
      'How to delete softly one or more workspace with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          ids: [1],
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
    const data = await this.workspaceService.softDeleteWorkspace(
      softDeleteDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }

  //create workspace

  @ApiOperation({
    summary: 'create workspace for a user',
    description: 'this route is responsible for creating workspace',
  })
  @ApiBody({
    type: CreateWorkspaceDto,
    description:
      'How to create workspace with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'test workspace',
        } as unknown as CreateWorkspaceDto,
      },
    },
  })
  @Post()
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.workspaceService.createWorkspace(
      createWorkspaceDto,
      userPayload,
      ipClientPayload,
    );
    return { message: 'successful!', result: data };
  }

  //   update work space

  @ApiOperation({
    summary: 'update work space',
    description: 'this route responsible for update workspace',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'For update required id',
    required: true,
  })
  @ApiBody({
    type: UpdateWorkspaceDto,
    description:
      'How to update workspace with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'update-workspace',
        } as unknown as UpdateWorkspaceDto,
      },
    },
  })
  @Patch(':id')
  async updateWorkspace(
    @Param('id') id: number,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.workspaceService.updateWorkspace(
      id,
      updateWorkspaceDto,
      userPayload,
      ipClientPayload,
    );
    return { message: 'successful!', result: data };
  }

  //   get single workspace

  @ApiOperation({
    summary: 'single workspace',
    description: 'this route is responsible for getting single workspace',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for getting single workspace required id',
    required: true,
  })
  @Get(':id')
  async getWorkSpace(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientInterface: IpClientInterface,
  ) {
    const data = await this.workspaceService.getSingleWorkspace(
      id,
      userPayload,
      ipClientInterface,
    );
    return { message: 'successful!', result: data };
  }

  //   paginated data of workspace

  @ApiOperation({
    summary: 'pagination of a workspace',
    description: 'this route is responsible for paginated workspace data',
  })
  @ApiBody({
    type: PaginationDataDto,
    examples: {
      a: {
        summary: 'default',
        description: 'fetching all workspace data with pagination',
        value: {
          filter: {
            status: 'Active || Inactive || Enabled || Disabled',
          },
          sortOrder: 'ASC || DESC',
          sortField: 'id',
          pageNumber: 1,
          pageSize: 10,
        } as unknown as PaginationDataDto,
      },
    },
  })
  @Post('pagination')
  async paginatedData(
    @Body() paginationDataDto: PaginationDataDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.workspaceService.paginateWorkspace(
      paginationDataDto,
      userPayload,
    );
    return { message: 'successful!', result: data };
  }

  //   delete workspace permanently
  @ApiOperation({
    summary: 'delete single workspace permanently',
    description: 'this route is responsible for delete single workspace',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for delete required id',
    required: true,
  })
  @Delete(':id')
  async deleteApi(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.workspaceService.deleteWorkspace(id, userPayload);
    return { message: 'successful!', result: data };
  }
}
