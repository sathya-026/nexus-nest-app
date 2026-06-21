import { Agent } from '@modules/agents/entities/agent.entity';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { CreateSessionDto } from './dto/create-session.dto';
import { CacheService } from '@modules/redis/cache.service';

export interface SessionPayload {
    sub: string;
    agentId: string;
    orgId: string;
    sessionId: string;
    type: 'widget_session';
}

const TTL_MS = 60 * 60 * 1_000; // 1 hour

@Injectable()
export class SessionService {
    constructor(
        @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
        private readonly jwtService: JwtService,
        private readonly cacheService: CacheService,
    ) { }

    async createSession(dto: CreateSessionDto, requestOrigin: string) {
        try {
            const agent = await this.agentRepo.findOne({
                where: { id: dto.agentId, isActive: true },
            });
            if (!agent) throw new NotFoundException('Agent not found');

            this.assertOriginAllowed(requestOrigin, agent.allowedDomains);

            const tokenKey = `widget_session:${agent.id}:${dto.sessionId}`;
            const existingToken = await this.cacheService.get(tokenKey);

            if (existingToken) {
                return JSON.parse(existingToken);
            }

            const payload: SessionPayload = {
                sub: uuidv7(),
                agentId: agent.id,
                orgId: agent.orgId,
                sessionId: dto.sessionId,
                type: 'widget_session',
            };

            const token = this.jwtService.sign(payload, { expiresIn: '1h' });
            const sessionData = {
                token,
                expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
            };
            await this.cacheService.set(tokenKey, JSON.stringify(sessionData), TTL_MS);
            return sessionData;
        }
        catch (err) {
            console.error('Error creating widget session:', err);
            throw new ForbiddenException('Could not create session');
        }
    }

    private assertOriginAllowed(origin: string, allowedDomains: string): void {
        // Dev bypass — never reaches production
        if (process.env.NODE_ENV !== 'production') {
            try {
                const { hostname } = new URL(origin ?? '');
                if (hostname === 'localhost' || hostname === '127.0.0.1') return;
            } catch { }
        }

        if (!origin) throw new ForbiddenException('Origin header required');

        let hostname: string;
        try {
            hostname = new URL(origin).hostname.toLowerCase();
        } catch {
            throw new ForbiddenException('Malformed origin');
        }

        console.log('=== ALLOWED ORIGIN ===');
        console.log(hostname);
        console.log(allowedDomains);

        const allowed = allowedDomains
            .split(',')
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean)
            .some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));

        if (!allowed) throw new ForbiddenException('Origin not permitted');
    }
}