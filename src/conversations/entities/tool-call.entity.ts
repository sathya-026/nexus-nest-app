import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Message } from './message.entity';
import { Tool } from '../../tools/entities/tool.entity';

export enum ToolCallStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

@Entity('tool_calls')
export class ToolCall {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'message_id' })
  messageId: string;

  @Column({ type: 'bigint', name: 'tool_id' })
  toolId: string;

  @Column({ type: 'jsonb', nullable: true })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: ToolCallStatus.SUCCESS })
  status: ToolCallStatus;

  @Column({ type: 'int', name: 'latency_ms', nullable: true })
  latencyMs: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @ManyToOne(() => Tool, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tool_id' })
  tool: Tool;
}
