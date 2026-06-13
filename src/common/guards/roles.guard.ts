import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, ROLE_LEVEL } from '../enums/role.enum';

// Applied globally (see AppModule). Runs after JwtAuthGuard.
//
// @Roles(Role.Admin)  → passes if caller is Admin (level 2) or Owner (level 3)
// @Roles(Role.Owner)  → passes if caller is Owner (level 3) only
// No @Roles()         → passes for any authenticated user (guard is a no-op)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() on the handler or controller — any authenticated user passes
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const userLevel = ROLE_LEVEL[user.role as Role] ?? 0;
    // Minimum level among all required roles (typically you pass one)
    const minRequired = Math.min(...required.map((r) => ROLE_LEVEL[r]));

    return userLevel >= minRequired;
  }
}