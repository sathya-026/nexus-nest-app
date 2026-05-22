import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

// Uses BIGSERIAL — ordered via sequence_number, not id or created_at
@Entity('messages')
@Unique(['conversationId', 'sequenceNumber']) // Prevents duplicate ordering
@Index(['conversationId', 'sequenceNumber'])  // Primary query pattern
export class Message {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  // Per-conversation monotonic counter set by Postgres trigger before insert.
  // Never set in application code — the trigger owns this.
  @Column({ type: 'integer', name: 'sequence_number' })
  sequenceNumber: number;

  @Column({ type: 'varchar', length: 50 })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', name: 'tokens_used', nullable: true })
  tokensUsed: number;

  @Column({ type: 'int', name: 'latency_ms', nullable: true })
  latencyMs: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}
