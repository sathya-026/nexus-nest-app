import {
  IsEnum, IsArray, IsUUID,
  IsOptional, ArrayUnique,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class ChangeRoleDto {
  // Owner can set admin or member; owner role is never assigned via this endpoint
  @IsEnum([Role.Admin, Role.Member])
  role: Role.Admin | Role.Member;
}

export class UpdateAgentAccessDto {
  // null  → clear all restrictions (full access to all private agents)
  // []    → access to zero private agents
  // [ids] → access to specific agents only
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  agentIds: string[] | null;
}