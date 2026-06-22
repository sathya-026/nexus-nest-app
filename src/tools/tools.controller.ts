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
import { CurrentUser } from '@common/decorators';
import { AuthUser } from '@modules/auth/interfaces/jwt-payload.interface';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/enums/role.enum';

@ApiTags('Tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: 'Add a tool to an agent' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('agentId') agentId: string,
    @Body() dto: CreateToolDto,
  ) {
    return this.toolsService.create(user.orgId, agentId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tools for an agent' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('agentId') agentId: string,
  ) {
    return this.toolsService.findAll(user.orgId, agentId);
  }

  @Get(':toolId')
  @ApiOperation({ summary: 'Get a single tool' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('agentId') agentId: string,
    @Param('toolId') toolId: string,
  ) {
    return this.toolsService.findOne(user.orgId, agentId, toolId);
  }

  @Patch(':toolId')
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: 'Update a tool' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('agentId') agentId: string,
    @Param('toolId') toolId: string,
    @Body() dto: UpdateToolDto,
  ) {
    return this.toolsService.update(user.orgId, agentId, toolId, dto);
  }

  @Delete(':toolId')
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: 'Delete a tool' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('agentId') agentId: string,
    @Param('toolId') toolId: string,
  ) {
    return this.toolsService.remove(user.orgId, agentId, toolId);
  }
}
