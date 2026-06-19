import {
  Controller, Get, Patch, Delete, Put,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TeamService }       from './team.service';
import { CurrentUser }       from '../common/decorators/index';
import { Roles }             from '../common/decorators/roles.decorator';
import { Role }              from '../common/enums/role.enum';
import { AuthUser }          from '../auth/interfaces/jwt-payload.interface';
import { ChangeRoleDto, UpdateAgentAccessDto } from './dto/index';

@Controller('team')
export class TeamController {
  constructor(private teamService: TeamService) {}

  // GET /team — all authenticated org members
  @Get()
  listMembers(@CurrentUser() user: AuthUser) {
    return this.teamService.listMembers(user);
  }

  // PATCH /team/:userId/role — owner only
  @Patch(':userId/role')
  @Roles(Role.Owner)
  changeRole(
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamService.changeRole(userId, dto, user);
  }

  // DELETE /team/:userId — owner or admin
  @Delete(':userId')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamService.removeMember(userId, user);
  }

  // GET /team/:userId/agent-access — owner or admin
  @Get(':userId/agent-access')
  @Roles(Role.Admin)
  getAgentAccess(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamService.getAgentAccess(userId, user);
  }

  // PUT /team/:userId/agent-access — owner or admin
  // Full replace: sends the complete desired set of agentIds (or null for full access)
  @Put(':userId/agent-access')
  @Roles(Role.Admin)
  updateAgentAccess(
    @Param('userId') userId: string,
    @Body() dto: UpdateAgentAccessDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamService.updateAgentAccess(userId, dto, user);
  }
}