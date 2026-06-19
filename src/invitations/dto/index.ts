import {
  IsEmail, IsEnum, IsString, IsArray,
  IsUUID, IsOptional, MinLength, ArrayUnique,
} from 'class-validator';

export class SendInviteDto {
  @IsEmail()
  email: string;

  @IsEnum(['admin', 'member'])
  role: 'admin' | 'member';

  // Optional: restrict member to specific agents.
  // Omit or pass null → full access to all private agents.
  // Only relevant when role = 'member'.
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  agentIds?: string[] | null;
}

export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}