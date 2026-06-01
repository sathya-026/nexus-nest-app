import { IsString, IsOptional, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatWidgetDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ example: 'session-1' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'What can you do?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  endUserId?: string;
}

export class TestWidgetDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ example: 'What can you do?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  orgId: string;

  @ApiProperty({ example: 'sess_123' })
  @IsString()
  sessionId: string;
}

export class FetchHistoryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orgId: string;

  @ApiProperty({ example: 'Session-1' })
  @IsString()
  sessionId: string;
}