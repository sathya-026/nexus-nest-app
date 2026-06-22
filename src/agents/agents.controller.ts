import { CurrentUser, Public } from '@common/decorators';
import { AuthUser } from '@modules/auth/interfaces/jwt-payload.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/enums/role.enum';
import { RolesGuard } from '@common/guards/roles.guard';

@ApiTags('Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly config: ConfigService,
  ) { }

  
  @Post()
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: 'Create a new agent' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAgentDto,
  ) {
    return this.agentsService.create(user.orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all agents for the org' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.agentsService.findAll(user.orgId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single agent' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentsService.findOneWithRoleCheck(id, user);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: 'Update an agent' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentsService.update(user.orgId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: 'Delete an agent' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentsService.remove(user.orgId, id);
  }

  // In AgentsController — add this route
  // @Public() is already imported from common decorators

  @Public()
  @Get(':id/widget-config')
  async getWidgetConfig(@Param('id') id: string) {
    const agent = await this.agentsService.findByIdPublic(id);
    if (!agent) throw new NotFoundException('Agent not found');

    // Only expose what the widget needs — never expose system prompt or org internals
    return {
      name: agent.name,
      accessType: agent.accessType,
      widgetConfig: agent.widgetConfig,  // { colors, position, welcomeMessage }
    };
  }

  @Get(':id/embed')
  @ApiOperation({ summary: 'Generate embed snippet for the agent' })
  getEmbedCode(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Verify ownership first
    return this.agentsService.findOne(user.orgId, id).then((agent) => {
      const widgetUrl = `https://cdn.nexus.ai/widget.js`; // Replace with actual CDN
      return {
        scriptTag: `<script src="${widgetUrl}" data-agent-id="${agent.id}" defer></script>`,
        reactComponent: `<NexusWidget agentId="${agent.id}" />`,
        agentId: agent.id,
      };
    });
  }
}
