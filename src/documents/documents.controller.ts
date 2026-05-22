import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

class RequestUploadDto {
  @IsString() fileName: string;
  @IsString() fileType: string; // MIME type, e.g. "application/pdf"
}

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Get a pre-signed S3 URL to upload a document' })
  @ApiBody({ type: RequestUploadDto })
  getUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Body() dto: RequestUploadDto,
  ) {
    return this.documentsService.getUploadUrl(
      user.orgId,
      agentId,
      dto.fileName,
      dto.fileType,
    );
  }

  @Post(':documentId/confirm')
  @ApiOperation({ summary: 'Confirm S3 upload succeeded — triggers indexing' })
  confirmUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.confirmUpload(user.orgId, agentId, documentId);
  }

  @Get()
  @ApiOperation({ summary: 'List documents for an agent' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
  ) {
    return this.documentsService.findAll(user.orgId, agentId);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get document details + indexing status' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.findOne(user.orgId, agentId, documentId);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete a document and remove from S3 + vector store' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.remove(user.orgId, agentId, documentId);
  }
}
