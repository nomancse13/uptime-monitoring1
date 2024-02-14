import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Timestamp,
  UpdateDateColumn,
} from 'typeorm';
import { StatusField } from './enum';

export abstract class CommonEntity {
  @CreateDateColumn({ select: false })
  createdAt: Timestamp;

  @UpdateDateColumn({ nullable: true, select: false })
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt?: Timestamp;

  @Column({
    type: 'enum',
    enum: StatusField,
    default: StatusField.ACTIVE,
  })
  status: string;

  @Column({ type: 'int', nullable: true, select: false })
  createdBy: number;

  @Column({ type: 'int', nullable: true, select: false })
  updatedBy: number;

  @Column({ type: 'int', nullable: true, select: false })
  deletedBy: number;
}
