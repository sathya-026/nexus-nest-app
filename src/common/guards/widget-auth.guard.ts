import {
    CanActivate, ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Request } from 'express';
import { IsNull, Repository } from 'typeorm';

import { WidgetAuthToken } from '@modules/widget/auth/entities/widget-auth-token.entity';
import { Agent } from '../../agents/entities/agent.entity';

// Applied on the NestJS chat endpoint.
// Public agents: pass through.
// Private agents: validate Bearer token from widget localStorage.
@Injectable()
export class WidgetAuthGuard implements CanActivate {
    constructor(
        @InjectRepository(Agent) private agentsRepo: Repository<Agent>,
        @InjectRepository(WidgetAuthToken) private tokenRepo: Repository<WidgetAuthToken>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const agentId = req.body?.agentId as string | undefined;

        if (!agentId) throw new UnauthorizedException('agentId required');

        const agent = await this.agentsRepo.findOne({
            where: { id: agentId, isActive: true },
        });
        if (!agent) throw new UnauthorizedException('Agent not found');

        // Public agent — no token needed
        if (agent.accessType === 'public') return true;

        // Private agent — require valid widget auth token
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Widget authentication required');
        }

        const rawToken = authHeader.slice(7);
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const token = await this.tokenRepo.findOne({
            where: { tokenHash, agentId, revokedAt: IsNull() },
        });

        if (!token || token.expiresAt < new Date()) {
            throw new UnauthorizedException('Session expired — please re-authenticate');
        }

        // Attach for downstream use (NestJS chat controller can read this)
        (req as any).widgetUser = { email: token.email, agentId };

        return true;
    }
}