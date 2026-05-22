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
import { Organization } from '../../organizations/entities/organization.entity';

export interface WidgetConfig {
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  welcomeMessage?: string;
  agentName?: string;
  avatarUrl?: string;
}

@Entity('agents')
export class Agent {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid', name: 'org_id' })
  orgId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', name: 'system_prompt' })
  systemPrompt: string;

  // Stored as JSON: colors, position, welcome message
  @Column({ type: 'jsonb', name: 'widget_config', default: {} })
  widgetConfig: WidgetConfig;

  // Comma-separated list of allowed domains for embed (e.g. "example.com,app.example.com")
  @Column({ type: 'text', name: 'allowed_domains', nullable: true })
  allowedDomains: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
  }
}
