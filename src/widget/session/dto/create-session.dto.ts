import { IsString, IsUUID, Length } from 'class-validator';

export class CreateSessionDto {
  @IsUUID('7')
  agentId: string;

  @IsString()
  @Length(1, 128)
  sessionId: string;
}