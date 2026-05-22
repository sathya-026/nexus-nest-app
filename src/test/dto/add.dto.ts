import { IsString, IsOptional, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddDto {
  @ApiProperty()
  list: number[];
}