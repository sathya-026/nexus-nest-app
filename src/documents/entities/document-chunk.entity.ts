import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';
import { Agent } from '../../agents/entities/agent.entity';

import * as pgvector from 'pgvector';

// Uses BIGSERIAL PK — internal only, never exposed in APIs
@Entity('document_chunks')
@Index(['agentId']) // Fast per-agent vector search filtering
export class DocumentChunk {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId: string;

  // Denormalized from document.agentId for fast vector search without a join
  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'text' })
  content: string;

  // pgvector column — TypeORM doesn't have native support; we use a raw type string.
  // Requires the `pgvector` Postgres extension and vector(1536) column type.
  // Dimension 1536 matches OpenAI text-embedding-3-small / text-embedding-ada-002.
  @Column({
    type: 'vector',
    length: 1536, // Match your embedding model's dimensions
    transformer: {
      from: (value: string) => pgvector.fromSql(value), // Converts Postgres string to number[]
      to: (value: number[]) => pgvector.toSql(value)    // Converts number[] to Postgres string
    },
    select: false
  })
  embedding: number[];

  @Column({ type: 'int', name: 'chunk_index' })
  chunkIndex: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;
}
