import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { AuthUser, JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // Extract JWT from the access_token HTTP-only cookie.
      // Never from the Authorization header — that would allow JS access.
      jwtFromRequest: (req: Request) => {

        console.log('COOKIES:', req?.cookies);
        console.log('COOKIE HEADER:', req?.headers?.cookie);

        return req?.cookies?.access_token ?? null;

      },
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  // Return value is attached to request.user
  validate(payload: JwtPayload): AuthUser {
    console.log('JWT PAYLOAD:', payload);
    return {
      id: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      role: payload.role,
    };
  }
}