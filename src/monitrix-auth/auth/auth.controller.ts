/**dependencies */
import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger/dist';
import { UserService } from 'src/modules/admin/user/user.service';
/**services */
import { AuthService } from './auth.service';
/**guards */
//swagger doc
@ApiTags('MONITRIX|Auth')
@Controller({
  //path name
  path: 'auth',
  //route version
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  // @PublicRoute()
  // @Post('local/signup')
  // @HttpCode(HttpStatus.CREATED)
  // async signupLocal(@Body() dto: AuthDto) {
  //   const data = await this.authService.signupLocal(dto);

  //   return { message: 'Successful', result: data };
  // }

  // @PublicRoute()
  // @Post('local/signin')
  // @HttpCode(HttpStatus.OK)
  // async signinLocal(@Body() dto: LoginDto): Promise<any> {
  //   const data = await this.authService.signinLocal(dto);
  //   return { message: 'Successful', result: data };
  // }

  // @ApiBearerAuth('jwt')
  // @UseGuards(AtGuard)
  // @Post('logout')
  // async logout(@UserPayload() user: UserInterface) {
  //   const data = await this.authService.logout(user);

  //   return { message: 'Successful', result: data };
  // }

  // @ApiBearerAuth('jwt')
  // @UseGuards(AtGuard)
  // @Get(':id')
  // async getUser(@Param('id') id: number) {
  //   const data = await this.authService.getUserById(id);

  //   return { message: 'Successful', result: data };
  // }

  // @ApiBearerAuth('jwt')
  // @UseGuards(RtGuard)
  // @Post('refresh')
  // @HttpCode(HttpStatus.OK)
  // refreshTokens(
  //   @UserPayload() user: UserInterface,
  //   @UserPayload('refreshToken') refreshToken: string,
  // ): Promise<Tokens> {
  //   return this.authService.refreshTokens(user.id, refreshToken);
  // }

  @Post('local')
  async mailtest(): Promise<any> {
    const data = await this.authService.testMail();
    return data;
  }

  // //verify otp data
  // @ApiOperation({
  //   summary: 'verify email otp code',
  //   description:
  //     'this route is responsible for verifying email OTP code that is sent to user',
  // })
  // @ApiBody({
  //   type: OtpVerifyDto,
  //   description:
  //     'How to verify email otp code with body?... here is the example given below!',
  //   examples: {
  //     a: {
  //       summary: 'default',
  //       value: {
  //         otpCode: '35FF0C',
  //         userTypeSlug: 'admin',
  //       } as unknown as OtpVerifyDto,
  //     },
  //   },
  // })
  // @Post('verify-otp')
  // async verifyOtp(@Body() otpDataDto: OtpVerifyDto) {
  //   const data = await this.userService.verifyOtp(otpDataDto);
  //   return { message: 'successful', result: data };
  // }

  // //resend otp code
  // @ApiOperation({
  //   summary: 'resend user otp code',
  //   description: 'this route is responsible for resend otp code',
  // })
  // @ApiBody({
  //   type: ResendOtpDto,
  //   description:
  //     'How to resend otp code with body?... here is the example given below!',
  //   examples: {
  //     a: {
  //       summary: 'default',
  //       value: {
  //         email: 'noman@gmail.com',
  //         userTypeSlug: 'admin',
  //       } as unknown as ResendOtpDto,
  //     },
  //   },
  // })
  // @Post('resend-otp')
  // async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
  //   const data = await this.userService.resendOtp(resendOtpDto);
  //   return { message: 'successful', result: data };
  // }

  // // change password
  // @ApiBearerAuth('jwt')
  // @ApiOperation({
  //   summary: 'change authenticated users password',
  //   description:
  //     'this route is responsible for changing password for all type of users',
  // })
  // @ApiBody({
  //   type: ChangePasswordDto,
  //   description:
  //     'How to change password with body?... here is the example given below!',
  //   examples: {
  //     a: {
  //       summary: 'default',
  //       value: {
  //         oldPassword: '123456',
  //         password: '123456',
  //         passwordConfirm: '123456',
  //       } as unknown as ChangePasswordDto,
  //     },
  //   },
  // })
  // @UseGuards(AtGuard)
  // @Post('change-password')
  // async changePassword(
  //   @Body() changePasswordData: ChangePasswordDto,
  //   @UserPayload() userPayload: UserInterface,
  // ) {
  //   const data = await this.userService.passwordChanged(
  //     changePasswordData,
  //     userPayload,
  //   );

  //   return { message: 'Successful', result: data };
  // }

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

  // //change password through forgotpass
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
