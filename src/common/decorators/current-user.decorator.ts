import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

// @CurrentUser() — injects the JWT-decoded user into a controller method parameter
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// @Roles('owner') — used with RolesGuard to restrict endpoints
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
