import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }

  @Column({ name: 'github_id', unique: true })
  githubId!: string;

  @Column()
  username!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl!: string;

  @Column({ default: 'analyst' })
  role!: 'admin' | 'analyst';

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @UpdateDateColumn({ name: 'last_login_at', nullable: true })
  lastLoginAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
