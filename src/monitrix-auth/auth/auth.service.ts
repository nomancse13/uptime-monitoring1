import { BadRequestException, Injectable } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common/exceptions';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { encrypt } from 'src/helper/crypto.helper';
import { AddHoursIntoDateTime } from 'src/helper/date-time-helper';
import { User } from 'src/modules/admin/user/entity/user.entity';
import { UserService } from 'src/modules/admin/user/user.service';
import { QueueMailDto } from 'src/modules/queue-mail/queue-mail.dto';
import { QueueMailService } from 'src/modules/queue-mail/queue-mail.service';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { ErrorMessage, StatusField, UserTypesEnum } from '../common/enum';
import { UserInterface } from '../common/interfaces';
import { Tokens } from '../common/type/token.type';
import { AuthDto } from './dto/auth.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: BaseRepository<User>,
    private jwtService: JwtService,
    private readonly queueMailService: QueueMailService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  // ********** ADMIN USER ********

  // sign up user
  async signupLocal(dto: AuthDto): Promise<any> {
    const dataCheck = await this.usersRepository.findOne({
      where: {
        email: dto.email,
      },
    });

    if (dataCheck) {
      return `this mail is already exist!`;
    } else {
      const secPass = await this.configService.get('GENERATE_SECRET_CODE');
      dto.password =
        dto && dto.password && dto.password.length > 1
          ? bcrypt.hashSync(dto.password, 10)
          : bcrypt.hashSync(secPass, 10);

      const insertData = await this.usersRepository.save(dto);
      let tokens;
      if (insertData) {
        tokens = await this.getTokens({
          id: insertData.id,
          email: insertData.email,
          hashType: encrypt(UserTypesEnum.ADMIN),
        });
        await this.updateRtHash(
          {
            id: insertData.id,
            email: insertData.email,
          },
          tokens.refresh_token,
        );
      }
      return tokens;
    }
  }

  // sign in
  async signinLocal(loginDto: LoginDto): Promise<Tokens> {
    const userRegCheck = await this.usersRepository.findOne({
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
    const user = await this.usersRepository.findOne({
      where: {
        email: loginDto.email,
        status: StatusField.ACTIVE,
      },
    });

    if (!user) throw new ForbiddenException(ErrorMessage.NO_USER_FOUND);

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!passwordMatches) throw new ForbiddenException('Invalid password!');

    const tokens = await this.getTokens({
      id: user.id,
      email: user.email,
      hashType: encrypt(UserTypesEnum.ADMIN),
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

      // const log = {
      //   ipAddress: ipClientPayload.ip,
      //   browser: ipClientPayload.browser,
      //   time: DateTime(),
      //   userId: user.id,
      //   messageDetails: {
      //     status: StatusField.ACTIVE,
      //     message: `${user.id} no. user logged in`,
      //   },
      // };

      // await this.activityLog(log);

      await this.queueMailService.sendMail(mailData);
    }
    return tokens;
  }

  // get tokens FOR ALL
  async getTokens(userPayload: UserInterface) {
    const payload = {
      id: userPayload.id,
      email: userPayload.email,
      hashType: userPayload.hashType,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('AT_SECRET'),
        expiresIn: '10d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('RT_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  // update refresh token
  async updateRtHash(userPayload: any, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    const updatedData = {
      hashedRt: hash,
    };
    await this.usersRepository.update({ id: userPayload.id }, updatedData);
  }

  // logout user
  async logout(userPayload: UserInterface) {
    const updatedData = {
      hashedRt: null,
    };
    const isUpdated = await this.usersRepository.update(
      { id: userPayload.id },
      updatedData,
    );

    return isUpdated ? true : false;
  }

  // token refresh
  async refreshTokens(userId: number, rt: string): Promise<Tokens> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user || !user.hashedRt)
      throw new ForbiddenException(ErrorMessage.NO_USER_FOUND);

    const rtMatches = await bcrypt.compare(rt, user.hashedRt);

    if (!rtMatches) throw new ForbiddenException('Token not matches!');

    const tokens = await this.getTokens({
      id: user.id,
      email: user.email,
      hashType: encrypt(UserTypesEnum.ADMIN),
    });
    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
  }

  // get user by id
  async getUserById(userId: number) {
    const data = await this.usersRepository.findOne({ where: { id: userId } });
    return data;
  }

  // test mail

  async testMail() {
    const mailData = new QueueMailDto();

    mailData.toMail = `noman@gmail.com`;
    mailData.subject = 'Test Purpose';
    mailData.bodyHTML = 'Test Purpose';

    return await this.queueMailService.sendMail(mailData);
  }

  // *******Common use api ******

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
}
