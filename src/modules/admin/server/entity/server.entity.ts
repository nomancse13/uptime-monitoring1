import { CommonEntity } from 'src/monitrix-auth/common';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('server')
export class ServerEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  serverUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  countryName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  countryCode: string;
}
