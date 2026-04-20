import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

import { v7 as uuidv7 } from 'uuid';

@Entity('profiles')
export class Profile {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  @Index()
  gender!: string;

  @Column({ type: 'float', nullable: true })
  gender_probability!: number;

  @Column({ nullable: true })
  country_name!: string;

  @Column({ nullable: true })
  @Index()
  age!: number;

  @Column({ nullable: true })
  @Index()
  age_group!: string;

  @Column({ nullable: true })
  @Index()
  country_id!: string;

  @Column({ type: 'float', nullable: true })
  country_probability!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  created_at!: Date;
}
