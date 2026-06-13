import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AgentsModule } from './agents/agents.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { ConversationsModule } from './conversations/conversations.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RedisModule } from './redis/redis.module';
import { TestModule } from './test/test.module';
import { ToolsModule } from './tools/tools.module';
import { UsersModule } from './users/users.module';
import { WidgetSessionModule } from './widget/session/session.module';

@Module({
  imports: [
    // Config must be first — all other modules depend on it
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,

    // Domain modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AgentsModule,
    DocumentsModule,
    ToolsModule,
    ConversationsModule,
    AnalyticsModule,
    TestModule,

    // Widget modules
    WidgetSessionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ]
})
export class AppModule { }
