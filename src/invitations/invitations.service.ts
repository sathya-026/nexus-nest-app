import {
    Injectable, ConflictException,
    NotFoundException, ForbiddenException, GoneException,
    HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { OrgInvitation } from './entities/org-invitation.entity';
import { UserAgentAccess } from '../team/entities/user-agent-access.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { SendInviteDto, AcceptInviteDto } from './dto/index';
import { AppException } from '@common/exceptions/app.exception';
import { ErrorCode } from '@common/constants/error-codes';

@Injectable()
export class InvitationsService {
    constructor(
        @InjectRepository(OrgInvitation) private invRepo: Repository<OrgInvitation>,
        @InjectRepository(User) private usersRepo: Repository<User>,
        private authService: AuthService,
        private dataSource: DataSource,
        private mailService: MailService,
        private config: ConfigService,
    ) { }

    // ─── Send / resend invite ─────────────────────────────────────────────────

    async send(dto: SendInviteDto, caller: AuthUser): Promise<{ message: string }> {
        // Only owners and admins can invite
        if (caller.role === Role.Member) throw new AppException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);

        // Owners can invite both admins and members; admins can only invite members
        if (caller.role === Role.Admin && dto.role === 'admin') {
            throw new AppException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Admins cannot invite other admins');
        }

        // Guard: email already in the org
        const existingUser = await this.usersRepo.findOne({
            where: { email: dto.email, orgId: caller.orgId },
        });
        if (existingUser) throw new ConflictException('User is already a member of this organization');

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hash(rawToken);
        const agentIds = dto.agentIds ?? null;
        const frontendUrl = this.config.getOrThrow('frontendUrl');
        const inviteUrl = `${frontendUrl}invite/accept?token=${rawToken}`;

        // Upsert — regenerates token even on resend; no-ops if already accepted
        const result = await this.dataSource.query<{ id: string }[]>(
            `INSERT INTO org_invitations
         (org_id, email, role, token_hash, invited_by, expires_at, agent_restrictions)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '72 hours', $6)
       ON CONFLICT (org_id, email) DO UPDATE
         SET token_hash         = excluded.token_hash,
             role               = excluded.role,
             invited_by         = excluded.invited_by,
             expires_at         = excluded.expires_at,
             accepted_at        = NULL,
             agent_restrictions = excluded.agent_restrictions
       WHERE org_invitations.accepted_at IS NULL
       RETURNING id`,
            [
                caller.orgId,
                dto.email,
                dto.role,
                tokenHash,
                caller.id,
                agentIds ? JSON.stringify(agentIds) : null,
            ],
        );

        // Empty RETURNING → conflict row has accepted_at set → already a member
        if (result.length === 0) {
            throw new AppException(ErrorCode.RESOURCE_CONFLICT, HttpStatus.CONFLICT, 'User is already a member of this organization');
        }

        // Load org name for the email
        const org = await this.dataSource.query<{ name: string }[]>(
            'SELECT name FROM organizations WHERE id = $1',
            [caller.orgId],
        );

        await this.mailService.sendInvite(dto.email, org[0].name, inviteUrl);

        return { message: 'Invitation sent' };
    }

    // ─── Validate token (frontend pre-check before showing the form) ──────────

    async validate(rawToken: string): Promise<{ email: string; orgName: string; role: string }> {
        const inv = await this.invRepo.findOne({
            where: { tokenHash: this.hash(rawToken) },
            relations: ['org'],
        });

        if (!inv) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Invalid invitation link');
        if (inv.acceptedAt) throw new AppException(ErrorCode.RESOURCE_CONFLICT, HttpStatus.CONFLICT, 'Invitation has already been used');
        if (inv.expiresAt < new Date()) throw new AppException(ErrorCode.GONE, HttpStatus.GONE, 'Invitation has expired');

        return { email: inv.email, orgName: inv.org.name, role: inv.role };
    }

    // ─── Accept invite ────────────────────────────────────────────────────────

    async accept(dto: AcceptInviteDto, res: Response): Promise<{ id: string; email: string; role: string }> {
        const inv = await this.invRepo.findOne({
            where: { tokenHash: this.hash(dto.token) },
            relations: ['org'],
        });

        if (!inv) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Invalid invitation link');
        if (inv.acceptedAt) throw new AppException(ErrorCode.RESOURCE_CONFLICT, HttpStatus.CONFLICT, 'Invitation has already been used');
        if (inv.expiresAt < new Date()) throw new AppException(ErrorCode.GONE, HttpStatus.GONE, 'Invitation has expired');

        // Multi-org is post-MVP: block if email already registered anywhere
        const existing = await this.usersRepo.findOne({ where: { email: inv.email } });

        if (existing) throw new AppException(ErrorCode.RESOURCE_CONFLICT, HttpStatus.CONFLICT, 'An account with this email already exists');

        const user = await this.dataSource.transaction(async (tx) => {
            // Create user
            const newUser = tx.create(User, {
                email: inv.email,
                passwordHash: await bcrypt.hash(dto.password, 12),
                role: inv.role as Role,
                orgId: inv.orgId,
            });
            await tx.save(User, newUser);

            // Apply agent restrictions if the invite specified them
            if (inv.agentRestrictions && inv.agentRestrictions.length > 0) {
                const rows = inv.agentRestrictions.map((agentId) =>
                    tx.create(UserAgentAccess, {
                        userId: newUser.id,
                        agentId,
                        grantedBy: inv.invitedBy,
                    }),
                );
                await tx.save(UserAgentAccess, rows);
            }

            // Mark invitation accepted
            await tx.update(OrgInvitation, { id: inv.id }, { acceptedAt: new Date() });
            await this.authService.issueTokens(newUser, res);
            return newUser;
        });

        // Attach org for token issuance (orgId is already on the entity)
        (user as any).org = inv.org;

        return { id: user.id, email: user.email, role: user.role };
    }

    private hash(value: string): string {
        return crypto.createHash('sha256').update(value).digest('hex');
    }
}