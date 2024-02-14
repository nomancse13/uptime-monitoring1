import { CommonEntity } from 'src/monitrix-auth/common';
import { TimeIntervalEnum } from 'src/monitrix-auth/common/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('plan')
export class PlanEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int2', default: 0 })
  isActive: number;

  @Column({ type: 'int8', nullable: true })
  price: number;

  @Column({ type: 'varchar', length: 150, default: 'USD' })
  currency: string;

  @Column({ type: 'int8', nullable: true })
  periodInterval: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  timePeriod: string;

  @Column({
    type: 'enum',
    enum: TimeIntervalEnum,
    default: TimeIntervalEnum.DAYS,
  })
  timeInterval: string;

  @Column({ type: 'json', nullable: true })
  features: string;
}
