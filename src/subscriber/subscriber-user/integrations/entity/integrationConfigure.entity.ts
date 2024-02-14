import { IntegrationConnectEnum } from 'src/monitrix-auth/common/enum/integration-connect.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Timestamp,
  UpdateDateColumn,
} from 'typeorm';

@Entity('integrationConfigure')
export class IntegrationConfigureEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for this table',
  })
  id: number;

  @CreateDateColumn({ select: false })
  createdAt: Timestamp;

  @UpdateDateColumn({ nullable: true, select: false })
  updatedAt: Date;

  @Column({ type: 'int', nullable: true, select: false })
  updatedBy: number;

  @Column({ type: 'int4' })
  userId: number;

  @Column({ type: 'int2' })
  integrationId: number;

  @Column({ type: 'json', nullable: true })
  configure: any;

  @Column({ default: false })
  isEnableNow: boolean;

  @Column({
    type: 'enum',
    enum: IntegrationConnectEnum,
    nullable: true,
  })
  connectionStatus: string;
}
