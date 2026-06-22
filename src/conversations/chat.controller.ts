/**
 * Widget-facing chat endpoint.
 *
 * Auth model:
 *   X-Api-Key header → resolves org (not a JWT — widget runs on external sites).
 *
 * This controller owns the full pre-flight:
 *   1. Resolve org from API key
 *   2. Validate agent ownership + active status
 *   3. Validate Origin against agent.allowedDomains
 *   4. Get or create the conversation for this session
 *   5. Call FastAPI /chat with X-Internal-Secret + resolved context
 *   6. Proxy the SSE stream straight back to the widget
 *
 * FastAPI never sees the API key or any widget auth — it receives only
 * pre-resolved IDs and the internal secret.
 */

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgentsService } from '../agents/agents.service';
import { ConversationsService } from './conversations.service';
import { FetchHistoryDto } from './dto/chat-widget.dto';
import { WidgetAuthGuard } from '@common/guards/widget-auth.guard';

@ApiTags('Chat')
@UseGuards(WidgetAuthGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly agentsService: AgentsService,
    private readonly conversationsService: ConversationsService,
  ) { }

  @Post('/history')
  @HttpCode(HttpStatus.OK)
  async history(
    @Body() dto: FetchHistoryDto,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
  ) {
    try {
      // ── 1. Validate agent ────────────────────────────────────────────
      const agent = await this.agentsService.findForEmbed(dto.agentId);
      if (!agent) throw new NotFoundException('Agent not found');

      // ── 2. Domain check ──────────────────────────────────────────────
      // Throws ForbiddenException if origin isn't in agent.allowedDomains
      this.agentsService.validateDomain(agent, origin ?? referer);

      // ── 3. Get messages ──────────────────────────────────────────────
      const { messages, nextCursor, conversationId } = await this.conversationsService.getSessionMessages(
        dto.sessionId,
      );

      return { messages, nextCursor, conversationId };
    }
    catch (err) {
      this.logger.error('Error fetching history', err);
      throw new NotFoundException('Error fetching history');
    }

  }
}