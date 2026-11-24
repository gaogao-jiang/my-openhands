import { useMutation, useQueryClient } from "@tanstack/react-query";
import AgentServerConversationService from "#/api/conversation-service/agent-server-conversation-service.api";
import { useEventStore } from "#/stores/use-event-store";
import { getConversationHistoryScope } from "#/hooks/query/conversation-history-query-options";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import i18n from "#/i18n";
import { I18nKey } from "#/i18n/declaration";

export const editUserMessageMutationKey = (conversationId: string) => [
  "edit-user-message",
  conversationId,
];

export function useEditUserMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: editUserMessageMutationKey(conversationId),
    mutationFn: ({ eventId, text }: { eventId: string; text: string }) => {
      if (!conversationId) throw new Error("No conversation is open.");
      return AgentServerConversationService.editUserMessage(
        conversationId,
        eventId,
        text,
      );
    },
    onSuccess: async (started) => {
      // Never clear a different conversation after the user navigated away.
      const state = useEventStore.getState();
      if (
        state.loadedConversationId === conversationId &&
        state.loadedConversationScope === getConversationHistoryScope()
      ) {
        state.clearEventsForConversation(
          conversationId,
          state.loadedConversationScope,
        );
      }
      await queryClient.resetQueries({
        queryKey: ["conversation-history", conversationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user", "conversations"],
      });
      if (!started)
        displayErrorToast(i18n.t(I18nKey.CHAT_INTERFACE$EDIT_SAVED_RUN_FAILED));
    },
    onError: (error) => displayErrorToast(error.message),
  });
}
