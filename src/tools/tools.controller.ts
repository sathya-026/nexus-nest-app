import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { CreateToolDto, UpdateToolDto } from './dto/tool.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a tool to an agent' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Body() dto: CreateToolDto,
  ) {
    return this.toolsService.create(user.orgId, agentId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tools for an agent' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
  ) {
    return this.toolsService.findAll(user.orgId, agentId);
  }

  @Get(':toolId')
  @ApiOperation({ summary: 'Get a single tool' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Param('toolId') toolId: string,
  ) {
    return this.toolsService.findOne(user.orgId, agentId, toolId);
  }

  @Patch(':toolId')
  @ApiOperation({ summary: 'Update a tool' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Param('toolId') toolId: string,
    @Body() dto: UpdateToolDto,
  ) {
    return this.toolsService.update(user.orgId, agentId, toolId, dto);
  }

  @Delete(':toolId')
  @ApiOperation({ summary: 'Delete a tool' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Param('toolId') toolId: string,
  ) {
    return this.toolsService.remove(user.orgId, agentId, toolId);
  }
}
