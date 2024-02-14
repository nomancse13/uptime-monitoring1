import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { BlacklistServersEntity } from './entity';

@Injectable()
export class AdminBlacklistServerService {
  constructor(
    @InjectRepository(BlacklistServersEntity)
    private readonly blacklistServerRepository: BaseRepository<BlacklistServersEntity>,
  ) {}

  async getAllBlacklistServer() {
    const [data, total] = await this.blacklistServerRepository
      .createQueryBuilder('blacklist')
      .select(['blacklist.id', 'blacklist.link'])
      .where('blacklist.status = :status', { status: 'Active' })
      .orderBy('blacklist.id', 'ASC')
      .getManyAndCount();

    if (data) {
      return { data, total };
    } else {
      throw new NotFoundException(`Data Not Found!`);
    }
  }
}
