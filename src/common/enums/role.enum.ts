export enum Role {
  Owner  = 'owner',
  Admin  = 'admin',
  Member = 'member',
}

// Numeric level used by RolesGuard — higher = more privileged
export const ROLE_LEVEL: Record<Role, number> = {
  [Role.Owner]:  3,
  [Role.Admin]:  2,
  [Role.Member]: 1,
};