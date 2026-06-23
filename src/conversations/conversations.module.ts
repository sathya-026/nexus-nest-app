import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ToolCall } from './entities/tool-call.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConversationsService } from './conversations.service';
import { ChatController } from './chat.controller';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AgentsModule } from '../agents/agents.module';
import { Agent } from '@modules/agents/entities/agent.entity';
import { WidgetAuthToken } from '@modules/widget/auth/entities/widget-auth-token.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Agent, WidgetAuthToken, Conversation, Message, ToolCall]),
  ConfigModule,
  OrganizationsModule,
  AgentsModule,
],
controllers: [
  ChatController,
],
providers:  [ConversationsService],
exports:    [ConversationsService],
})
export class ConversationsModule {}
