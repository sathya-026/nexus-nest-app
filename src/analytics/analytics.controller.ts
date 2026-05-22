import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated analytics summary for the org' })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'since', required: false, description: 'ISO date string' })
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('agentId') agentId?: string,
    @Query('since') since?: string,
  ) {
    return this.analyticsService.getSummary(
      user.orgId,
      agentId,
      since ? new Date(since) : undefined,
    );
  }

  @Get('events')
  @ApiOperation({ summary: 'Get recent analytics events' })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('agentId') agentId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getRecentEvents(
      user.orgId,
      agentId,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
