import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('systemDelay')
export class SystemDelayEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for this table',
  })
  id: number;

  @Column({ type: 'varchar', length: 45 })
  name: string;

  @Column({ type: 'int2' })
  value: number;
}
