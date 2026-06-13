import { CurrentUser } from '@common/decorators';
import { AuthUser } from '@modules/auth/interfaces/jwt-payload.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
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

@ApiTags('Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly config: ConfigService,
  ) { }

  @Post()
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
    return this.agentsService.findAll(user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single agent' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentsService.findOne(user.orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agent' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentsService.update(user.orgId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an agent' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentsService.remove(user.orgId, id);
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
