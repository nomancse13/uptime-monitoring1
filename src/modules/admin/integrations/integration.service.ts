import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { AvailableIntegrationsEntity } from './entity';

@Injectable()
export class AdminIntegrationService {
  constructor(
    @InjectRepository(AvailableIntegrationsEntity)
    private readonly availableIntegrationRepository: BaseRepository<AvailableIntegrationsEntity>,
  ) {}

  async checkIfIntegrationExists(id: number): Promise<boolean> {
    const integration = await this.availableIntegrationRepository.findOne({
      where: { id: id },
    });
    return !integration;
  }
}
