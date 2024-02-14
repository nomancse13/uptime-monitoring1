import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppLoggerModule } from './logger/app-logger.module';

@Module({
  controllers: [],
  providers: [],
  imports: [AuthModule, AppLoggerModule],
})
export class MontrixAuthModule {}
