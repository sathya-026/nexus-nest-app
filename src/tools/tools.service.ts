import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Tool } from './entities/tool.entity';
import { CreateToolDto, UpdateToolDto } from './dto/tool.dto';
import { AgentsService } from '../agents/agents.service';

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class ToolsService {
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(Tool)
    private readonly toolsRepo: Repository<Tool>,
    private readonly agentsService: AgentsService,
    private readonly config: ConfigService,
  ) {
    // Key must be 32 bytes (64 hex chars)
    this.encryptionKey = Buffer.from(
      config.get<string>('encryption.key'),
      'hex',
    );
  }

  // ── Encryption helpers ──────────────────────────────────────────────────

  private encrypt(data: Record<string, string>): Record<string, string> {
    console.log(this.encryptionKey.length);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const json = JSON.stringify(data);
    const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Store as: iv:tag:encrypted — all base64
    return {
      __encrypted: `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`,
    };
  }

  private decrypt(stored: Record<string, string>): Record<string, string> {
    if (!stored?.__encrypted) return stored;
    const [ivB64, tagB64, encB64] = stored.__encrypted.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const enc = Buffer.from(encB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  async create(orgId: string, agentId: string, dto: CreateToolDto): Promise<Tool> {
    await this.agentsService.findOne(orgId, agentId); // Verifies agent belongs to org

    const tool = this.toolsRepo.create({
      agentId,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      endpointUrl: dto.endpointUrl,
      httpMethod: dto.httpMethod,
      headers: dto.headers ? this.encrypt(dto.headers) : null,
      parametersSchema: dto.parametersSchema ?? null,
    });
    return this.toolsRepo.save(tool);
  }

  async findAll(orgId: string, agentId: string): Promise<Tool[]> {
    await this.agentsService.findOne(orgId, agentId);
    const tools = await this.toolsRepo.find({ where: { agentId } });
    // Never return decrypted headers in list view
    return tools.map((t) => ({ ...t, headers: undefined }));
  }

  async findOne(orgId: string, agentId: string, toolId: string): Promise<Tool> {
    await this.agentsService.findOne(orgId, agentId);
    const tool = await this.toolsRepo.findOne({
      where: { id: toolId, agentId },
    });
    if (!tool) throw new NotFoundException('Tool not found');
    return { ...tool, headers: undefined }; // Strip headers in API responses
  }

  // Called internally by agent-core — returns decrypted headers for HTTP execution
  async findForExecution(agentId: string, toolId: string): Promise<Tool> {
    const tool = await this.toolsRepo.findOne({ where: { id: toolId, agentId } });
    if (!tool) throw new NotFoundException('Tool not found');
    if (tool.headers) tool.headers = this.decrypt(tool.headers);
    return tool;
  }

  async update(orgId: string, agentId: string, toolId: string, dto: UpdateToolDto): Promise<Tool> {
    const tool = await this.toolsRepo.findOne({ where: { id: toolId, agentId } });
    if (!tool) throw new NotFoundException('Tool not found');
    await this.agentsService.findOne(orgId, agentId);

    if (dto.headers) dto = { ...dto, headers: this.encrypt(dto.headers) as any };
    Object.assign(tool, dto);
    const saved = await this.toolsRepo.save(tool);
    return { ...saved, headers: undefined };
  }

  async remove(orgId: string, agentId: string, toolId: string): Promise<void> {
    const tool = await this.toolsRepo.findOne({ where: { id: toolId, agentId } });
    if (!tool) throw new NotFoundException('Tool not found');
    await this.agentsService.findOne(orgId, agentId);
    await this.toolsRepo.remove(tool);
  }
}
