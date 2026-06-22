import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { UserAgentAccess } from '@modules/team/entities/user-agent-access.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, UserAgentAccess])],
  providers: [AgentsService],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
