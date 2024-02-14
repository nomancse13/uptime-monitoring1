import { CommonEntity } from 'src/monitrix-auth/common';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('availableIntegrations')
export class AvailableIntegrationsEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for this table',
  })
  id: number;

  @Column({ type: 'varchar', length: 155 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  iconSrc: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  badgeText: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shortDescription: string;

  @Column({ type: 'text', nullable: true })
  overview: string;
}
