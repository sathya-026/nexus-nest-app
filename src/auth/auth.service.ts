import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Response } from 'express';
import { Repository } from 'typeorm';

import { CacheService } from '@modules/redis/cache.service';
import { Role } from '../common/enums/role.enum';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_TTL_MS = 15 * 60 * 1000;             // 15 minutes
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
const REFRESH_TTL_S = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Organization) private orgsRepo: Repository<Organization>,
    private jwtService: JwtService,
    private config: ConfigService,
    private cacheService: CacheService,
  ) { }

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, res: Response) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const org = this.orgsRepo.create({ name: dto.organizationName });
    await this.orgsRepo.save(org);

    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: Role.Owner,
      orgId: org.id
    });
    await this.usersRepo.save(user);

    await this.issueTokens(user, res);

    return { id: user.id, email: user.email, role: user.role, orgId: org.id };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email },
      relations: ['organization'],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      // Unified message — never reveal which field was wrong
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.issueTokens(user, res);

    return { id: user.id, email: user.email, role: user.role, orgId: user.organization.id };
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────
  // Called with the raw refresh token from the cookie.
  // Verifies JWT signature → extracts userId → validates against Redis hash.
  // On success: rotates both tokens (new access + new refresh).

  async refresh(rawRefreshToken: string, res: Response) {
    // 1. Verify JWT signature and expiry
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Compare hash against Redis — catches rotated or logged-out tokens
    const stored = await this.cacheService.get(`refresh:${payload.sub}`);
    if (!stored || stored !== this.hash(rawRefreshToken)) {
      throw new UnauthorizedException('Session expired — please log in again');
    }

    // 3. Load user and re-issue
    const user = await this.usersRepo.findOne({
      where: { id: payload.sub },
      relations: ['organization'],
    });
    if (!user) throw new UnauthorizedException();

    await this.issueTokens(user, res);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, res: Response) {
    await this.cacheService.delete(`refresh:${userId}`);
    this.clearCookies(res);
  }

  // ─── Token helpers ────────────────────────────────────────────────────────

  private async issueTokens(user: User, res: Response) {
    const orgId = user.organization?.id ?? (user as any).orgId;

    // Access token — short-lived JWT
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId,
      role: user.role as Role,
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: '15m',
    });

    // Refresh token — longer-lived JWT, hash stored in Redis for revocation
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );
    await this.cacheService.set(`refresh:${user.id}`, this.hash(refreshToken), REFRESH_TTL_MS);

    const isProd = this.config.get('NODE_ENV') === 'production';
    const base = { httpOnly: true, secure: isProd, sameSite: 'strict' as const };

    res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: ACCESS_TTL_MS });

    // Refresh cookie is scoped to /auth/refresh only — not sent on every request
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...base,
      maxAge: REFRESH_TTL_MS,
      path: '/api/v1/auth/refresh',
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE);
    res.clearCookie(REFRESH_COOKIE, { path: '/auth/refresh' });
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}