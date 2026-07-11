import type { MessagesRepository } from "../../db/messages.repository";
import type { ConversationsRepository } from "../../db/conversations.repository";
import type { ActiveGroupDto, ConversationHistoryEntryDto, MessageDto } from "./model";

export abstract class MessagesService {
  // MessageRow (o tipo de select inferido pelo Drizzle) já bate com o formato de MessageDto
  // campo a campo (ambos em camelCase), então não é preciso nenhum mapeamento manual abaixo.

  static getActiveConversation(
    messagesRepository: MessagesRepository,
    conversationsRepository: ConversationsRepository,
    userId: number,
    withUserId: number
  ): MessageDto[] {
    const conversation = conversationsRepository.findActive1to1(userId, withUserId);
    if (!conversation) return [];
    return messagesRepository.findByConversationIdForUser(conversation.id, userId);
  }

  static getActiveGroups(conversationsRepository: ConversationsRepository, userId: number): ActiveGroupDto[] {
    return conversationsRepository.findActiveGroupsForUser(userId);
  }

  static getGroupMessages(
    messagesRepository: MessagesRepository,
    conversationsRepository: ConversationsRepository,
    userId: number,
    conversationId: number
  ): MessageDto[] | null {
    if (!conversationsRepository.isAcceptedParticipant(conversationId, userId)) return null;
    return messagesRepository.findByConversationIdForUser(conversationId, userId);
  }

  static getHistory(
    conversationsRepository: ConversationsRepository,
    userId: number
  ): ConversationHistoryEntryDto[] {
    return conversationsRepository.findHistoryForUser(userId);
  }

  static getConversationMessages(
    messagesRepository: MessagesRepository,
    conversationsRepository: ConversationsRepository,
    userId: number,
    conversationId: number
  ): MessageDto[] | null {
    const conversation = conversationsRepository.findById(conversationId);
    if (!conversation) return null;
    const participants = conversationsRepository.findParticipants(conversationId);
    if (!participants.some((p) => p.userId === userId)) return null;
    return messagesRepository.findByConversationIdForUser(conversationId, userId);
  }

  // Usado pela tela de histórico para rotular cada mensagem com seu remetente: uma conversa
  // histórica (encerrada) não está mais na lista de grupos ativos do cliente, então ele não
  // consegue mapear fromUserId -> username sozinho.
  static getConversationParticipants(
    conversationsRepository: ConversationsRepository,
    userId: number,
    conversationId: number
  ): { isGroup: boolean; participants: { id: number; username: string }[] } | null {
    const conversation = conversationsRepository.findById(conversationId);
    if (!conversation) return null;
    const participants = conversationsRepository.findParticipants(conversationId);
    if (!participants.some((p) => p.userId === userId)) return null;
    return {
      isGroup: conversation.isGroup,
      participants: participants.map((p) => ({ id: p.userId, username: p.username })),
    };
  }
}
