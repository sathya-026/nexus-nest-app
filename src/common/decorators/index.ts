import { AuthUser } from '@modules/auth/interfaces/jwt-payload.interface';
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

// ─── @Public() ──────────────────────────────────────────────────────────────
// Mark a route as publicly accessible — JwtAuthGuard will skip it.
// Applied to: POST /auth/login, POST /auth/register, POST /auth/refresh,
//             POST /widget/auth/*, GET /agents/:id/public-config
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ─── @CurrentUser() ─────────────────────────────────────────────────────────
// Injects the validated JWT payload attached by JwtStrategy.validate()
// Shape: { id, email, orgId, role }
export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthUser => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);