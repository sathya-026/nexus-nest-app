import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AppException } from '@common/exceptions/app.exception';
import { ErrorCode } from '@common/constants/error-codes';
import {
  Conversation,
  ConversationStatus,
} from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationsRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
  ) { }

  async findOrCreate(
    agentId: string,
    sessionId: string,
    endUserId?: string,
  ): Promise<Conversation> {
    const existing = await this.conversationsRepo.findOne({
      where: {
        agentId,
        sessionId,
        status: ConversationStatus.ACTIVE,
        endUserId: endUserId ?? null,
      },
    });
    if (existing) return existing;

    const conv = this.conversationsRepo.create({ agentId, sessionId });
    return this.conversationsRepo.save(conv);
  }

  async findById(conversationId: string): Promise<Conversation> {
    const conv = await this.conversationsRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new AppException(
      ErrorCode.RESOURCE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      "Conversation not found",
    );
    return conv;
  }

  async countByAgentIds(agentIds: string[]): Promise<Conversation[]> {
    const conv = await this.conversationsRepo.find({
      where: { agentId: In(agentIds) },
      select: ["totalTokens", "messageCount"],
    });
    if (!conv) throw new AppException(
      ErrorCode.RESOURCE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      "Conversation not found",
    );
    return conv;
  }

  /**
   * Cursor-based message pagination — ORDER BY sequence_number ASC
   * Avoids OFFSET which degrades on large conversations.
   * Pass cursor = last seen sequence_number for next page.
   */
  async getMessages(
    conversationId: string,
    cursor?: number,
    limit = 50,
  ): Promise<{ messages: Message[]; nextCursor: number | null }> {
    const qb = this.messagesRepo
      .createQueryBuilder("m")
      .where("m.conversation_id = :conversationId", { conversationId })
      .orderBy("m.sequence_number", "ASC")
      .take(limit + 1); // Fetch one extra to detect if there's a next page

    if (cursor) {
      qb.andWhere("m.sequence_number > :cursor", { cursor });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const messages = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? messages[messages.length - 1].sequenceNumber
      : null;

    return { messages, nextCursor };
  }

  async getSessionMessages(
    sessionId: string,
    agetId: string,
    cursor?: number,
    limit = 50,
  ): Promise<{ messages: Message[]; nextCursor: number | null, conversationId: string }> {
    try {
      const conversation = await this.conversationsRepo.findOne({
        where: { sessionId, agentId: agetId },
        select: ["id"],
      });
      if (!conversation) throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        "Conversation not found",
      );

      const qb = this.messagesRepo
        .createQueryBuilder("m")
        .where("m.conversation_id = :conversationId", { conversationId: conversation.id })
        .orderBy("m.sequence_number", "ASC")
        .take(limit + 1);

      if (cursor) {
        qb.andWhere("m.sequence_number > :cursor", { cursor });
      }

      const rows = await qb.getMany();
      const hasMore = rows.length > limit;
      const messages = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore
        ? messages[messages.length - 1].sequenceNumber
        : null;

      return { messages, nextCursor, conversationId: conversation.id };
    }
    catch (err) {
      console.error('Error fetching session messages:', err);
      throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        "Conversation not found",
      );
    }
  }

  async incrementStats(
    conversationId: string,
    tokensUsed: number,
  ): Promise<void> {
    await this.conversationsRepo.increment(
      { id: conversationId },
      "messageCount",
      1,
    );
    await this.conversationsRepo.increment(
      { id: conversationId },
      "totalTokens",
      tokensUsed,
    );
    await this.conversationsRepo.update(conversationId, {
      lastMessageAt: new Date(),
    });
  }

  async end(conversationId: string): Promise<void> {
    await this.conversationsRepo.update(conversationId, {
      status: ConversationStatus.ENDED,
    });
  }
}
