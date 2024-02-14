/**dependencies */
import { CommonEntity } from 'src/monitrix-auth/common';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
/**common entity data */
@Entity('systemUser')
export class User extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobile: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hashedRt: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userType: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  gender: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  maritalStatus: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: 'verification otp',
    nullable: true,
  })
  otpCode: string;

  @Column({
    type: 'timestamp',
    comment: 'verification otp expire time',
    nullable: true,
  })
  otpExpiresAt: Date;

  @Column({ type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: '255', nullable: true, select: false })
  passResetToken: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  passResetTokenExpireAt: Date;

  @Column({ type: 'int8', nullable: true })
  profileImageId: number;
}
