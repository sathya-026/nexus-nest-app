import { OrgInvitation } from '@modules/invitations/entities/org-invitation.entity';
import { UserAgentAccess } from '@modules/team/entities/user-agent-access.entity';
import { WidgetAuthToken } from '@modules/widget/auth/entities/widget-auth-token.entity';
import { WidgetOtpCode } from '@modules/widget/auth/entities/widget-opt-code.entity';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { AnalyticsEvent } from '../analytics/entities/analytics-event.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { ToolCall } from '../conversations/entities/tool-call.entity';
import { DocumentChunk } from '../documents/entities/document-chunk.entity';
import { Document } from '../documents/entities/document.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Tool } from '../tools/entities/tool.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get<number>('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        ssl: config.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
        entities: [
          Organization,
          User,
          Agent,
          Document,
          DocumentChunk,
          Tool,
          Conversation,
          Message,
          ToolCall,
          AnalyticsEvent,
          OrgInvitation,
          UserAgentAccess,
          WidgetAuthToken,
          WidgetOtpCode
        ],
        // dropSchema: true,
        // Never use synchronize in production — use migrations instead
        autoLoadEntities: true,
        synchronize: config.get('nodeEnv') === 'development',
        migrations: ['dist/database/migrations/*.js'],
        logging: config.get('nodeEnv') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule { }
