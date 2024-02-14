import { CommonEntity } from 'src/monitrix-auth/common';
import { WebsiteAlertStatus } from 'src/monitrix-auth/common/enum';
import { FrequerncyTypeEnum } from 'src/monitrix-auth/common/enum/frequency-type.enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('domains')
export class DomainEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
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
  domainUrl: string;

  @Column({
    type: 'int2',
    comment: 'this id is workspaceId',
  })
  groupId: number;

  @Column({
    type: 'int2',
    nullable: true,
  })
  days: number;

  @Column({
    type: 'enum',
    enum: FrequerncyTypeEnum,
    default: FrequerncyTypeEnum.DAILY,
  })
  frequencyType: string;

  @Column({
    type: 'enum',
    enum: WebsiteAlertStatus,
    nullable: true,
  })
  alertStatus: string;

  @Column({
    type: 'int2',
    nullable: true,
  })
  alertBeforeExpiration: number;

  @Column({
    type: 'int2',
  })
  userId: number;

  @Column({ type: 'json', nullable: true })
  team: any;

  @Column({ type: 'json', nullable: true })
  details: any;

  @Column({ type: 'json', nullable: true })
  dnsRecords: any;

  @Column({ type: 'json', nullable: true })
  nameServers: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  info: string;

  @Column({ type: 'date', nullable: true })
  expireAt: Date;

  @Column({ type: 'date', nullable: true })
  registeredOn: Date;

  @Column({ type: 'date', nullable: true })
  updatedOn: Date;

  @Column({ type: 'int2', default: 1 })
  serverId: number;
  workspace: any;
}
