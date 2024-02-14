/**dependencies */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Patch } from '@nestjs/common/decorators';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthDto,
  ForgotPassDto,
  LoginDto,
  OtpVerifyDto,
  ResendOtpDto,
} from 'src/monitrix-auth/auth/dto';
import { ChangeForgotPassDto } from 'src/monitrix-auth/auth/dto/change-forgot-pass.dto';
import { ChangePasswordDto } from 'src/monitrix-auth/auth/dto/change-password.dto';
import { UpdateUserDto } from 'src/monitrix-auth/auth/dto/update-user.dto';
import { AtGuard, RtGuard } from 'src/monitrix-auth/auth/guards';
import { PaginationDataDto } from 'src/monitrix-auth/common/dtos';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import {
  IpPlusClientAddress,
  PublicRoute,
  UserPayload,
} from 'src/monitrix-auth/utils/decorators';
import { SubscriberUserService } from './subscriber-user.service';
/**services */

@ApiTags('Subscriber|User')
@Controller({
  //path name
  path: '',
  //version
  version: '1',
})
export class SubscriberUserController {
  constructor(private readonly subscriberUserService: SubscriberUserService) {}

  // signup route

  @PublicRoute()
  @ApiOperation({
    summary: 'registration a subscriber user',
    description: 'this route is responsible for register a subscriber user',
  })
  @ApiBody({
    type: AuthDto,
    description:
      'How to register a subscriber user with body?... here is the example given below!',
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
  async signupLocal(
    @Body() dto: AuthDto,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.subscriberUserService.signupLocal(
      dto,
      ipClientPayload,
    );

    return { message: 'Successful', result: data };
  }

  // signin route
  @PublicRoute()
  @ApiOperation({
    summary: 'for login, use this api',
    description: 'this route is responsible for login as a Subscriber user',
  })
  @ApiBody({
    type: LoginDto,
    description:
      'How to login as an Subscriber User with body?... here is the example given below!',
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
  async signinLocal(
    @Body() dto: LoginDto,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ): Promise<any> {
    const data = await this.subscriberUserService.signinLocal(
      dto,
      ipClientPayload,
    );
    return { message: 'Successful', result: data };
  }

  //verify otp data
  @ApiOperation({
    summary: 'verify email otp code',
    description:
      'this route is responsible for verifying email OTP code that is sent to subscriber user',
  })
  @ApiBody({
    type: OtpVerifyDto,
    description:
      'How to verify email otp code with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          otpCode: '35FF0C',
        } as unknown as OtpVerifyDto,
      },
    },
  })
  @Post('verify-otp')
  async verifyOtp(@Body() otpDataDto: OtpVerifyDto) {
    const data = await this.subscriberUserService.verifyOtp(otpDataDto);
    return { message: 'successful', result: data };
  }

  //resend otp code
  @ApiOperation({
    summary: 'resend user otp code',
    description: 'this route is responsible for resend otp code',
  })
  @ApiBody({
    type: ResendOtpDto,
    description:
      'How to resend otp code with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          email: 'noman@gmail.com',
        } as unknown as ResendOtpDto,
      },
    },
  })
  @Post('resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    const data = await this.subscriberUserService.resendOtp(resendOtpDto);
    return { message: 'successful', result: data };
  }

  // change password
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'change authenticated users password',
    description: 'this route is responsible for changing password for a users',
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
  @UseGuards(AtGuard)
  @Post('change-password')
  async changePassword(
    @Body() changePasswordData: ChangePasswordDto,
    @UserPayload() userPayload: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.subscriberUserService.passwordChanged(
      changePasswordData,
      userPayload,
      ipClientPayload,
    );

    return { message: 'Successful', result: data };
  }

  // logout api
  @ApiBearerAuth('jwt')
  @UseGuards(AtGuard)
  @ApiOperation({
    summary: 'for logout, use this api',
    description: 'this route is responsible for logout from an subscriber user',
  })
  @Post('logout')
  async logout(
    @UserPayload() user: UserInterface,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.subscriberUserService.logout(user, ipClientPayload);

    return { message: 'Successful', result: data };
  }

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
    @UserPayload() userPayload: any,
    // @UserPayload('refreshToken') refreshToken: string,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ): Promise<any> {
    const data = await this.subscriberUserService.refreshTokens(
      userPayload,
      ipClientPayload,
    );

    return { message: 'Successful', result: data };
  }

  //forgot password route
  @PublicRoute()
  @ApiOperation({
    summary: 'request for forgot password',
    description: 'this route is responsible for requsiting for forgot password',
  })
  @ApiBody({
    type: ForgotPassDto,
    description:
      'How to forgot password with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          email: 'noman@gmail.com',
        } as unknown as ForgotPassDto,
      },
    },
  })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPassDto: ForgotPassDto) {
    const data = await this.subscriberUserService.forgotPass(forgotPassDto);

    return { message: 'successful', result: data };
  }

  //change password through forgotpass
  @PublicRoute()
  @ApiOperation({
    summary: 'change password by forgot pass',
    description:
      'this route is responsible to change password that requested by forgot password',
  })
  @ApiBody({
    type: ChangeForgotPassDto,
    description:
      'How to change password by forgot pass with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          passResetToken: '2vAzIwDFKn9mV12Ejod9',
          password: '123456',
          passwordConfirm: '123456',
        } as unknown as ChangeForgotPassDto,
      },
    },
  })
  @Post('change-forgot-pass')
  async changeForgotPassword(
    @Body() changeForgotPassDto: ChangeForgotPassDto,
    @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  ) {
    const data = await this.subscriberUserService.changePasswordByForgotPass(
      changeForgotPassDto,
      ipClientPayload,
    );
    return { message: 'successful', result: data };
  }

  // create team for a user
  // @ApiOperation({
  //   summary: 'create team for a user',
  //   description: 'this route is responsible for create a team of a user',
  // })
  // @ApiBody({
  //   type: CreateTeamDto,
  //   description:
  //     'How to create a team of a user with body?... here is the example given below!',
  //   examples: {
  //     a: {
  //       summary: 'default',
  //       value: {
  //         name: 'raihan',
  //         email: 'raihan@gmail.com',
  //         password: '123456',
  //         passwordConfirm: '123456',
  //         permission: {
  //           add: 0,
  //           edit: 1,
  //           delete: 0,
  //         },
  //       } as unknown as CreateTeamDto,
  //     },
  //   },
  // })
  // @ApiBearerAuth('jwt')
  // @UseGuards(AtGuard)
  // @Post('team')
  // async teamCreate(
  //   @Body() createTeamDto: CreateTeamDto,
  //   @UserPayload() userPayload: UserInterface,
  //   @IpPlusClientAddress() ipClientPayload: IpClientInterface,
  // ) {
  //   const data = await this.subscriberUserService.createTeam(
  //     createTeamDto,
  //     userPayload,
  //     ipClientPayload,
  //   );
  //   return { message: 'successful', result: data };
  // }

  // get activity log
  @ApiOperation({
    summary: 'get activity log',
    description: 'this route is responsible for getting activity log',
  })
  @ApiBody({
    type: PaginationDataDto,
    description:
      'How to paginate get all activity data with pagination?... here is the example given below!',
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
  // @ApiParam({
  //   name: 'id',
  //   type: Number,
  //   description: 'for getting activity log required id',
  //   required: true,
  // })
  @ApiBearerAuth('jwt')
  @UseGuards(AtGuard)
  @Post('activity-log')
  async getActivityLog(
    @Body() paginationDataDto: PaginationDataDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.subscriberUserService.getActivityLog(
      paginationDataDto,
      userPayload,
    );

    return { message: 'successful!', result: data };
  }

  /**
   * Get SUBSCRIBER User Profile
   */
  @ApiBearerAuth('jwt')
  @UseGuards(AtGuard)
  @ApiOperation({
    summary: 'get SUBSCRIBER user profile by id',
  })
  @Get('single-profile')
  async singleProfile(@UserPayload() userPayload: UserInterface) {
    const data = await this.subscriberUserService.getSingleUser(userPayload);
    return { message: 'successful', result: data };
  }

  /**
   *  UPDATE SUBSCRIBER USER Profile
   */
  @ApiBearerAuth('jwt')
  @UseGuards(AtGuard)
  @Patch()
  @ApiOperation({
    summary: 'Update a SUBSCRIBER User data',
    description: 'This route is responsible for updating a SUBSCRIBER User',
  })
  @ApiBody({
    type: UpdateUserDto,
    description:
      'How to update an SUBSCRIBER user with body?... here is the example given below!',
    examples: {
      a: {
        summary: 'default',
        value: {
          name: 'string',
          mobile: 'string',
          gender: 'female',
          maritalStatus: 'married',
          birthDate: '2022-03-02',
          address: 'string',
        } as unknown as UpdateUserDto,
      },
    },
  })
  async updateSubscriberUser(
    @Body() updateUserDto: UpdateUserDto,
    @UserPayload() userPayload: UserInterface,
  ) {
    const data = await this.subscriberUserService.updateUserProfile(
      updateUserDto,
      userPayload,
    );
    return { message: 'Successful', result: data };
  }

  // get team data
  @ApiBearerAuth('jwt')
  @UseGuards(AtGuard)
  @Get('team-data')
  async teamData(@UserPayload() userPayload: UserInterface) {
    const data = await this.subscriberUserService.getTeamInfo(userPayload.id);
    return { message: 'success', result: data };
  }

  // get system delay data
  @ApiBearerAuth('jwt')
  @UseGuards(AtGuard)
  @Get('system-delay')
  async getDelay() {
    const data = await this.subscriberUserService.getSystemDelay();
    return { message: 'success', result: data };
  }

  // // finding ip

  // @Get('local-ip')
  // async myEndpoint(@IpPlusClientAddress() IpPlusClientAddress: any) {
  //   const test = IpPlusClientAddress;

  //   return { message: 'success', result: test };
  // }

  // // finding real ip

  // @Get('real-ip')
  // async myEndpointFunc(@RealIP() ip: string) {
  //   const test = ip;

  //   return { message: 'success', result: test };
  // }
}
