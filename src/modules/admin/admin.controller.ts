/**dependencies */
import {
  Body,
  Controller,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
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
import { AuthService } from 'src/monitrix-auth/auth/auth.service';
import { AuthDto, LoginDto } from 'src/monitrix-auth/auth/dto';
import { ChangePasswordDto } from 'src/monitrix-auth/auth/dto/change-password.dto';
import { RtGuard } from 'src/monitrix-auth/auth/guards';
import { AdminGuard } from 'src/monitrix-auth/auth/guards/admin.guard';
import { PaginationDataDto } from 'src/monitrix-auth/common/dtos';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  PublicRoute,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { SubscriberUserService } from 'src/subscriber/subscriber-user/subscriber-user.service';
import { UserBannedDto } from './dtos';
import { UserService } from './user/user.service';
/**guards */

//guard
//   @UseGuards(JwtAuthGuard)
@ApiTags('MONITRIX|ADMIN')
@Controller({
  //path name
  path: '',
  //version
  version: '1',
})
export class AdminController {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly subscriberUserService: SubscriberUserService,
  ) {}

  // signup route
  @PublicRoute()
  @ApiOperation({
    summary: 'registration a system user',
    description: 'this route is responsible for register a system user',
  })
  @ApiBody({
    type: AuthDto,
    description:
      'How to register a system user with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'rahan',
          email: 'rahan@gmail.com',
          mobile: '+8801718890326',
          address: 'syedpur',
          password: '123456',
        } as unknown as AuthDto,
      },
    },
  })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signupLocal(@Body() dto: AuthDto) {
    const data = await this.authService.signupLocal(dto);

    return { message: 'Successful', result: data };
  }

  // signin route

  @PublicRoute()
  @ApiOperation({
    summary: 'for login, use this api',
    description: 'this route is responsible for login a system user',
  })
  @ApiBody({
    type: LoginDto,
    description:
      'How to login as an admin with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          email: 'noman@gmail.com',
          password: '123456',
        } as unknown as LoginDto,
      },
    },
  })
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signinLocal(@Body() dto: LoginDto): Promise<any> {
    const data = await this.authService.signinLocal(dto);
    return { message: 'Successful', result: data };
  }

  // change password
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'change authenticated users password',
    description:
      'this route is responsible for changing password for all type of users',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description:
      'How to change password with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          oldPassword: '123456',
          password: '123456',
          passwordConfirm: '123456',
        } as unknown as ChangePasswordDto,
      },
    },
  })
  @UseGuards(AdminGuard)
  @Post('change-password')
  async changePassword(
    @Body() changePasswordData: ChangePasswordDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.userService.passwordChanged(
      changePasswordData,
      userPayload,
    );

    return { message: 'Successful', result: data };
  }

  // logout api
  @ApiBearerAuth('jwt')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'for logout, use this api',
    description: 'this route is responsible for logout from an system user',
  })
  @Post('logout')
  async logout(@UserPayload() user: UserInterface) {
    const data = await this.authService.logout(user);

    return { message: 'Successful', result: data };
  }

  // get single user api
  // @ApiBearerAuth('jwt')
  // @ApiParam({
  //   name: 'id',
  //   type: Number,
  //   description: 'For getting single user required id',
  //   required: true,
  // })
  // @UseGuards(AtGuard)
  // @Get(':id')
  // async getUser(@Param('id') id: number) {
  //   const data = await this.authService.getUserById(id);

  //   return { message: 'Successful', result: data };
  // }

  // refresh the access token

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'access token need to be refreshed',
    description: 'this route is responsible for access token refreshed',
  })
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @UserPayload() user: UserInterface,
    @UserPayload('refreshToken') refreshToken: string,
  ): Promise<any> {
    const data = await this.authService.refreshTokens(user.id, refreshToken);

    return { message: 'Successful', result: data };
  }

  // pagination all user data
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'pagination of all user data',
    description:
      'this route is responsible for showing paginated all user data',
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
  @UseGuards(AdminGuard)
  @Post('subscriber-user')
  async getAllData(
    @Body() paginationDataDto: PaginationDataDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.subscriberUserService.findAllSubscriberUser(
      paginationDataDto,
      userPayload,
    );
    return {
      message: 'successful!',
      result: data,
    };
  }

  // for getting login to user from admin
  @ApiOperation({
    summary: 'login to user from admin',
    description: 'this route is responsible for login to user from admin',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for login to user require user id',
    required: true,
  })
  @ApiBearerAuth('jwt')
  @UseGuards(AdminGuard)
  @Get('login-user/:id')
  async getToken(
    @Param('id') id: number,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.subscriberUserService.loginToUserFromAdmin(
      id,
      userPayload,
      ipClientPayload,
    );

    return {
      message: 'successful!',
      result: data,
    };
  }

  // user banned by admin

  @ApiOperation({
    summary: 'for status changing of a subscriber user use this api',
    description:
      'this route is responsible for status changing of a subscriber user',
  })
  @ApiBearerAuth('jwt')
  @ApiBody({
    type: UserBannedDto,
    description:
      'How to change status of a subscriber user with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'chaging status',
        value: {
          status: 'Banned',
        } as unknown as UserBannedDto,
      },
    },
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'for banned user required user id',
    required: true,
  })
  @UseGuards(AdminGuard)
  @Patch('banned-user/:id')
  async bannedUser(
    @Param('id') id: number,
    @Body() userBannedDto: UserBannedDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.subscriberUserService.bannedUserByAdmin(
      id,
      userBannedDto,
      userPayload,
      ipClientPayload,
    );

    return { message: 'successful!', result: data };
  }

  // //forgot password route
  // @PublicRoute()
  // @ApiOperation({
  //   summary: 'request for forgot password',
  //   description: 'this route is responsible for requsiting for forgot password',
  // })
  // @ApiBody({
  //   type: ForgotPassDto,
  //   description:
  //     'How to forgot password with body?... here is the example given below!',
  //   examples: {
  //     a: {
  //       summary: 'default',
  //       value: {
  //         email: 'imonirul017@gmail.com',
  //         userId: 1,
  //       } as unknown as ForgotPassDto,
  //     },
  //   },
  // })
  // @Post('forgot-password')
  // async forgotPassword(@Body() forgotPassDto: ForgotPassDto) {
  //   const data = await this.authService.forgotPass(forgotPassDto);

  //   return { message: 'successful', result: data };
  // }

  //change password through forgotpass
  // @PublicRoute()
  // @ApiOperation({
  //   summary: 'change password by forgot pass',
  //   description:
  //     'this route is responsible to change password that requested by forgot password',
  // })
  // @ApiBody({
  //   type: ChangeForgotPassDto,
  //   description:
  //     'How to change password by forgot pass with body?... here is the example given below!',
  //   examples: {
  //     a: {
  //       summary: 'default',
  //       value: {
  //         passResetToken: '2vAzIwDFKn9mV12Ejod9',
  //         userId: 1,
  //         password: '123456',
  //         passwordConfirm: '123456',
  //       } as unknown as ChangeForgotPassDto,
  //     },
  //   },
  // })
  // @Post('change-forgot-pass')
  // async changeForgotPassword(@Body() changeForgotPassDto: ChangeForgotPassDto) {
  //   const data = await this.userService.changePasswordByForgotPass(
  //     changeForgotPassDto,
  //   );
  //   return { message: 'successful', result: data };
  // }
}
