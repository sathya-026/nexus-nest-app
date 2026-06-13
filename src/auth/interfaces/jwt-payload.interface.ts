import { Role } from '../../common/enums/role.enum';

// Shape of the signed JWT payload (access token)
export interface JwtPayload {
  sub:   string; // user id
  email: string;
  orgId: string;
  role:  Role;
}

// Shape of request.user after JwtStrategy.validate() runs
export interface AuthUser {
  id:    string;
  email: string;
  orgId: string;
  role:  Role;
}