import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Agent } from '../../agents/entities/agent.entity';
import { Conversation } from '../../conversations/entities/conversation.entity';

export enum AnalyticsEventType {
  RAG_HIT = 'RAG hit',
  RAG_MISS = 'RAG miss',
  LLM_ERROR = 'LLM error',
  TOKEN_THRESHOLD = 'token threshold',
  TOOL_CALL_SUCCESS = 'tool call success',
  TOOL_CALL_FAILED = 'tool call failed',
  TOOL_CALL_TIMEOUT = 'tool call timeout',
  CONVERSATION_STARTED = 'conversation started',
  CONVERSATION_ENDED = 'conversation ended',
}

@Entity('analytics_events')
@Index(['orgId', 'createdAt'])   // Dashboard time-range queries
@Index(['agentId', 'eventType']) // Per-agent event filtering
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'uuid', name: 'org_id' })
  orgId: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'uuid', name: 'conversation_id', nullable: true })
  conversationId: string;

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: AnalyticsEventType | string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @ManyToOne(() => Conversation, { nullable: true })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}
