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
  ApiTags,
} from '@nestjs/swagger';
import { ServerService } from 'src/modules/admin/server/server.service';
import { AtGuard } from 'src/monitrix-auth/auth/guards';
import {
  PaginationOptionsInterface,
  UserInterface,
} from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { UpdateWebsiteAlertDto } from './dtos';
import { CreateWebsiteAlertDto } from './dtos/create-website-alert.dto';
import { WebsiteService } from './website.service';

@ApiTags('Subscriber | Website Alert')
@ApiBearerAuth('jwt')
@UseGuards(AtGuard)
@Controller({
  path: 'website-alert',
  version: '1',
})
export class WebsiteAlertController {
  constructor(
    private readonly websiteService: WebsiteService,
    private readonly serverService: ServerService,
  ) {}

  // get all website alert
  @Get('paginate-list/:websiteId')
  @ApiParam({
    name: 'websiteId',
    type: Number,
    description: 'for list required websiteId',
    required: true,
  })
  @ApiOperation({
    summary: 'Get all website alert',
    description: 'This api is responsible for getting all website alert',
  })
  async getWebsiteAlert(
    @Query() listQueryParam: PaginationOptionsInterface,
    @Param('websiteId') websiteId: number,
  ) {
    const data = await this.websiteService.getAllWebsiteAlert(
      listQueryParam,
      websiteId,
    );
    return { message: 'successful', result: data };
  }

  //   create a new website alert
  @ApiOperation({
    summary: 'create website alert by a subscriber user',
    description: 'this route is responsible for create a website alert',
  })
  @ApiBody({
    type: CreateWebsiteAlertDto,
    description:
      'How to create a website alert with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          occurrences: 4,
          contacts: ['lsdflsdfj', 'dkldflsd'],
          websiteId: 1,
          type: 'responseCode',
          comparison: '!=',
          comparisonLimit: 20.3,
        } as unknown as CreateWebsiteAlertDto,
      },
    },
  })
  @Post()
  async create(
    @Body() createWebsiteAlertDto: CreateWebsiteAlertDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.websiteService.createWebsiteAlert(
      createWebsiteAlertDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }
  //   delete single website

  @ApiOperation({
    summary: 'delete single website by id',
    description: 'this route is responsible for delete single website with id',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for delete single website required id',
    required: true,
  })
  @Delete(':id')
  async delete(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.websiteService.deleteWebsiteALert(id);
    return { message: 'successful!', result: data };
  }

  //   update single alert of a website

  @ApiOperation({
    summary: 'update single alert of a website',
    description:
      'this route is responsible for update single alert of a website',
  })
  @ApiBody({
    type: UpdateWebsiteAlertDto,
    description:
      'How to update a single website alert with id?... here is example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          occurrences: 4,
          contacts: ['lsdflsdfj', 'dkldflsd'],
          websiteId: 1,
          type: 'responseCode',
          comparison: '!=',
          comparisonLimit: 20.3,
        } as unknown as UpdateWebsiteAlertDto,
      },
    },
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for update a website alert required id',
    required: true,
  })
  @Patch(':id')
  async updateAlert(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
    @Body() updateWebsiteAlertDto: UpdateWebsiteAlertDto,
  ) {
    const data = await this.websiteService.updateSingleAlert(
      id,
      userPayload,
      updateWebsiteAlertDto,
    );
    return { message: 'successful!', result: data };
  }

  //   get single website alert
  @ApiOperation({
    summary: 'get single website alert by alert id',
    description: 'this route is responsible for getting single website alert',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for getting single website alert required id',
    required: true,
  })
  @Get(':id')
  async getSingleAlert(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.websiteService.getSingleWebsiteAlert(
      id,
      userPayload,
    );
    return { message: 'successful!', result: data };
  }
}
