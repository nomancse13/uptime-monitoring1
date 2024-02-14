import { LogMessageInterface } from 'src/monitrix-auth/common/interfaces';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('log-details')
export class LogDetailsEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
  })
  ipAddress: string;

  @Column({
    type: 'text',
  })
  browser: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  time: string;

  @Column({
    type: 'json',
  })
  messageDetails: LogMessageInterface;

  @Column({
    type: 'int2',
  })
  userId: number;
}
