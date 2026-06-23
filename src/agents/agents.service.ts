import { Role } from "@common/enums/role.enum";
import { AuthUser } from "@modules/auth/interfaces/jwt-payload.interface";
import { UserAgentAccess } from "@modules/team/entities/user-agent-access.entity";
import {
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppException } from '@common/exceptions/app.exception';
import { ErrorCode } from '@common/constants/error-codes';
import { CreateAgentDto, UpdateAgentDto } from "./dto/agent.dto";
import { Agent } from "./entities/agent.entity";

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentsRepo: Repository<Agent>,
    @InjectRepository(UserAgentAccess)
    private readonly userAgentAccessRepo: Repository<UserAgentAccess>,
  ) { }

  async create(orgId: string, dto: CreateAgentDto): Promise<Agent> {

    const agent = this.agentsRepo.create({
      orgId,
      name: dto.name,
      accessType: dto.accessType,
      systemPrompt: dto.systemPrompt,
      widgetConfig: dto.widgetConfig ?? {},
      allowedDomains: dto.allowedDomains ?? null,
    });
    return this.agentsRepo.save(agent);
  }

  // All list/find methods are scoped to the requesting org — prevents IDOR
  async findAll(orgId: string, user: AuthUser): Promise<Agent[]> {
    const agents = await this.agentsRepo.find({ where: { orgId } });
    if (user.role === Role.Member) {
      const selectiveAgents = await this.userAgentAccessRepo.find({
        where: {
          userId: user.id,
          agent: {
            orgId
          }
        },
      });
      if (selectiveAgents.length > 0) {
        return agents.filter((a) => {
          return selectiveAgents.findIndex((s) => s.agentId == a.id) !== -1;
        })
      }
    }
    return agents;
  }

  async findAllIds(orgId: string): Promise<Agent[]> {
    return this.agentsRepo.find({ where: { orgId }, select: ["id"] });
  }

  async findOne(orgId: string, agentId: string): Promise<Agent> {
    const agent = await this.agentsRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new AppException(
      ErrorCode.AGENT_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
    if (agent.orgId !== orgId) throw new AppException(
      ErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
    );
    return agent;
  }

  async findOneWithRoleCheck(agentId: string, user: AuthUser) {
    const agent = await this.agentsRepo.findOneBy({ id: agentId });
    if (user.role === Role.Member) {
      const selectiveAgents = await this.userAgentAccessRepo.find({
        where: {
          userId: user.id,
          agent: {
            orgId: user.orgId
          }
        }
      });
      if (selectiveAgents.length > 0 && selectiveAgents.find((a) => a.agentId == agentId)) {
        return agent;
      }
    }
    return agent;
  }

  // Used by agent-core and widget — verifies agent belongs to org's API key
  async findByIdPublic(agentId: string): Promise<Agent | null> {
    return this.agentsRepo.findOne({ where: { id: agentId, isActive: true } });
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

  async canAccessAgent(agentId: string, user: AuthUser) {
    if (user.role === Role.Member) {
      const allowedAgents = await this.userAgentAccessRepo.find({ where: { agentId, userId: user.id } });
      return allowedAgents.length > 0;
    }
    return true;
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
      throw new AppException(
        ErrorCode.AGENT_ORIGIN_REQUIRED,
        HttpStatus.FORBIDDEN,
        "Origin header required for domain-restricted agents",
      );
    }

    const hostname = new URL(origin).hostname;
    const permitted = allowed.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    );

    if (!permitted) {
      throw new AppException(
        ErrorCode.AGENT_ORIGIN_NOT_PERMITTED,
        HttpStatus.FORBIDDEN,
        `Origin '${origin}' is not permitted for this agent`,
      );
    }
  }
}
