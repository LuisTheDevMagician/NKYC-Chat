import type { MessagesRepository } from "../../db/messages.repository";
import type { MessageDto } from "./model";

export abstract class MessagesService {
  static getConversation(
    messagesRepository: MessagesRepository,
    userAId: number,
    userBId: number
  ): MessageDto[] {
    // MessageRow (Drizzle's inferred select type) already matches MessageDto's shape
    // field-for-field (both camelCase), so no manual mapping is needed here.
    return messagesRepository.findConversation(userAId, userBId);
  }
}
