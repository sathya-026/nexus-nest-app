import { WidgetAuthGuard } from '@common/guards/widget-auth.guard';
import { MailModule } from '@modules/mail/mail.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WidgetAuthToken } from './entities/widget-auth-token.entity';
import { WidgetOtpCode } from './entities/widget-opt-code.entity';
import { WidgetAuthController } from './widget-auth.controller';
import { WidgetAuthService } from './widget-auth.service';
import { WidgetSessionModule } from '../session/session.module';
import { Agent } from '@modules/agents/entities/agent.entity';
import { UsersModule } from '@modules/users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, WidgetOtpCode, WidgetAuthToken]),
    UsersModule,
    MailModule,
    WidgetSessionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.privateSessionSecret'),
        signOptions: { expiresIn: config.get<string>('jwt.privateSessionExpiry') },
      }),
    }),
  ],
  controllers: [WidgetAuthController],
  providers: [WidgetAuthService, WidgetAuthGuard],
  exports: [WidgetAuthGuard],   // Chat module imports this to apply the guard
})
export class WidgetAuthModule { }