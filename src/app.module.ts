import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AgentsModule } from './agents/agents.module';
import { DocumentsModule } from './documents/documents.module';
import { ToolsModule } from './tools/tools.module';
import { ConversationsModule } from './conversations/conversations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TestModule } from './test/test.module';
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
})
export class AppModule {}
