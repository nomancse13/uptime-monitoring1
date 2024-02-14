import { CommonEntity } from 'src/monitrix-auth/common';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('blacklistServers')
export class BlacklistServersEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for this table',
  })
  id: number;

  @Column({ type: 'varchar', length: 155, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string;
}
