import { Agent } from '@modules/agents/entities/agent.entity';
import { MailService } from '@modules/mail/mail.service';
import { UsersService } from '@modules/users/users.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { WidgetAuthToken } from './entities/widget-auth-token.entity';
import { WidgetOtpCode } from './entities/widget-opt-code.entity';
import { uuidv7 } from 'node_modules/uuidv7/dist/index.cjs';
import { CacheService } from '@modules/redis/cache.service';
import { JwtService } from '@nestjs/jwt';



const OTP_EXPIRY_MS = 10 * 60 * 1000;  // 10 minutes
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 30 days
const OTP_RATE_LIMIT = 3;               // per hour per email+agent

// Always returned from requestOtp — never reveal if the email is in the org
const SILENT_RESPONSE = { message: 'If your email is registered, you will receive a code.' };

@Injectable()
export class WidgetAuthService {
  constructor(
    @InjectRepository(Agent) private agentsRepo: Repository<Agent>,
    @InjectRepository(WidgetOtpCode) private otpRepo: Repository<WidgetOtpCode>,
    @InjectRepository(WidgetAuthToken) private tokenRepo: Repository<WidgetAuthToken>,
    private dataSource: DataSource,
    private mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
  ) { }

  // ─── Request OTP ──────────────────────────────────────────────────────────
  // Always returns the same message — never reveals whether the email is in the org.


  async requestOtp(dto: RequestOtpDto) {
    const agent = await this.agentsRepo.findOne({
      where: { id: dto.agentId, isActive: true },
    });

    // Silently bail if agent doesn't exist or isn't private
    if (!agent || agent.accessType !== 'private') return SILENT_RESPONSE;

    // Check user has access to this agent
    const hasAccess = await this.checkUserAccess(dto.email, dto.agentId, agent.orgId);
    if (!hasAccess) return SILENT_RESPONSE;

    // Rate limit: max OTP_RATE_LIMIT requests per hour
    const [{ count }] = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*)::int as count FROM widget_otp_codes
       WHERE email = $1 AND agent_id = $2
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [dto.email, dto.agentId],
    );
    if (+count >= OTP_RATE_LIMIT) {
      throw new HttpException(
        'Too many requests. Please wait before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate and store OTP
    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    await this.otpRepo.save(
      this.otpRepo.create({
        agentId: dto.agentId,
        email: dto.email,
        codeHash: this.hash(code),
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      }),
    );

    await this.mailService.sendOtp(dto.email, code, agent.name);

    return SILENT_RESPONSE;
  }

  // ─── Verify OTP ───────────────────────────────────────────────────────────

  async verifyOtp(dto: VerifyOtpDto): Promise<{ token: string; expiresAt: string }> {
    // Find the most recent unused, unexpired OTP for this email+agent
    const otp = await this.otpRepo.findOne({
      where: {
        email: dto.email,
        agentId: dto.agentId,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!otp || otp.attempts >= 3) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    if (this.hash(dto.code) !== otp.codeHash) {
      await this.otpRepo.increment({ id: otp.id }, 'attempts', 1);
      throw new UnauthorizedException('Incorrect code');
    }

    // Mark as used
    await this.otpRepo.update(otp.id, { usedAt: new Date() });
    const agent = await this.agentsRepo.findOne({
      where: { id: dto.agentId, isActive: true },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    const tokenKey = `widget_session:${agent.id}:${dto.sessionId}`;
    const existingToken = await this.cacheService.get(tokenKey);

    if (existingToken) {
      return JSON.parse(existingToken);
    }

    const payload = {
      sub: uuidv7(),
      agentId: agent.id,
      orgId: agent.orgId,
      sessionId: dto.sessionId,
      email: dto.email,
      type: 'widget_session',
    };

    const token = this.jwtService.sign(payload);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();
    await this.tokenRepo.save({ agentId: agent.id, email: dto.email, tokenHash: this.hash(token), expiresAt })

    const sessionData = {
      token,
      expiresAt,
    };
    await this.cacheService.set(tokenKey, JSON.stringify(sessionData), TOKEN_EXPIRY_MS);

    return sessionData;
  }

  // ─── Guard Helper ───────────────────────────────────────────────────────────

  async getToken(tokenHash: string, agentId: string) {
    return await this.tokenRepo.findOne({
      where: { tokenHash, agentId, revokedAt: IsNull() },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // Checks the user exists in the org AND has access to this specific agent.
  // Admins/owners always pass. Members must have no restrictions OR an explicit row.
  private async checkUserAccess(
    email: string,
    agentId: string,
    orgId: string,
  ): Promise<boolean> {
    const result = await this.dataSource.query<{ id: string }[]>(
      `SELECT u.id FROM users u
       WHERE u.email = $1
         AND u.org_id = $2
         AND (
           u.role IN ('owner', 'admin')
           OR NOT EXISTS (
             SELECT 1 FROM user_agent_access WHERE user_id = u.id
           )
           OR EXISTS (
             SELECT 1 FROM user_agent_access WHERE user_id = u.id AND agent_id = $3
           )
         )`,
      [email, orgId, agentId],
    );
    return result.length > 0;
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}