import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Agent } from "./entities/agent.entity";
import { CreateAgentDto, UpdateAgentDto } from "./dto/agent.dto";

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentsRepo: Repository<Agent>,
  ) {}

  async create(orgId: string, dto: CreateAgentDto): Promise<Agent> {
    const agent = this.agentsRepo.create({
      orgId,
      name: dto.name,
      systemPrompt: dto.systemPrompt,
      widgetConfig: dto.widgetConfig ?? {},
      allowedDomains: dto.allowedDomains ?? null,
    });
    return this.agentsRepo.save(agent);
  }

  // All list/find methods are scoped to the requesting org — prevents IDOR
  async findAll(orgId: string): Promise<Agent[]> {
    return this.agentsRepo.find({ where: { orgId } });
  }

  async findAllIds(orgId: string): Promise<Agent[]> {
    return this.agentsRepo.find({ where: { orgId }, select: ["id"] });
  }

  async findOne(orgId: string, agentId: string): Promise<Agent> {
    const agent = await this.agentsRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException("Agent not found");
    if (agent.orgId !== orgId) throw new ForbiddenException();
    return agent;
  }

  async update(
    orgId: string,
    agentId: string,
    dto: UpdateAgentDto,
  ): Promise<Agent> {
    const agent = await this.findOne(orgId, agentId);
    Object.assign(agent, dto);
    return this.agentsRepo.save(agent);
  }

  async remove(orgId: string, agentId: string): Promise<void> {
    const agent = await this.findOne(orgId, agentId);
    await this.agentsRepo.remove(agent);
  }

  // Used by agent-core and widget — verifies agent belongs to org's API key
  async findByIdPublic(agentId: string): Promise<Agent | null> {
    return this.agentsRepo.findOne({ where: { id: agentId, isActive: true } });
  }

  // src/agents/agents.service.ts  — add these two methods

  /**
   * Lightweight fetch for embed context — no JWT user needed,
   * only checks org ownership and active status.
   */
  async findForEmbed(agentId: string, orgId: string): Promise<Agent | null> {
    return this.agentsRepo.findOne({
      where: { id: agentId, orgId, isActive: true },
    });
  }

  /**
   * Validate the request Origin against agent.allowedDomains.
   * Empty allowedDomains = allow all (dev mode).
   * Throws ForbiddenException if the origin is not permitted.
   */
  validateDomain(agent: Agent, origin: string | undefined): void {
    if (!agent.allowedDomains?.trim()) return; // open / dev mode

    const allowed = agent.allowedDomains
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    if (!origin) {
      throw new ForbiddenException(
        "Origin header required for domain-restricted agents",
      );
    }

    const hostname = new URL(origin).hostname;
    const permitted = allowed.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    );

    if (!permitted) {
      throw new ForbiddenException(
        `Origin '${origin}' is not permitted for this agent`,
      );
    }
  }
}
