import { CommonEntity } from 'src/monitrix-auth/common';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('workspace')
export class WorkspaceEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'int8', default: 0 })
  userId: number;
}
