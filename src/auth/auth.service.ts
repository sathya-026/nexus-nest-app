import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly orgsService: OrganizationsService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    // Create org first, then the owner user in a transaction
    const org = await this.orgsService.create({ name: dto.organizationName });

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      orgId: org.id,
      email: dto.email,
      passwordHash,
      role: 'owner',
    });

    return {
      accessToken: this.signToken(user, org.id),
      user: { id: user.id, email: user.email, role: user.role, orgId: org.id },
      organization: { id: org.id, name: org.name, apiKey: org.apiKey },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    return {
      accessToken: this.signToken(user, user.orgId),
      user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
    };
  }

  private signToken(user: { id: string; email: string; role: string }, orgId: string) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
