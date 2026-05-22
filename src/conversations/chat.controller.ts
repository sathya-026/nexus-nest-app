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
    Controller,
    Post,
    Body,
    Headers,
    Res,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    NotFoundException,
    Logger,
  } from '@nestjs/common';
  import { Response }               from 'express';
  import { ConfigService }          from '@nestjs/config';
  import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
  import { OrganizationsService }   from '../organizations/organizations.service';
  import { AgentsService }          from '../agents/agents.service';
  import { ConversationsService }   from './conversations.service';
  import { ChatWidgetDto }          from './dto/chat-widget.dto';
  
  @ApiTags('Chat')
  @Controller('chat')
  export class ChatController {
    private readonly logger = new Logger(ChatController.name);
  
    constructor(
      private readonly orgsService:          OrganizationsService,
      private readonly agentsService:        AgentsService,
      private readonly conversationsService: ConversationsService,
      private readonly config:               ConfigService,
    ) {}
  
    @Post()
    @HttpCode(HttpStatus.OK)
    async chat(
      @Body()              dto:   ChatWidgetDto,
      @Headers('x-api-key') apiKey: string,
      @Headers('origin')    origin: string,
      @Res()               res:    Response,
    ): Promise<void> {
  
      // ── 1. Resolve org ───────────────────────────────────────────────
      if (!apiKey) throw new UnauthorizedException('X-Api-Key header required');
  
      const org = await this.orgsService.findByApiKey(apiKey);
      if (!org) throw new UnauthorizedException('Invalid API key');

      // ── 2. Validate agent ────────────────────────────────────────────
      const agent = await this.agentsService.findForEmbed(dto.agentId, org.id);
      if (!agent) throw new NotFoundException('Agent not found');
  
      // ── 3. Domain check ──────────────────────────────────────────────
      // Throws ForbiddenException if origin isn't in agent.allowedDomains
      this.agentsService.validateDomain(agent, origin);
  
      // ── 4. Conversation ──────────────────────────────────────────────
      const conversation = await this.conversationsService.findOrCreate(
        dto.agentId,
        dto.sessionId,
        dto.endUserId,
      );
  
      // ── 5. Call FastAPI ──────────────────────────────────────────────
      const agentCoreUrl = this.config.get<string>('AGENT_CORE_URL');
      const internalSecret = this.config.get<string>('INTERNAL_SECRET');
  
      let fastapiRes: globalThis.Response;
  
      try {
        fastapiRes = await fetch(`${agentCoreUrl}/api/chat`, {
          method:  'POST',
          headers: {
            'Content-Type':      'application/json',
            'X-Internal-Secret': internalSecret,
          },
          body: JSON.stringify({
            agent_id:        dto.agentId,
            org_id:          org.id,
            conversation_id: conversation.id,
            message:         dto.message,
          }),
        });
      } catch (err) {
        this.logger.error('Failed to reach agent core', err);
        // Send a well-formed SSE error so the widget handles it gracefully
        // rather than a dangling open connection
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.flushHeaders();
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: 'Agent unavailable. Please try again.' })}\n\n`,
        );
        res.end();
        return;
      }
  
      if (!fastapiRes.ok) {
        this.logger.error(
          'Agent core returned %d for conversation %s',
          fastapiRes.status, conversation.id,
        );
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.flushHeaders();
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: 'Agent error. Please try again.' })}\n\n`,
        );
        res.end();
        return;
      }
  
      // ── 6. Proxy SSE stream ──────────────────────────────────────────
      // Set headers before any write — flushHeaders() sends them immediately
      // so the browser's EventSource / fetch reader can start consuming.
      res.setHeader('Content-Type',     'text/event-stream');
      res.setHeader('Cache-Control',    'no-cache');
      res.setHeader('Connection',       'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');   // tells nginx not to buffer
      res.flushHeaders();
      
      res.write(
        `data: ${JSON.stringify({ type: 'start', conversationId: conversation.id })}\n\n`,
      );
      (res as any).flush?.();

      const reader = fastapiRes.body!.getReader();
  
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
  
          // value is a Uint8Array — write directly, Express handles encoding
          res.write(value);
  
          // Force-flush after every chunk so tokens reach the widget
          // immediately rather than waiting for the TCP buffer to fill.
          // `(res as any)` because @types/express doesn't expose flush()
          // but the underlying http.ServerResponse always has it.
          (res as any).flush?.();
        }
      } catch (err) {
        this.logger.error(
          'Stream interrupted for conversation %s: %s',
          conversation.id, err,
        );
      } finally {
        res.end();
      }
    }
  }