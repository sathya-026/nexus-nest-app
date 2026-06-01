import {
  IsString,
  IsEnum,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { HttpMethod, ToolType } from '../entities/tool.entity';

export class CreateToolDto {
  @ApiProperty({ example: 'get_order_status' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'Retrieves the current status and tracking info for an order by order ID.',
  })
  @IsString()
  @MinLength(10) // Force meaningful descriptions — agent uses this to decide when to call
  description: string;

  @ApiPropertyOptional({ enum: ToolType, default: ToolType.HTTP })
  @IsOptional()
  @IsEnum(ToolType)
  type?: ToolType;

  @ApiProperty({ example: 'https://api.mystore.com/orders/status' })
  @IsString()
  endpointUrl: string;
  // @IsUrl()

  @ApiPropertyOptional({ enum: HttpMethod, default: HttpMethod.POST })
  @IsOptional()
  @IsEnum(HttpMethod)
  httpMethod?: HttpMethod;

  // Headers are accepted in plaintext and encrypted before storage
  @ApiPropertyOptional({ example: { Authorization: 'Bearer sk-...' } })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  // JSON Schema object describing the tool's input parameters
  @ApiPropertyOptional({
    example: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'The order ID to look up' } },
      required: ['orderId'],
    },
  })
  @IsOptional()
  @IsObject()
  parametersSchema?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateToolDto extends PartialType(CreateToolDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
