import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { Agent } from '../../agents/entities/agent.entity';

export enum DocumentStatus {
  PENDING = 'pending',
  INDEXING = 'indexing',
  INDEXED = 'indexed',
  FAILED = 'failed',
}

@Entity('documents')
export class Document {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, name: 'file_type' })
  fileType: string;

  // S3 object key — used to fetch the file for (re)indexing
  @Column({ type: 'varchar', length: 1024, name: 's3_key' })
  s3Key: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ type: 'int', name: 'chunk_count', default: 0 })
  chunkCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
  }
}
