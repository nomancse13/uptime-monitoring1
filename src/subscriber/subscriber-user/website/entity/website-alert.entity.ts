import { CommonEntity } from 'src/monitrix-auth/common';
import { AlertTypeEnum } from 'src/monitrix-auth/common/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('websiteAlert')
export class WebsiteAlertEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({
    type: 'int8',
  })
  websiteId: number;

  @Column({
    type: 'enum',
    enum: AlertTypeEnum,
    nullable: true,
  })
  type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comparison: string;

  @Column({ type: 'varchar', length: 255 })
  comparisonLimit: string;

  @Column({
    type: 'int2',
  })
  occurrences: number;

  @Column({ type: 'json', nullable: true, comment: 'this is team uuid' })
  contacts: string;
}
