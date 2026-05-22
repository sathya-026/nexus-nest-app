import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

interface CreateUserInput {
  orgId: string;
  email: string;
  passwordHash: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = this.usersRepo.create({
      orgId: input.orgId,
      email: input.email,
      passwordHash: input.passwordHash,
      role: (input.role as UserRole) ?? UserRole.MEMBER,
    });
    return this.usersRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findAllByOrg(orgId: string): Promise<User[]> {
    return this.usersRepo.find({
      where: { orgId },
      select: ['id', 'email', 'role', 'createdAt'], // Never return passwordHash
    });
  }
}
