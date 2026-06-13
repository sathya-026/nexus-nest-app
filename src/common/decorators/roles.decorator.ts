import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

// Usage: @Roles(Role.Admin)  → caller must be Admin or Owner
//        @Roles(Role.Owner)  → caller must be Owner only
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);