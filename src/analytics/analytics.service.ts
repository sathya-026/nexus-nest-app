import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { AnalyticsEvent, AnalyticsEventType } from './entities/analytics-event.entity';

export interface LogEventInput {
  orgId: string;
  agentId: string;
  conversationId?: string;
  eventType: AnalyticsEventType | string;
  payload?: Record<string, any>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly eventsRepo: Repository<AnalyticsEvent>,
  ) {}

  async log(input: LogEventInput): Promise<void> {
    const event = this.eventsRepo.create({
      orgId: input.orgId,
      agentId: input.agentId,
      conversationId: input.conversationId,
      eventType: input.eventType,
      payload: input.payload ?? {},
    });
    // Fire-and-forget — don't await to avoid blocking the request path
    this.eventsRepo.save(event).catch((err) =>
      console.error('[Analytics] Failed to log event:', err),
    );
  }

  async getSummary(orgId: string, agentId?: string, since?: Date) {
    const where: any = {
      orgId,
      ...(agentId && { agentId }),
      ...(since && { createdAt: MoreThanOrEqual(since) }),
    };

    const events = await this.eventsRepo.find({ where });

    // Aggregate counts by event type
    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
    }

    return {
      total: events.length,
      byType: counts,
      ragHitRate: this.ragHitRate(counts),
    };
  }

  async getRecentEvents(orgId: string, agentId?: string, limit = 50) {
    return this.eventsRepo.find({
      where: { orgId, ...(agentId && { agentId }) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private ragHitRate(counts: Record<string, number>): number | null {
    const hits = counts[AnalyticsEventType.RAG_HIT] ?? 0;
    const misses = counts[AnalyticsEventType.RAG_MISS] ?? 0;
    const total = hits + misses;
    return total > 0 ? Math.round((hits / total) * 100) : null;
  }
}
