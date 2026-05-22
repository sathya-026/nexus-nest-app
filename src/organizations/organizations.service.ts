import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

interface CreateOrgInput {
  name: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
  ) {}

  async create(input: CreateOrgInput): Promise<Organization> {
    const org = this.orgsRepo.create({ name: input.name });
    return this.orgsRepo.save(org);
  }

  async findById(id: string): Promise<Organization | null> {
    return this.orgsRepo.findOne({ where: { id } });
  }

  async findByApiKey(apiKey: string): Promise<Organization | null> {
    return this.orgsRepo.findOne({ where: { apiKey } });
  }

  async updatePlan(id: string, plan: string): Promise<Organization> {
    const org = await this.findById(id);
    if (!org) throw new NotFoundException('Organization not found');
    org.plan = plan;
    return this.orgsRepo.save(org);
  }
}
