import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const CONVERSATION_COMPLETION_STORAGE_KEY =
  "conversation-completion-read";
const MAX_READ_COMPLETIONS = 2000;

export const conversationCompletionKey = (
  backendId: string,
  orgId: string | null | undefined,
  conversationId: string,
) => JSON.stringify([backendId, orgId ?? null, conversationId]);

interface ConversationCompletionState {
  readCompletions: Record<string, string | null>;
  setRead: (key: string, read: boolean, updatedAt?: string) => void;
}

/** Local read receipts, cleared for a new run or a deleted conversation. */
export const useConversationCompletionStore =
  create<ConversationCompletionState>()(
    persist(
      (set) => ({
        readCompletions: {},
        setRead: (key, read, updatedAt) =>
          set((state) => {
            if (
              read
                ? state.readCompletions[key] === (updatedAt ?? null)
                : !(key in state.readCompletions)
            )
              return state;
            const readCompletions = { ...state.readCompletions };
            if (read) readCompletions[key] = updatedAt ?? null;
            else delete readCompletions[key];
            for (const oldest of Object.keys(readCompletions).slice(
              0,
              -MAX_READ_COMPLETIONS,
            )) {
              delete readCompletions[oldest];
            }
            return { readCompletions };
          }),
      }),
      {
        name: CONVERSATION_COMPLETION_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: ({ readCompletions }) => ({ readCompletions }),
      },
    ),
  );
