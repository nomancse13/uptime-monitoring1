import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
// import { NestModule } from '@nestjs/common/interfaces/modules';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { QueueMailConsumer } from './modules/queue-mail/queue-mail.consumer';
import { QueueMailModule } from './modules/queue-mail/queue-mail.module';
import { validate } from './monitrix-auth/auth/config/env.validation';
import {
  TypeOrmConfigModule,
  TypeOrmConfigService,
} from './monitrix-auth/auth/config/typeorm-config';
import { LoggerMiddleware } from './monitrix-auth/middleware';
import { MontrixAuthModule } from './monitrix-auth/monitrix-auth.module';
import { SubscriberUserModule } from './subscriber/subscriber-user/subscriber-user.module';
import { SubscriberModule } from './subscriber/subscriber.module';

@Module({
  imports: [
    /**initialize nest js config module */
    ConfigModule.forRoot({
      validate: validate,
      //responsible for use config values globally
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

    // Influx initialize

    // Typeorm initialize
    TypeOrmModule.forRootAsync({
      imports: [TypeOrmConfigModule],
      inject: [ConfigService],
      // Use useFactory, useClass, or useExisting
      // to configure the ConnectionOptions.
      name: TypeOrmConfigService.connectionName,
      useExisting: TypeOrmConfigService,
      // connectionFactory receives the configured ConnectionOptions
      // and returns a Promise<Connection>.
      // dataSourceFactory: async (options) => {
      //   const connection = await createConnection(options);
      //   return connection;
      // },
    }),
    RouterModule.register([
      //module prefix for admin
      {
        path: 'admin',
        module: AdminModule,
      },
      {
        path: 'subscriber',
        module: SubscriberModule,
      },
      {
        path: 'subscriber',
        module: SubscriberUserModule,
      },
    ]),
    MontrixAuthModule,
    AdminModule,
    QueueMailModule,
    SubscriberModule,
  ],
  controllers: [AppController],
  providers: [AppService, QueueMailConsumer],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
