import { CommonEntity } from 'src/monitrix-auth/common';
import { WebsiteAlertStatus } from 'src/monitrix-auth/common/enum';
import { FrequerncyTypeEnum } from 'src/monitrix-auth/common/enum/frequency-type.enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ssls')
export class SSLEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for this table',
  })
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  url: string;

  @Column({
    type: 'int2',
    nullable: false,
  })
  groupId: number;

  @Column({
    type: 'enum',
    enum: FrequerncyTypeEnum,
    default: FrequerncyTypeEnum.DAILY,
  })
  frequency: string;

  @Column({
    type: 'int2',
  })
  userId: number;

  @Column({ type: 'json', nullable: true })
  team: string;

  @Column({
    type: 'date',
    nullable: true,
  })
  expireOn: Date;

  @Column({
    type: 'date',
    nullable: true,
  })
  registeredOn: Date;
  @Column({
    type: 'date',
    nullable: true,
  })
  updatedOn: Date;

  @Column({
    type: 'int2',
  })
  alertBeforeExpiration: number;

  @Column({ type: 'varchar', length: '255', nullable: true })
  uniqueId: string;

  @Column({ type: 'int8', nullable: true })
  validUntil: number;

  @Column({ type: 'int8', nullable: true })
  expiringDays: number;

  @Column({
    type: 'int2',
    default: 1,
  })
  locationId: number;

  @Column({
    type: 'enum',
    enum: WebsiteAlertStatus,
    nullable: true,
  })
  alertStatus: string;
  workspace: any;
}
