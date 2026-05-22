import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export enum ToolType {
  HTTP = 'http',
  // Future: 'webhook' | 'mcp' | 'builtin'
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

// Uses BIGSERIAL — internal only, FK'd from tool_calls
@Entity('tools')
export class Tool {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // The agent reads this to decide when to call the tool (used in system prompt injection)
  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, default: ToolType.HTTP })
  type: ToolType;

  @Column({ type: 'varchar', length: 2048, name: 'endpoint_url' })
  endpointUrl: string;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'http_method',
    default: HttpMethod.POST,
  })
  httpMethod: HttpMethod;

  // Headers stored encrypted (AES-256) — may include API keys, Bearer tokens etc.
  // Encryption/decryption handled in ToolsService via crypto module.
  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, string>; // Decrypted in memory, encrypted at rest

  // JSON Schema for OpenAI function calling — describes the tool's input parameters
  @Column({ type: 'jsonb', name: 'parameters_schema', nullable: true })
  parametersSchema: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;
}
