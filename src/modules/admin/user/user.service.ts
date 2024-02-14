import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueueMailDto } from 'src/modules/queue-mail/queue-mail.dto';
import { QueueMailService } from 'src/modules/queue-mail/queue-mail.service';
import { ChangePasswordDto } from 'src/monitrix-auth/auth/dto/change-password.dto';
import { ErrorMessage } from 'src/monitrix-auth/common/enum';
import { UserInterface } from 'src/monitrix-auth/common/interfaces';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { User } from './entity/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: BaseRepository<User>,
    private readonly configService: ConfigService,
    private readonly queueMailService: QueueMailService,
  ) {}
  //password change
  async passwordChanged(
    changePasswordDto: ChangePasswordDto,
    userPayload: UserInterface,
  ) {
    const updateData = {};
    updateData['password'] = await this.hashPassword(
      changePasswordDto.password,
    );
    const data = await this.usersRepository.findOne({
      where: {
        id: userPayload.id,
      },
    });

    //validate old password
    const oldPassValidate = await this.compareUserPassword(
      changePasswordDto.oldPassword,
      data.password,
    );
    if (oldPassValidate) {
      await this.usersRepository.update({ id: userPayload.id }, updateData);
    } else {
      return 'password not matched!';
    }

    //if data is empty
    if (!data) {
      throw new NotFoundException('No user found!');
    }

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
  async validateUserByEmail(email: string, id: number) {
    const userData = await this.usersRepository.findOne({
      where: {
        email: email,
        id: id,
      },
    });

    if (!userData) {
      throw new NotFoundException(ErrorMessage.EMAIL_NOT_FOUND);
    }
    delete userData.password;

    return userData;
  }

  // //update user pass reset
  // async updatePassResetToken(
  //   forgotPassDto: ForgotPassDto,
  //   passResetToken: string,
  // ) {
  //   //set pass reset expiry date time
  //   const currentDate = new Date();
  //   const passResetExpireAt = new Date(currentDate);
  //   passResetExpireAt.setHours(
  //     passResetExpireAt.getHours() +
  //       Number(this.configService.get('PASS_RESET_EXPIRY', 1)),
  //   );
  //   //prepare data to be updated
  //   const updateData = {};
  //   updateData['passResetToken'] = passResetToken;
  //   updateData['passResetTokenExpireAt'] = passResetExpireAt;

  //   const { email, userId } = forgotPassDto;
  //   const userData = await this.usersRepository.update(
  //     { email: email, id: userId },
  //     updateData,
  //   );

  //   return userData;
  // }

  // //change password by forgot password
  // async changePasswordByForgotPass(changeForgotPassDto: ChangeForgotPassDto) {
  //   //validate pass reset token data and return user information from it
  //   const userData = await this.validatePassResetToken(changeForgotPassDto);

  //   //check for pass reset token expiry
  //   const currentDate = new Date();

  //   if (new Date(currentDate) >= userData.passResetTokenExpireAt) {
  //     throw new ForbiddenException(`Pass Reset ${ErrorMessage.TOKEN_EXPIRED}`);
  //   }

  //   //update the password of the user
  //   const encryptedPassword = await this.hashPassword(
  //     changeForgotPassDto.password,
  //   );
  //   const updatedData = await this.updateUserPasswordData(
  //     userData.id,
  //     encryptedPassword,
  //   );
  //   //app sign in link
  //   const signInLink = '#';
  //   // if (changeForgotPassDto.userTypeSlug == UserTypesEnum.MENTOR) {
  //   //   signInLink = `${
  //   //     this.configService.get('APP_ENV') === 'development'
  //   //       ? this.configService.get('DEV_FRONTEND_MENTOR_DOMAIN')
  //   //       : this.configService.get('DEV_FRONTEND_MENTOR_DOMAIN')
  //   //   }/signin`;
  //   // } else {
  //   //   signInLink = `${
  //   //     this.configService.get('APP_ENV') === 'development'
  //   //       ? this.configService.get('DEV_FRONTEND_DOMAIN')
  //   //       : this.configService.get('PROD_FRONTEND_DOMAIN')
  //   //   }/signin`;
  //   // }
  //   // const cdnLink = await this.configService.get('PUBLIC_CDN');
  //   // const mainImage = `${cdnLink}ADMIN/logo-unisearch-67e1c334-cbc7-47cd-80d1-75ac4ed60dbb.png`;
  //   const mainImage = '#';
  //   const mailData = new QueueMailDto();
  //   mailData.toMail = updatedData.email;
  //   mailData.subject = `Monitrix: Password Changed`;
  //   mailData.template = './change-password';
  //   mailData.context = {
  //     signInLink: signInLink,
  //     imgSrc: mainImage,
  //   };
  //   await this.queueMailService.sendMail(mailData);

  //   return updatedData.email;
  // }

  // //validate pass reset token
  // async validatePassResetToken(changeForgotPassDto: ChangeForgotPassDto) {
  //   const { userId, passResetToken } = changeForgotPassDto;
  //   const userData = await this.usersRepository.findOne({
  //     where: {
  //       id: userId,
  //       passResetToken: passResetToken,
  //     },
  //   });

  //   //user data error not found
  //   if (!userData) {
  //     throw new NotFoundException(
  //       `Password reset ${ErrorMessage.INFO_NOT_FOUND}.Please request a new one!`,
  //     );
  //   }

  //   return userData;
  // }
  // //update user password data
  // async updateUserPasswordData(userId: number, encryptedPassword: string) {
  //   const updateData = {
  //     password: encryptedPassword,
  //     passResetToken: null,
  //     passResetTokenExpireAt: null,
  //   };

  //   const userData = await this.usersRepository
  //     .createQueryBuilder()
  //     .update(User, updateData)
  //     .where('id = :id', { id: userId })
  //     .returning('*')
  //     .execute();

  //   if (!userData) {
  //     throw new NotFoundException(`${ErrorMessage.UPDATE_FAILED}`);
  //   }

  //   return userData.raw[0];
  // }
}
