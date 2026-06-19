import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAgentAccess } from './entities/user-agent-access.entity';
import { TeamService } from './team.service';
import { User } from '@modules/users/entities/user.entity';
import { TeamController } from './team.controller';

@Module({
    imports: [TypeOrmModule.forFeature([UserAgentAccess, User])],
    controllers: [TeamController],
    providers: [TeamService],
    exports: [TeamService],
})
export class TeamModule { }