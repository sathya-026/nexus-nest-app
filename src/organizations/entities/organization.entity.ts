import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from "typeorm";
import { uuidv7 } from "uuidv7";

@Entity("organizations")
export class Organization {
  @PrimaryColumn({ type: "uuid" })
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  // Unique API key used to authenticate widget & agent-core requests
  @Column({ type: "varchar", length: 255, unique: true, name: "api_key" })
  apiKey: string;

  // 'free' | 'pro' | 'enterprise'
  @Column({ type: "varchar", length: 50, default: "free" })
  plan: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
    if (!this.apiKey) this.apiKey = `nxs_${uuidv7().replace(/-/g, "")}`;
  }
}
