import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('profiles')
export class Profile {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  gender!: string;

  @Column({ type: 'float', nullable: true })
  gender_probality!: number;

  @Column({ nullable: true })
  sample_size!: number;

  @Column({ nullable: true })
  age!: number;

  @Column({ nullable: true })
  age_group!: string;

  @Column({ nullable: true })
  country_id!: string;

  @Column({ type: 'float', nullable: true })
  country_probability!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
