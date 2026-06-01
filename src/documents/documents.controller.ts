import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { UpdateDocDto } from './dto/update-doc.dto';
import { ConfigService } from '@nestjs/config';

class RequestUploadDto {
  @IsString() fileName: string;
  @IsString() fileType: string; // MIME type, e.g. "application/pdf"
}

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService, private readonly config: ConfigService) { }

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
  async confirmUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDocDto,
    @Param('agentId') agentId: string,
    @Param('documentId') documentId: string,
  ) {

    try {
      const doc = await this.documentsService.confirmUpload(user.orgId, agentId, documentId);
      if (doc) {
        const agentCoreUrl = this.config.get<string>('AGENT_CORE_URL');
        const internalSecret = this.config.get<string>('INTERNAL_SECRET');
        await fetch(`${agentCoreUrl}/api/indexing/index`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': internalSecret,
          },
          body: JSON.stringify({
            document_id: doc.id,
            agent_id: doc.agentId,
            org_id: user.orgId,
            s3_key: doc.s3Key,
            file_type: doc.fileType,
          }),
        });
        return this.documentsService.updateDoc(documentId, dto);
      }
    }
    catch (err) {
      console.error('Error confirming document upload', err);
      throw err;
    }

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

  @Patch(':documentId')
  @ApiOperation({ summary: 'Delete a document and remove from S3 + vector store' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocDto,
  ) {
    return this.documentsService.updateDoc(documentId, dto);
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
