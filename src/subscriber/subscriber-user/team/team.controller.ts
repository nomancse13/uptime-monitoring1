/**dependencies */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Patch } from '@nestjs/common/decorators';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AtGuard } from 'src/monitrix-auth/auth/guards';
import { PaginationDataDto } from 'src/monitrix-auth/common/dtos';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { CreateTeamDto, UpdateTeamDto } from '../dtos';
import { SubscriberUserService } from '../subscriber-user.service';

/**services */
@ApiBearerAuth('jwt')
@UseGuards(AtGuard)
@ApiTags('Subscriber|Team')
@Controller({
  //path name
  path: 'team',
  //version
  version: '1',
})
export class TeamController {
  constructor(private readonly subscriberUserService: SubscriberUserService) {}

  /**
   *  UPDATE SUBSCRIBER team Profile
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a team data under a subscriber user',
    description:
      'This route is responsible for updating Update a team data under a subscriber user',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Update a team data require id',
    required: true,
  })
  @ApiBody({
    type: UpdateTeamDto,
    description:
      'How to update Update a team data under a subscriber user with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'raihan',
          email: 'raihan@gmail.com',
          password: '123456',
          passwordConfirm: '123456',
          permission: {
            add: 0,
            edit: 1,
            delete: 0,
          },
        } as unknown as UpdateTeamDto,
      },
    },
  })
  async update(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
    @Body() updateTeamDto: UpdateTeamDto,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.subscriberUserService.updateTeam(
      id,
      userPayload,
      updateTeamDto,
      ipClientPayload,
    );
    return { message: 'Successful', result: data };
  }

  // create team for a user
  @ApiOperation({
    summary: 'create team for a user',
    description: 'this route is responsible for create a team of a user',
  })
  @ApiBody({
    type: CreateTeamDto,
    description:
      'How to create a team of a user with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'raihan',
          email: 'raihan@gmail.com',
          password: '123456',
          passwordConfirm: '123456',
          permission: {
            add: 0,
            edit: 1,
            delete: 0,
          },
        } as unknown as CreateTeamDto,
      },
    },
  })
  @Post()
  async teamCreate(
    @Body() createTeamDto: CreateTeamDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.subscriberUserService.createTeam(
      createTeamDto,
      userPayload,
      ipClientPayload,
    );
    return { message: 'successful', result: data };
  }

  // pagination all team data under a subscriber
  @ApiOperation({
    summary: 'pagination of all team data under a subscriber',
    description:
      'this route is responsible for showing paginated all team data under a subscriber',
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
  @Post('team-data')
  async getAllData(
    @Body() paginationDataDto: PaginationDataDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.subscriberUserService.findAllSubscriberTeam(
      paginationDataDto,
      userPayload,
    );
    return {
      message: 'successful!',
      result: data,
    };
  }

  // get team data
  @ApiOperation({
    summary: 'get single team data',
    description: 'this route is responsible for getting single data of team',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for getting single team data require id',
    required: true,
  })
  @Get(':id')
  async teamData(@Param('id') id: number) {
    const data = await this.subscriberUserService.findUserById(id);
    return { message: 'success', result: data };
  }

  // delete single team data
  @ApiOperation({
    summary: 'get single team data',
    description: 'this route is responsible for getting single data of team',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for delete single team data require id',
    required: true,
  })
  @Delete(':id')
  async delete(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.subscriberUserService.deleteTeam(userPayload, id);
    return { message: 'success', result: data };
  }
}
