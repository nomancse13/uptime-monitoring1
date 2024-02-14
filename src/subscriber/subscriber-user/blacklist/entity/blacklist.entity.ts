import { CommonEntity } from 'src/monitrix-auth/common';
import { WebsiteAlertStatus } from 'src/monitrix-auth/common/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('blacklist')
export class BlacklistEntity extends CommonEntity {
  filter(arg0: (item: any) => boolean) {
    throw new Error('Method not implemented.');
  }
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({
    type: 'int2',
  })
  groupId: number;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  url: string;

  @Column({ type: 'json', nullable: true })
  team: any;

  @Column({
    type: 'int2',
  })
  userId: number;

  @Column({ type: 'json', nullable: true })
  blacklistInfo: any;

  @Column({ type: 'varchar', length: '255', nullable: true })
  uniqueId: string;

  @Column({
    type: 'enum',
    enum: WebsiteAlertStatus,
    nullable: true,
  })
  alertStatus: string;
  workspace: any;
}
