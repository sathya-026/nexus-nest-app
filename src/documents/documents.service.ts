import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AgentsService } from "../agents/agents.service";
import { Document, DocumentStatus } from "./entities/document.entity";
import { UpdateDocDto } from "./dto/update-doc.dto";
import { AppException } from '@common/exceptions/app.exception';
import { ErrorCode } from '@common/constants/error-codes';

@Injectable()
export class DocumentsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(Document)
    private readonly docsRepo: Repository<Document>,
    private readonly agentsService: AgentsService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: config.get<string>("aws.region"),
      credentials: {
        accessKeyId: config.get<string>("aws.accessKeyId"),
        secretAccessKey: config.get<string>("aws.secretAccessKey"),
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    this.bucket = config.get<string>("aws.s3Bucket");
  }

  /**
   * Returns a pre-signed S3 URL + creates a pending Document record.
   * Upload flow: frontend gets URL → uploads directly to S3 → calls confirmUpload.
   */
  async getUploadUrl(
    orgId: string,
    agentId: string,
    fileName: string,
    fileType: string,
  ): Promise<{ uploadUrl: string; documentId: string; s3Key: string }> {
    await this.agentsService.findOne(orgId, agentId);

    const s3Key = `${orgId}/${agentId}/${Date.now()}_${fileName}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: fileType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 600 });

    const doc = this.docsRepo.create({
      agentId,
      name: fileName,
      fileType,
      s3Key,
      status: DocumentStatus.PENDING,
    });
    const saved = await this.docsRepo.save(doc);

    return { uploadUrl, documentId: saved.id, s3Key };
  }

  /**
   * Called after the frontend confirms the S3 upload succeeded.
   * Sets status to 'indexing' — FastAPI agent-core picks this up via polling or queue.
   */
  async confirmUpload(
    orgId: string,
    agentId: string,
    documentId: string,
  ): Promise<Document> {
    const doc = await this.findOne(orgId, agentId, documentId);
    doc.status = DocumentStatus.INDEXING;
    return this.docsRepo.save(doc);
  }

  async findAll(orgId: string, agentId: string): Promise<Document[]> {
    await this.agentsService.findOne(orgId, agentId);
    return this.docsRepo.find({ where: { agentId } });
  }

  async findOne(
    orgId: string,
    agentId: string,
    documentId: string,
  ): Promise<Document> {
    await this.agentsService.findOne(orgId, agentId);
    const doc = await this.docsRepo.findOne({
      where: { id: documentId, agentId },
    });
    if (!doc) throw new AppException(
      ErrorCode.RESOURCE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      "Document not found",
    );
    return doc;
  }

  async remove(
    orgId: string,
    agentId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.findOne(orgId, agentId, documentId);

    // Delete from S3 first, then DB (order matters for cleanup consistency)
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: doc.s3Key }),
    );
    await this.docsRepo.remove(doc);
  }

  async updateDoc(
    documentId: string,
    payload: UpdateDocDto
  ): Promise<Document> {
    delete payload.documentId;
    await this.docsRepo.update(documentId, {
      ...payload,
    });
    return await this.docsRepo.findOne({ where: { id: documentId } })
  }

  // Called by agent-core after indexing completes
  async updateStatus(
    documentId: string,
    status: DocumentStatus,
    chunkCount?: number,
  ): Promise<void> {
    await this.docsRepo.update(documentId, {
      status,
      ...(chunkCount !== undefined && { chunkCount }),
    });
  }
}
