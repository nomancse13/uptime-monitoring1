/**dependencies */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as randomToken from 'rand-token';
import { decrypt, encrypt } from 'src/helper/crypto.helper';
import {
  AddHoursIntoDateTime,
  checkIsSameOrAfterNowDateTime,
  DateTime,
} from 'src/helper/date-time-helper';
import { UserBannedDto } from 'src/modules/admin/dtos';
import { SystemDelayEntity } from 'src/modules/admin/entities';
import { QueueMailDto } from 'src/modules/queue-mail/queue-mail.dto';
import { QueueMailService } from 'src/modules/queue-mail/queue-mail.service';
import { AuthService } from 'src/monitrix-auth/auth/auth.service';
import {
  AuthDto,
  ForgotPassDto,
  LoginDto,
  OtpVerifyDto,
  ResendOtpDto,
} from 'src/monitrix-auth/auth/dto';
import { ChangeForgotPassDto } from 'src/monitrix-auth/auth/dto/change-forgot-pass.dto';
import { ChangePasswordDto } from 'src/monitrix-auth/auth/dto/change-password.dto';
import { PaginationDataDto } from 'src/monitrix-auth/common/dtos';
import {
  ErrorMessage,
  StatusField,
  SuccessMessage,
  UserTypesEnum,
} from 'src/monitrix-auth/common/enum';
import { Pagination, UserInterface } from 'src/monitrix-auth/common/interfaces';
import { IpClientInterface } from 'src/monitrix-auth/common/interfaces/ip-client.interface';
import { Tokens } from 'src/monitrix-auth/common/type';
import { Brackets } from 'typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { v4 as uuidv4 } from 'uuid';
import { DomainService } from './domain';
import { ActivityLogDto, CreateTeamDto, UpdateTeamDto } from './dtos';
import { SubscriberUserEntity } from './entity';
// import { WorkspaceEntity } from './workspace/entity';
import { LogDetailsEntity } from './entity/log-details.entity';
import { IntegrationService } from './integrations/integration.service';
import { SSLService } from './ssl';
import { WebsiteService } from './website';
import { WorkspaceService } from './workspace/workspace.service';

@Injectable()
export class SubscriberUserService {
  constructor(
    @InjectRepository(SubscriberUserEntity)
    private subscriberUsersRepository: BaseRepository<SubscriberUserEntity>,
    @InjectRepository(LogDetailsEntity)
    private activityLogRepository: BaseRepository<LogDetailsEntity>,
    private readonly workspaceService: WorkspaceService,
    private readonly integrationService: IntegrationService,
    @InjectRepository(SystemDelayEntity)
    private systemDelayRepository: BaseRepository<SystemDelayEntity>,
    private readonly configService: ConfigService,
    private readonly queueMailService: QueueMailService,
    private readonly authService: AuthService,
    @Inject(forwardRef(() => DomainService))
    private readonly domainService: DomainService,
    // @Inject(forwardRef(() => BlacklistService))
    // private readonly blacklistService: BlacklistService,
    @Inject(forwardRef(() => SSLService))
    private readonly sslService: SSLService,
    @Inject(forwardRef(() => WebsiteService))
    private readonly websiteService: WebsiteService,
  ) {}

  // signup as a subscriber user
  async signupLocal(
    dto: AuthDto,
    ipClientPayload?: IpClientInterface,
  ): Promise<any> {
    const dataCheck = await this.subscriberUsersRepository.findOne({
      where: {
        email: dto.email,
      },
    });

    if (dataCheck) {
      throw new ConflictException('User already exist');
    } else {
      const secPass = await this.configService.get('GENERATE_SECRET_CODE');
      dto.password =
        dto && dto.password && dto.password.length > 1
          ? bcrypt.hashSync(dto.password, 10)
          : bcrypt.hashSync(secPass, 10);

      const otpData = await this.emailVerification(dto.email, dto.name);
      dto['otpCode'] = otpData.otpCode;
      dto['otpExpiresAt'] = otpData.otpExpiresAt;
      dto['status'] = StatusField.DRAFT;
      dto['uniqueId'] = uuidv4();

      const insertData = await this.subscriberUsersRepository.save(dto);
      let tokens;
      if (insertData) {
        tokens = await this.authService.getTokens({
          id: insertData.id,
          email: insertData.email,
          hashType: encrypt('subscriber'),
        });
        await this.updateRtHash(
          {
            id: insertData.id,
            email: insertData.email,
          },
          tokens.refresh_token,
        );
        const workspace = {
          name: 'Default',
          createdBy: insertData?.id,
          userId: insertData?.id,
        };
        const userPayload: any = {
          id: insertData?.id,
        };
        await this.workspaceService.createWorkspace(
          workspace,
          userPayload,
          ipClientPayload,
        );

        await this.integrationService.updateIntegration(
          1,
          {
            id: insertData?.id,
            email: insertData.email,
            hashType: encrypt('subscriber'),
          },
          ipClientPayload,
        );
      }
      return tokens;
    }
  }

  // sign in as a subscriber user
  async signinLocal(
    loginDto: LoginDto,
    ipClientPayload: IpClientInterface,
  ): Promise<Tokens> {
    const userRegCheck = await this.subscriberUsersRepository.findOne({
      where: {
        email: loginDto.email,
        status: StatusField.DRAFT,
      },
    });

    if (userRegCheck) {
      throw new BadRequestException(
        'Your Registration process were pending!!!',
      );
    }
    const user = await this.subscriberUsersRepository.findOne({
      where: {
        email: loginDto.email,
        status: StatusField.ACTIVE,
      },
    });

    if (!user) throw new ForbiddenException(ErrorMessage.NO_USER_FOUND);
    if (user.status === StatusField.BANNED)
      throw new ForbiddenException(
        `You are banned!! Please communicate with your authority.`,
      );

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!passwordMatches) throw new ForbiddenException('Invalid password!');

    const tokens = await this.authService.getTokens({
      id: user.id,
      email: user.email,
      hashType: encrypt(user.userType),
    });
    await this.updateRtHash({ id: user.id }, tokens.refresh_token);

    if (tokens) {
      const mainImage = `../../../assets/png-file/logo.png`;

      const mailData = new QueueMailDto();
      mailData.toMail = user.email;
      mailData.subject = `Monitrix: Login Message`;
      mailData.template = './login';

      mailData.context = {
        imgSrc: mainImage,
      };

      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: user.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `${user.id} no. user logged in`,
        },
      };
      await this.queueMailService.sendMail(mailData);

      await this.activityLog(log);
    }

    return tokens;
  }

  // update refresh token
  async updateRtHash(userPayload: any, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    const updatedData = {
      hashedRt: hash,
    };
    await this.subscriberUsersRepository.update(
      { id: userPayload.id },
      updatedData,
    );
  }
  async checkAllExist(uniqueIds: string[], parentId: number): Promise<boolean> {
    if (uniqueIds.length === 0) {
      return true;
    }
    const status = 'Active';
    for (const uniqueId of uniqueIds) {
      const exists = await this.subscriberUsersRepository.findOne({
        where: { parentId, uniqueId, status },
      });
      if (!exists) {
        return false;
      }
    }
    return true;
  }

  // logout user
  async logout(userPayload: UserInterface, ipClientPayload: IpClientInterface) {
    const updatedData = {
      hashedRt: null,
    };
    const isUpdated = await this.subscriberUsersRepository.update(
      { id: userPayload.id },
      updatedData,
    );

    // const userData = await this.subscriberUsersRepository.findOne({
    //   where: { id: userPayload.id },
    // });

    if (isUpdated.affected) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.INACTIVE,
          message: `${userPayload.id} No. user is logged out!`,
        },
      };

      await this.activityLog(log);
    }

    return isUpdated ? true : false;
  }

  // access token refreshed
  async refreshTokens(
    userPayload: any,
    ipClientPayload: IpClientInterface,
  ): Promise<Tokens> {
    const user = await this.subscriberUsersRepository.findOne({
      where: { id: userPayload.id },
    });

    if (!user || !user.hashedRt)
      throw new ForbiddenException(ErrorMessage.NO_USER_FOUND);

    const rtMatches = await bcrypt.compare(
      userPayload.refreshToken,
      user.hashedRt,
    );

    if (!rtMatches) throw new ForbiddenException('Token not matches!');

    const tokens = await this.authService.getTokens({
      id: user.id,
      email: user.email,
      hashType: encrypt(decrypt(userPayload.hashType)),
    });
    await this.updateRtHash(user.id, tokens.refresh_token);

    if (tokens) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userPayload.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `${user.id} no. user refresh his token!`,
        },
      };

      await this.activityLog(log);
    }

    return tokens;
  }

  //   forgot password
  async forgotPass(forgotPassDto: ForgotPassDto) {
    const userData = await this.validateUserByEmail(forgotPassDto.email);

    //generate password reset token
    const randomTokenString = randomToken.generate(20);
    const paswordResetLink = `${
      this.configService.get('APP_ENV') === 'development'
        ? this.configService.get('PUBLIC_CDN')
        : this.configService.get('PUBLIC_CDN')
    }reset-password?passResetToken=${randomTokenString}`;
    //if email validating fails
    if (!userData) {
      throw new NotFoundException(
        `No user found with email associated ${forgotPassDto.email}`,
      );
    }

    //update the data for pass reset
    const forgotPassRestUpdate = await this.updatePassResetToken(
      forgotPassDto,
      randomTokenString,
    );

    if (forgotPassRestUpdate && forgotPassRestUpdate.affected > 0) {
      // const cdnLink = await this.configService.get('PUBLIC_CDN');
      const mainImage = `../../../assets/png-file/logo.png`;

      const mailData = new QueueMailDto();
      mailData.toMail = userData.email;
      mailData.subject = `Reset password instructions for Monitrix account`;
      mailData.template = './forgot-password';
      mailData.context = {
        name: `${userData.name}`,
        resetLink: paswordResetLink,
        imgSrc: mainImage,
      };
      //send password reset link
      const sendMail = await this.queueMailService.sendMail(mailData);
      // if email is not sent then send errors
      if (sendMail != undefined) {
        throw new ConflictException(
          `${ErrorMessage.FAILED_TO_RESET} password!`,
        );
      }
    } else {
      throw new ConflictException(`${ErrorMessage.FAILED_TO_RESET} password!`);
    }
    return forgotPassDto.email;
  }

  //resend otp code
  async resendOtp(resendOtpDto: ResendOtpDto) {
    //create  otp data
    const emailOtp = crypto.randomBytes(3).toString('hex').toUpperCase();

    const currentDate = new Date();
    const otpExpiresAt = new Date(currentDate);
    otpExpiresAt.setHours(
      otpExpiresAt.getHours() +
        Number(this.configService.get('OTP_EXPIRATION')),
    );
    const otpData = {};
    otpData['otpCode'] = emailOtp;
    otpData['otpExpiresAt'] = otpExpiresAt;
    //check for existing draft user by email
    const checkExisting = await this.subscriberUsersRepository.findOne({
      where: {
        email: resendOtpDto.email,
        status: StatusField.DRAFT,
      },
    });
    //insert if the user is new
    if (!checkExisting) {
      throw new ForbiddenException('No user found!');
    } else {
      //update the if the user exist in the system but draft
      await this.subscriberUsersRepository.update(
        { id: checkExisting.id },
        otpData,
      );
    }

    const userDataReg = {
      name: checkExisting.name,
      email: checkExisting.email,
    };
    //send email
    const mailData = new QueueMailDto();
    // const verificationLink = `${
    //   this.configService.get('APP_ENV') === 'development'
    //     ? this.configService.get('DEV_FRONTEND_DOMAIN')
    //     : this.configService.get('PROD_FRONTEND_DOMAIN')
    // }email-verification?type=${resendOtpDto.userTypeSlug}&email=${
    //   resendOtpDto.email
    // }`;
    // const cdnLink = await this.configService.get('PUBLIC_CDN');
    const mainImage = `../../../assets/png-file/logo.png`;
    mailData.toMail = userDataReg.email;
    mailData.subject = `Monitrix: Email Verification Code`;
    mailData.template = `./verification`;
    mailData.context = {
      name: `${userDataReg.name}`,
      code: emailOtp,
      //   verificationLink: verificationLink,
      imgSrc: mainImage,
    };

    //send email
    await this.queueMailService.sendMail(mailData);

    return `Please check your email at ${resendOtpDto.email}`;
  }

  //password change
  async passwordChanged(
    changePasswordDto: ChangePasswordDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    const updateData = {};
    updateData['password'] = await this.hashPassword(
      changePasswordDto.password,
    );
    const data = await this.subscriberUsersRepository.findOne({
      where: {
        id: userPayload.id,
      },
    });

    //if data is empty
    if (!data) {
      throw new NotFoundException('No user found!');
    }

    //validate old password
    const oldPassValidate = await this.compareUserPassword(
      changePasswordDto.oldPassword,
      data.password,
    );
    if (oldPassValidate == true) {
      await this.subscriberUsersRepository.update(
        { id: userPayload.id },
        updateData,
      );
    } else {
      return 'password not matched!';
    }

    const log = {
      ipAddress: ipClientPayload.ip,
      browser: ipClientPayload.browser,
      time: DateTime(),
      userId: userPayload.id,
      messageDetails: {
        status: StatusField.ACTIVE,
        message: `${userPayload.id} user changes his password.`,
      },
    };

    await this.activityLog(log);

    //app sign in link
    const signInLink = `#`;
    // `${
    //   this.configService.get('APP_ENV') === 'development'
    //     ? this.configService.get('DEV_FRONTEND_DOMAIN')
    //     : this.configService.get('PROD_FRONTEND_DOMAIN')
    // }/signin`;
    //send email for password change

    // const cdnLink = await this.configService.get('PUBLIC_CDN');
    const mainImage = `../../../assets/png-file/logo.png`;

    const mailData = new QueueMailDto();
    mailData.toMail = data.email;
    mailData.subject = `Monitrix: Password Changed`;
    mailData.template = './change-password';
    mailData.context = {
      signInLink: signInLink,
      imgSrc: mainImage,
    };
    await this.queueMailService.sendMail(mailData);

    return `Password changed successfully`;
  }

  //compare password
  async compareUserPassword(newPassword: string, oldPassword: string) {
    const comparePass = bcrypt.compareSync(newPassword, oldPassword);
    if (comparePass === false) {
      throw new BadRequestException('Old password does not match');
    }
    return true;
  }
  //hash password
  async hashPassword(password: string) {
    return bcrypt.hashSync(password, 10);
  }

  //validate user by email
  async validateUserByEmail(email: string) {
    const userData = await this.subscriberUsersRepository.findOne({
      where: {
        email: email,
      },
    });

    if (!userData) {
      throw new NotFoundException(ErrorMessage.EMAIL_NOT_FOUND);
    }
    delete userData.password;

    return userData;
  }

  //update user pass reset
  async updatePassResetToken(
    forgotPassDto: ForgotPassDto,
    passResetToken: string,
  ) {
    //set pass reset expiry date time
    const currentDate = new Date();
    const passResetExpireAt = new Date(currentDate);
    passResetExpireAt.setHours(
      passResetExpireAt.getHours() +
        Number(this.configService.get('PASS_RESET_EXPIRY', 1)),
    );
    //prepare data to be updated
    const updateData = {};
    updateData['passResetToken'] = passResetToken;
    updateData['passResetTokenExpireAt'] = passResetExpireAt;

    const { email } = forgotPassDto;
    const userData = await this.subscriberUsersRepository.update(
      { email: email },
      updateData,
    );

    return userData;
  }

  //change password by forgot password
  async changePasswordByForgotPass(
    changeForgotPassDto: ChangeForgotPassDto,
    ipClientPayload: IpClientInterface,
  ) {
    //validate pass reset token data and return user information from it
    const userData = await this.validatePassResetToken(changeForgotPassDto);

    //check for pass reset token expiry
    const currentDate = new Date();

    if (new Date(currentDate) >= userData.passResetTokenExpireAt) {
      throw new ForbiddenException(`Pass Reset ${ErrorMessage.TOKEN_EXPIRED}`);
    }

    //update the password of the user
    const encryptedPassword = await this.hashPassword(
      changeForgotPassDto.password,
    );
    const updatedData = await this.updateUserPasswordData(
      userData.id,
      encryptedPassword,
    );

    if (updatedData) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: userData.id,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `${userData.id} No. user changes his password by forgot password route`,
        },
      };

      await this.activityLog(log);
    }
    //app sign in link
    const signInLink = '#';
    // if (changeForgotPassDto.userTypeSlug == UserTypesEnum.MENTOR) {
    //   signInLink = `${
    //     this.configService.get('APP_ENV') === 'development'
    //       ? this.configService.get('DEV_FRONTEND_MENTOR_DOMAIN')
    //       : this.configService.get('DEV_FRONTEND_MENTOR_DOMAIN')
    //   }/signin`;
    // } else {
    //   signInLink = `${
    //     this.configService.get('APP_ENV') === 'development'
    //       ? this.configService.get('DEV_FRONTEND_DOMAIN')
    //       : this.configService.get('PROD_FRONTEND_DOMAIN')
    //   }/signin`;
    // }
    // const cdnLink = await this.configService.get('PUBLIC_CDN');
    // const mainImage = `${cdnLink}ADMIN/logo-unisearch-67e1c334-cbc7-47cd-80d1-75ac4ed60dbb.png`;
    const mainImage = '#';
    const mailData = new QueueMailDto();
    mailData.toMail = updatedData.email;
    mailData.subject = `Monitrix: Password Changed`;
    mailData.template = './change-password';
    mailData.context = {
      signInLink: signInLink,
      imgSrc: mainImage,
    };
    await this.queueMailService.sendMail(mailData);

    return updatedData.email;
  }

  //validate pass reset token
  async validatePassResetToken(changeForgotPassDto: ChangeForgotPassDto) {
    const { passResetToken } = changeForgotPassDto;
    const userData = await this.subscriberUsersRepository.findOne({
      where: {
        passResetToken: passResetToken,
      },
    });

    //user data error not found
    if (!userData) {
      throw new NotFoundException(
        `Password reset ${ErrorMessage.INFO_NOT_FOUND}.Please request a new one!`,
      );
    }

    return userData;
  }
  //update user password data
  async updateUserPasswordData(userId: number, encryptedPassword: string) {
    const updateData = {
      password: encryptedPassword,
      passResetToken: null,
      passResetTokenExpireAt: null,
    };

    const userData = await this.subscriberUsersRepository
      .createQueryBuilder()
      .update(SubscriberUserEntity, updateData)
      .where('id = :id', { id: userId })
      .returning('*')
      .execute();

    if (!userData) {
      throw new NotFoundException(`${ErrorMessage.UPDATE_FAILED}`);
    }

    return userData.raw[0];
  }
  // email verification
  async emailVerification(email: string, name: string) {
    const emailOtp = crypto.randomBytes(3).toString('hex').toUpperCase();

    const otpExpiresAt = AddHoursIntoDateTime(
      this.configService.get('OTP_EXPIRATION') ?? 2,
    );

    const mailData = new QueueMailDto();
    // const verificationLink = `${
    //   this.configService.get('APP_ENV') === 'development'
    //     ? this.configService.get('DEV_FRONTEND_DOMAIN')
    //     : this.configService.get('PROD_FRONTEND_DOMAIN')
    // }email-verification?type=${userDataReg.userTypeSlug}&email=${
    //   userDataReg.email
    // }`;
    // const cdnLink = await this.configService.get('PUBLIC_CDN');
    const mainImage = `../../../assets/png-file/logo.png`;
    mailData.toMail = email;
    mailData.subject = `Monitrix: Email Verification Code`;
    mailData.template = `./verification`;
    mailData.context = {
      name: name,
      code: emailOtp,
      //   verificationLink: verificationLink,
      imgSrc: mainImage,
    };
    //send email
    await this.queueMailService.sendMail(mailData);

    return {
      otpCode: emailOtp,
      otpExpiresAt: otpExpiresAt,
    };
  }

  //verify otp data
  async verifyOtp(otpDataDto: OtpVerifyDto) {
    const data = await this.subscriberUsersRepository.findOne({
      where: {
        otpCode: otpDataDto.otpCode,
      },
    });

    //if data is empty
    if (!data) {
      throw new ForbiddenException('Invalid code or expired!');
    }

    if (checkIsSameOrAfterNowDateTime(data.otpExpiresAt) === true) {
      throw new ForbiddenException(
        'OTP code expired.Please request a new One!',
      );
    }
    const updateData = {
      otpCode: null,
      otpExpiresAt: null,
      status: StatusField.ACTIVE,
    };

    //update the otp fields
    if (data) {
      await this.subscriberUsersRepository.update({ id: data.id }, updateData);
    }

    return {
      message: `${data.email} verified successfully.Please login to continue!`,
    };
  }

  // create team for a user

  async createTeam(
    createTeamDto: CreateTeamDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) !== UserTypesEnum.SUBSCRIBER) {
      throw new NotFoundException('Unknown UserType!');
    }
    const dataCheck = await this.subscriberUsersRepository.findOne({
      where: {
        email: createTeamDto.email,
      },
    });

    if (dataCheck) {
      throw new ConflictException('User already exist');
    } else {
      const secPass = await this.configService.get('GENERATE_SECRET_CODE');

      createTeamDto.password =
        createTeamDto &&
        createTeamDto.password &&
        createTeamDto.password.length > 1
          ? bcrypt.hashSync(createTeamDto.password, 10)
          : bcrypt.hashSync(secPass, 10);

      createTeamDto['uniqueId'] = uuidv4();
      createTeamDto['parentId'] = userPayload.id;
      createTeamDto['userType'] = UserTypesEnum.TEAMMEMBER;

      const insertData = await this.subscriberUsersRepository.save(
        createTeamDto,
      );

      if (insertData) {
        const workspace = {
          name: 'Default',
          createdBy: insertData?.id,
          userId: insertData?.id,
        };
        const userPayload: any = {
          id: insertData?.id,
        };
        await this.workspaceService.createWorkspace(
          workspace,
          userPayload,
          ipClientPayload,
        );
        const log = {
          ipAddress: ipClientPayload.ip,
          browser: ipClientPayload.browser,
          time: DateTime(),
          userId: userPayload.id,
          messageDetails: {
            status: StatusField.ACTIVE,
            message: `new team created`,
            services: {
              tag: 'Team',
              value: createTeamDto.name,
              identity: userPayload.id,
            },
          },
        };
        await this.activityLog(log);
      }

      return insertData
        ? SuccessMessage.INSERT_SUCCESS
        : ErrorMessage.INSERT_FAILED;
    }
  }

  // update team for a user

  async updateTeam(
    id: number,
    userPayload: UserInterface,
    updateTeamDto: UpdateTeamDto,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) !== UserTypesEnum.SUBSCRIBER) {
      throw new NotFoundException('Unknown UserType!');
    }

    const dataCheck = await this.subscriberUsersRepository
      .createQueryBuilder('user')
      .where(`user.email = '${updateTeamDto.email}'`)
      .andWhere(`user.id != ${id}`)
      .getOne();

    if (dataCheck) {
      throw new ConflictException('User already exist');
    } else {
      const secPass = await this.configService.get('GENERATE_SECRET_CODE');
      if (updateTeamDto.password) {
        updateTeamDto.password =
          updateTeamDto &&
          updateTeamDto.password &&
          updateTeamDto.password.length > 1
            ? bcrypt.hashSync(updateTeamDto.password, 10)
            : bcrypt.hashSync(secPass, 10);
      }

      updateTeamDto['parentId'] = userPayload.id;
      updateTeamDto['userType'] = UserTypesEnum.TEAMMEMBER;

      delete updateTeamDto.passwordConfirm;

      const updatedData = await this.subscriberUsersRepository
        .createQueryBuilder()
        .where(`id = ${id}`)
        .andWhere(`parentId = ${userPayload.id}`)
        .update(SubscriberUserEntity, updateTeamDto)
        .returning('*')
        .execute();

      if (updatedData.affected > 0) {
        const log = {
          ipAddress: ipClientPayload.ip,
          browser: ipClientPayload.browser,
          time: DateTime(),
          userId: userPayload.id,
          messageDetails: {
            status: StatusField.ACTIVE,
            message: `team updated`,
            services: {
              tag: 'Team',
              value: updateTeamDto.name,
              identity: userPayload.id,
            },
          },
        };
        await this.activityLog(log);
      }

      return updatedData.affected > 0
        ? updatedData.raw.map(
            ({ otpCode, otpExpiresAt, hashedRt, ...item }) => item,
          )
        : ErrorMessage.UPDATE_FAILED;
    }
  }

  // find user by id

  async findUserById(id: number) {
    const data = await this.subscriberUsersRepository.findOne({
      where: { id: id },
    });
    if (!data) throw new ForbiddenException(ErrorMessage.NO_USER_FOUND);
    delete data.password;
    delete data.hashedRt;
    // delete data.teamPassword;
    delete data.otpCode;
    delete data.otpExpiresAt;
    return data;
  }

  // get all subscriber team information

  async findAllSubscriberTeam(
    paginationDataDto: PaginationDataDto,
    userPayload: UserInterface,
  ) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [result, total] = await this.subscriberUsersRepository
      .createQueryBuilder('user')
      // .leftJoinAndMapOne(
      //   'user.domain',
      //   DomainEntity,
      //   'domain',
      //   `user.id = domain.userId`,
      // )
      // .leftJoinAndMapOne(
      //   'user.blacklist',
      //   BlacklistEntity,
      //   'blacklist',
      //   `user.id = blacklist.userId`,
      // )
      // .leftJoinAndMapOne('user.ssl', SSLEntity, 'ssl', `user.id = ssl.userId`)
      .where(
        new Brackets((qb) => {
          if (
            paginationDataDto.filter &&
            Object.keys(paginationDataDto.filter).length > 0
          ) {
            Object.keys(paginationDataDto.filter).forEach(function (key) {
              if (paginationDataDto.filter[key] !== '') {
                if (key === 'status') {
                  qb.andWhere(
                    `user.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(user.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .andWhere(`user.parentId = ${userPayload.id}`)
      .orderBy(
        `user.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    let results = result.map(
      ({ otpCode, password, otpExpiresAt, hashedRt, ...item }) => item,
    );

    results = await Promise.all(
      results.map(async (element: any) => {
        const countDomain = await this.domainService.domainCount(element.id);
        // const countBlacklist = await this.blacklistService.blacklistCount(
        //   element.id,
        // );
        const countSSL = await this.sslService.sslCount(element.id);
        const countWebsite = await this.websiteService.websiteCount(element.id);
        return {
          ...element,
          totalDomain: countDomain ? countDomain : 0,
          // totalBlacklist: countBlacklist ? countBlacklist : 0,
          totalSSL: countSSL ? countSSL : 0,
          totalWebsite: countWebsite ? countWebsite : 0,
        };
      }),
    );

    return new Pagination<any>({
      results,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  // delete team of a subscriber user

  async deleteTeam(userPayload: UserInterface, id: number) {
    const data = await this.subscriberUsersRepository.delete({
      id: id,
      parentId: userPayload.id,
    });

    return data.affected > 0
      ? `delete successfully!`
      : ErrorMessage.DELETE_FAILED;
  }

  // get all subscriber user information

  async findAllSubscriberUser(
    paginationDataDto: PaginationDataDto,
    userPayload: UserInterface,
  ) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [result, total] = await this.subscriberUsersRepository
      .createQueryBuilder('user')
      // .leftJoinAndMapOne(
      //   'user.domain',
      //   DomainEntity,
      //   'domain',
      //   `user.id = domain.userId`,
      // )
      // .leftJoinAndMapOne(
      //   'user.blacklist',
      //   BlacklistEntity,
      //   'blacklist',
      //   `user.id = blacklist.userId`,
      // )
      // .leftJoinAndMapOne('user.ssl', SSLEntity, 'ssl', `user.id = ssl.userId`)
      .where(
        new Brackets((qb) => {
          if (
            paginationDataDto.filter &&
            Object.keys(paginationDataDto.filter).length > 0
          ) {
            Object.keys(paginationDataDto.filter).forEach(function (key) {
              if (paginationDataDto.filter[key] !== '') {
                if (key === 'status') {
                  qb.andWhere(
                    `user.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(user.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .orderBy(
        `user.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    let results = result.map(
      ({ otpCode, password, otpExpiresAt, hashedRt, ...item }) => item,
    );

    results = await Promise.all(
      results.map(async (element: any) => {
        const countDomain = await this.domainService.domainCount(element.id);
        // const countBlacklist = await this.blacklistService.blacklistCount(
        //   element.id,
        // );
        const countSSL = await this.sslService.sslCount(element.id);
        const countWebsite = await this.websiteService.websiteCount(element.id);
        return {
          ...element,
          totalDomain: countDomain ? countDomain : 0,
          // totalBlacklist: countBlacklist ? countBlacklist : 0,
          totalSSL: countSSL ? countSSL : 0,
          totalWebsite: countWebsite ? countWebsite : 0,
        };
      }),
    );

    return new Pagination<any>({
      results,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  // impersonate to user from admin

  async loginToUserFromAdmin(
    id: number,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    let getUser: any;
    if (decrypt(userPayload.hashType) === UserTypesEnum.ADMIN) {
      getUser = await this.findUserById(id);
    } else {
      throw new NotFoundException('Unknown UserType!');
    }

    if (!getUser) throw new ForbiddenException(ErrorMessage.NO_USER_FOUND);

    const tokens = await this.authService.getTokens({
      id: getUser.id,
      email: getUser.email,
      hashType: encrypt(getUser.userType),
    });
    await this.updateRtHash({ id: getUser.id }, tokens.refresh_token);

    if (tokens) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: 0,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `admin entered into ${userPayload.id} no. user dashboard`,
        },
      };

      await this.activityLog(log);
    }

    return tokens;
  }

  // subsriber user banned by admin
  async bannedUserByAdmin(
    id: number,
    userBannedDto: UserBannedDto,
    userPayload: UserInterface,
    ipClientPayload: IpClientInterface,
  ) {
    if (decrypt(userPayload.hashType) !== UserTypesEnum.ADMIN) {
      throw new NotFoundException('Unknown UserType!');
    }

    const updateData = {
      status: userBannedDto.status,
    };

    const data = await this.subscriberUsersRepository.update(
      { id: id },
      updateData,
    );

    if (data.affected > 0) {
      const log = {
        ipAddress: ipClientPayload.ip,
        browser: ipClientPayload.browser,
        time: DateTime(),
        userId: 0,
        messageDetails: {
          status: StatusField.ACTIVE,
          message: `admin banned the user. User id was ${userPayload.id}`,
        },
      };

      await this.activityLog(log);
    }

    return data.affected > 0 ? `User Banned Successfully!` : 'Not Banned!';
  }

  // activity log

  async activityLog(activityLogDto: ActivityLogDto) {
    try {
      const data = await this.activityLogRepository.save(activityLogDto);
      return data ? true : false;
    } catch (e) {
      return `log insertion failed!`;
    }
  }

  // get activity log by userId
  async getActivityLog(
    paginationDataDto: PaginationDataDto,
    userPayload: UserInterface,
  ) {
    const limit = paginationDataDto.pageSize ? paginationDataDto.pageSize : 10;
    const page = paginationDataDto.pageNumber
      ? paginationDataDto.pageNumber == 1
        ? 0
        : paginationDataDto.pageNumber
      : 1;

    const [results, total] = await this.activityLogRepository
      .createQueryBuilder('log')
      .where(
        new Brackets((qb) => {
          if (
            paginationDataDto.filter &&
            Object.keys(paginationDataDto.filter).length > 0
          ) {
            Object.keys(paginationDataDto.filter).forEach(function (key) {
              if (paginationDataDto.filter[key] !== '') {
                if (key === 'status') {
                  qb.andWhere(
                    `log.${key} = '${paginationDataDto.filter[key]}'`,
                  );
                } else {
                  qb.andWhere(
                    `CAST(log.${key} as VARCHAR) ILIKE ('%${paginationDataDto.filter[key]}%')`,
                  );
                }
              }
            });
          }
        }),
      )
      .andWhere(`log."userId" = ${userPayload.id}`)
      .orderBy(
        `log.${paginationDataDto.sortField}`,
        paginationDataDto.sortOrder,
      )
      .take(limit)
      .skip(page > 0 ? page * limit - limit : page)
      .getManyAndCount();

    return new Pagination<any>({
      results,
      total,
      currentPage: page === 0 ? 1 : page,
      limit,
    });
  }

  // get single user
  async getSingleUser(userPayload: UserInterface) {
    const singleUserData = await this.subscriberUsersRepository
      .createQueryBuilder('user')
      .where(`user.id = ${userPayload.id}`)
      .select([
        `user.id`,
        `user.userType`,
        `user.name`,
        `user.email`,
        `user.mobile`,
        `user.parentId`,
        `user.gender`,
        `user.maritalStatus`,
        `user.birthDate`,
        `user.address`,
        `user.permission`,
      ])
      .getOne();

    if (singleUserData) {
      return singleUserData;
    } else {
      throw new BadRequestException(`data not found`);
    }
  }

  // update user
  async updateUserProfile(updateUserDto: any, userPayload: UserInterface) {
    updateUserDto['updatedAt'] = new Date();
    updateUserDto['updatedBy'] = userPayload.id;

    if (updateUserDto?.email) {
      const dataCheck = await this.subscriberUsersRepository
        .createQueryBuilder('user')
        .where(`user.email='${updateUserDto.email}'`)
        .andWhere(`user.id != ${userPayload.id}`)
        .getOne();

      if (dataCheck) {
        return `Email you provided, already exist. Please fill another email.`;
      }
    }

    const data = await this.subscriberUsersRepository
      .createQueryBuilder()
      .update(SubscriberUserEntity, updateUserDto)
      .where(`id = '${userPayload.id}'`)
      .returning('*')
      .execute();

    return data ? `updated successfully!` : ErrorMessage.UPDATE_FAILED;
  }

  // get team info

  async getTeamInfo(userId: number) {
    const data = await this.subscriberUsersRepository
      .createQueryBuilder('team')
      .where(`team.parentId=${userId}`)
      .select([`team.uniqueId`, `team.name`])
      .getMany();

    return data ? data : [];
  }

  // check add for permission

  async checkPermissionforAdd(userPayload: UserInterface) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      const getInfo = await this.findUserById(userPayload.id);

      if (!(getInfo && getInfo.permission && getInfo.permission['add'] == 1)) {
        throw new BadRequestException(`You have no permission to add!!!`);
      }
    }
  }

  // check edit for permission

  async checkPermissionforEdit(userPayload: UserInterface) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      const getInfo = await this.findUserById(userPayload.id);

      if (!(getInfo && getInfo.permission && getInfo.permission['edit'] == 1)) {
        throw new BadRequestException(`You have no permission to edit!!!`);
      }
    }
  }

  //   get Installed integration

  async getInstalledIntegrationIds(id: number) {
    const data: any = await this.subscriberUsersRepository
      .createQueryBuilder('user')
      .select('user.integrationIds')
      .where(`user.id=${id}`)
      .getOne();

    if (data) {
      return data;
    } else {
      throw new NotFoundException(`Data Not Found!`);
    }
  }

  //   update Installed integration

  async updateInstalledIntegrationIds(userId: number, ids: number[]) {
    const data: any = await this.subscriberUsersRepository
      .createQueryBuilder()
      .update(SubscriberUserEntity)
      .set({ integrationIds: ids })
      .where(`id = '${userId}'`)
      .execute();

    if (data) {
      return data;
    } else {
      throw new NotFoundException(`Data Not Found!`);
    }
  }

  // check edit for permission

  async checkPermissionforDelete(userPayload: UserInterface) {
    if (decrypt(userPayload.hashType) === UserTypesEnum.TEAMMEMBER) {
      const getInfo = await this.findUserById(userPayload.id);

      if (
        !(getInfo && getInfo.permission && getInfo.permission['delete'] == 1)
      ) {
        throw new BadRequestException(`You have no permission to delete!!!`);
      }
    }
  }

  // system delay data

  async getSystemDelay() {
    const data = await this.systemDelayRepository.find();
    return data.length > 0 ? data : [];
  }

  //get team info by ids
  async getTeamInfoByIds(uniqueIds: any) {
    const data = await this.subscriberUsersRepository
      .createQueryBuilder('team')
      .where(`"status" = '${StatusField.ACTIVE}'`)
      .andWhere('"uniqueId" IN(:...ids)', { ids: uniqueIds })
      .select(['team.uniqueId as "value"', 'team.name as "label"'])
      .getRawMany();

    return data;
  }
}
