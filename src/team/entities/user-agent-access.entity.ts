import {
  Entity, PrimaryColumn, ManyToOne,
  JoinColumn, CreateDateColumn, Column,
} from 'typeorm';
import { User }  from '../../users/entities/user.entity';
import { Agent } from '../../agents/entities/agent.entity';

@Entity('user_agent_access')
export class UserAgentAccess {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @PrimaryColumn({ name: 'agent_id' })
  agentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ name: 'granted_by' })
  grantedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}