import { useActiveBackend } from "#/contexts/active-backend-context";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";

export function useMessageFeedbackKey(eventId: string): string | undefined {
  const { backend, orgId } = useActiveBackend();
  const { conversationId } = useOptionalConversationId();
  return conversationId
    ? JSON.stringify([backend.id, orgId, conversationId, eventId])
    : undefined;
}
