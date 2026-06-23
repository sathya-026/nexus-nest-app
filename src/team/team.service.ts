import { ErrorCode } from '@common/constants/error-codes';
import { AppException } from '@common/exceptions/app.exception';
import {
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { ChangeRoleDto, UpdateAgentAccessDto } from './dto/index';
import { UserAgentAccess } from './entities/user-agent-access.entity';

@Injectable()
export class TeamService {
    constructor(
        @InjectRepository(User) private usersRepo: Repository<User>,
        @InjectRepository(UserAgentAccess) private uaaRepo: Repository<UserAgentAccess>,
        private dataSource: DataSource,
    ) { }

    // ─── List members ─────────────────────────────────────────────────────────

    async listMembers(caller: AuthUser) {
        return this.usersRepo.find({
            where: { orgId: caller.orgId },
            select: ['id', 'email', 'role', 'createdAt'],
            order: { createdAt: 'ASC' },
        });
    }

    // ─── Change role — owner only ──────────────────────────────────────────────

    async changeRole(targetId: string, dto: ChangeRoleDto, caller: AuthUser) {
        if (caller.role !== Role.Owner) {
            throw new AppException(
                ErrorCode.FORBIDDEN,
                HttpStatus.FORBIDDEN,
                'Only the owner can change roles',
            );
        }
        if (targetId === caller.id) {
            throw new AppException(
                ErrorCode.BAD_REQUEST,
                HttpStatus.BAD_REQUEST,
                'You cannot change your own role',
            );
        }

        const target = await this.findMember(targetId, caller.orgId);
        if (target.role === Role.Owner) {
            throw new AppException(
                ErrorCode.FORBIDDEN,
                HttpStatus.FORBIDDEN,
                'Cannot change the owner\'s role',
            );
        }

        target.role = dto.role;
        const saved = await this.usersRepo.save(target);
        return { id: saved.id, email: saved.email, role: saved.role };
    }

    // ─── Remove member ────────────────────────────────────────────────────────

    async removeMember(targetId: string, caller: AuthUser) {
        if (targetId === caller.id) {
            throw new AppException(
                ErrorCode.BAD_REQUEST,
                HttpStatus.BAD_REQUEST,
                'You cannot remove yourself',
            );
        }

        const target = await this.findMember(targetId, caller.orgId);

        if (target.role === Role.Owner) {
            throw new AppException(
                ErrorCode.FORBIDDEN,
                HttpStatus.FORBIDDEN,
                'Cannot remove the owner',
            );
        }

        // Admins can only remove members — not other admins
        if (caller.role === Role.Admin && target.role !== Role.Member) {
            throw new AppException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Admins can only remove members');
        }

        await this.dataSource.transaction(async (tx) => {
            // Revoke all active widget auth tokens for this user across the org's agents
            await tx.query(
                `UPDATE widget_auth_tokens wat
         SET    revoked_at = NOW()
         WHERE  wat.email = $1
           AND  wat.revoked_at IS NULL
           AND  EXISTS (
             SELECT 1 FROM agents a
             WHERE  a.id = wat.agent_id AND a.org_id = $2
           )`,
                [target.email, caller.orgId],
            );

            // Delete user — cascades to user_agent_access via FK
            await tx.delete(User, { id: targetId });
        });

        return { message: 'Member removed' };
    }

    // ─── Get agent access for a member ────────────────────────────────────────

    async getAgentAccess(targetId: string, caller: AuthUser) {
        const target = await this.findMember(targetId, caller.orgId);
        this.assertMemberRole(target);

        const rows = await this.uaaRepo.find({
            where: { userId: targetId },
            select: ['agentId', 'createdAt'],
        });

        return {
            userId: targetId,
            fullAccess: rows.length === 0,
            agentIds: rows.map((r) => r.agentId),
        };
    }

    // ─── Update agent access ───────────────────────────────────────────────────
    // Replaces the entire access set in one transaction.

    async updateAgentAccess(targetId: string, dto: UpdateAgentAccessDto, caller: AuthUser) {
        if (caller.role === Role.Member) {
            throw new AppException(
                ErrorCode.FORBIDDEN,
                HttpStatus.FORBIDDEN,
            );
        }

        const target = await this.findMember(targetId, caller.orgId);
        this.assertMemberRole(target);

        await this.dataSource.transaction(async (tx) => {
            await tx.delete(UserAgentAccess, { userId: targetId });

            if (dto.agentIds && dto.agentIds.length > 0) {
                const rows = dto.agentIds.map((agentId) =>
                    tx.create(UserAgentAccess, { userId: targetId, agentId, grantedBy: caller.id }),
                );
                await tx.save(UserAgentAccess, rows);
            }
        });

        return {
            userId: targetId,
            fullAccess: !dto.agentIds || dto.agentIds.length === 0,
            agentIds: dto.agentIds ?? [],
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async findMember(userId: string, orgId: string): Promise<User> {
        const user = await this.usersRepo.findOne({ where: { id: userId, orgId } });
        if (!user) throw new AppException(
            ErrorCode.RESOURCE_NOT_FOUND,
            HttpStatus.NOT_FOUND,
            'Member not found',
        );
        return user;
    }

    // Access restrictions only apply to members — throw early if called on an admin/owner
    private assertMemberRole(user: User) {
        if (user.role !== Role.Member) {
            throw new AppException(ErrorCode.BAD_REQUEST, HttpStatus.BAD_REQUEST, 'Agent access restrictions only apply to members. Admins and owners always have full access.');
        }
    }
}