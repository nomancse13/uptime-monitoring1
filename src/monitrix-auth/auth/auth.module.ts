/**dependencies */
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
/**controllers */
import { AuthController } from './auth.controller';
/**services */
import { AuthService } from './auth.service';
/**Authentication strategies */
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from 'src/modules/admin/admin.module';
import { User } from 'src/modules/admin/user/entity/user.entity';
import { QueueMailModule } from 'src/modules/queue-mail/queue-mail.module';
import { SubscriberUserEntity } from 'src/subscriber/subscriber-user/entity';
import { AtStrategy, RtStrategy } from './strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([User, SubscriberUserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // secret: 'at-secret',
        // // secretOrKey: 'thisisdarknightisontequaltoday.weareawesome',
        // signOptions: {
        //   expiresIn: configService.get<string>('JWT_EXPIRATION'),
        // },
      }),
      inject: [ConfigService],
    }),
    QueueMailModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, RtStrategy, AtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
