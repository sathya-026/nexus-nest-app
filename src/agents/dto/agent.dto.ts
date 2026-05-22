import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ example: 'Support Bot' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'You are a helpful support agent for Acme Inc...' })
  @IsString()
  systemPrompt: string;

  @ApiPropertyOptional({
    example: { primaryColor: '#6366f1', position: 'bottom-right', welcomeMessage: 'Hi!' },
  })
  @IsOptional()
  @IsObject()
  widgetConfig?: Record<string, any>;

  @ApiPropertyOptional({ example: 'example.com,app.example.com' })
  @IsOptional()
  @IsString()
  allowedDomains?: string;
}

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
