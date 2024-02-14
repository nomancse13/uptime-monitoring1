import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Body,
} from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core/inject.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AdminIntegrationService } from 'src/modules/admin/integrations/integration.service';
import { AtGuard } from 'src/monitrix-auth/auth/guards';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { ConfigureUpdateDto } from './dtos';
import { IntegrationService } from './integration.service';

@ApiTags('Subscriber | Integration')
@ApiBearerAuth('jwt')
@UseGuards(AtGuard)
@Controller({
  path: 'integration',
  version: '1',
})
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    // @Inject(forwardRef(() => AdminIntegrationService))
    private readonly adminIntegrationService: AdminIntegrationService,
  ) {}

  // get all integration

  @ApiOperation({
    summary: 'Get All Integration List',
    description: 'This route is responsible for get all integration list',
  })
  @Get('available-integration')
  async getAllIntegrations(@UserPayload() userPayload: UserInterface) {
    const result = await this.integrationService.getAllIntegrations(
      userPayload,
    );

    return { message: 'successful', result: result };
  }

  // get installed integration

  @ApiOperation({
    summary: 'Get All installed Integration List',
    description:
      'This route is responsible for get all installed integration list',
  })
  @Get('installed-integration')
  async getAllInstalledIntegrations(@UserPayload() userPayload: UserInterface) {
    const result = await this.integrationService.getInstalledIntegrations(
      userPayload,
    );

    return { message: 'successful', result: result };
  }

  //   update installation

  @ApiOperation({
    summary: 'Installation',
    description:
      'this route is responsible for install or uninstall integration',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for update a integration required id',
    required: true,
  })
  @Patch(':id')
  async updateIntegration(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const integrationExist =
      await this.adminIntegrationService.checkIfIntegrationExists(id);

    if (integrationExist) {
      throw new BadRequestException('No integration found');
    }

    const data = await this.integrationService.updateIntegration(
      id,
      userPayload,
      ipClientPayload,
    );
    return { message: 'successful!', result: data };
  }

  //get configuration details

  @ApiOperation({
    summary: 'for getting single cinfiguration data by id',
    description:
      'this route is responsible for getting single configuration data by id',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for getting single blacklist required id',
    required: true,
  })
  @Get(':id')
  async getOne(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.integrationService.getSingleConfigure(
      id,
      userPayload,
    );
    return { message: 'successful!', result: data };
  }

  //update config

  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for update Config required id',
    required: true,
  })
  @Patch('update/:id')
  async updateIntegrationConfig(
    @Param('id') id: number,
    @Body() updateConfigDto: ConfigureUpdateDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.integrationService.updateIntegrationConfig(
      id,
      updateConfigDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }
}
