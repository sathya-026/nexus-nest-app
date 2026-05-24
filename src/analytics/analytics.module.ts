import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ConversationsModule } from '@modules/conversations/conversations.module';
import { AgentsModule } from '@modules/agents/agents.module';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsEvent]), ConversationsModule, AgentsModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
