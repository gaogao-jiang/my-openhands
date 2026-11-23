import { beforeEach, describe, expect, it } from "vitest";
import {
  CONVERSATION_COMPLETION_STORAGE_KEY,
  conversationCompletionKey,
  useConversationCompletionStore,
} from "#/stores/conversation-completion-store";

describe("conversation completion read receipts", () => {
  beforeEach(() => {
    useConversationCompletionStore.setState({ readCompletions: {} });
    localStorage.clear();
  });

  it("keeps backend, organization and conversation receipts independent", () => {
    const keys = [
      conversationCompletionKey("local", null, "one"),
      conversationCompletionKey("cloud", "team-a", "one"),
      conversationCompletionKey("cloud", "team-b", "one"),
      conversationCompletionKey("cloud", "team-a", "two"),
    ];
    for (const key of keys)
      useConversationCompletionStore.getState().setRead(key, true);
    useConversationCompletionStore.getState().setRead(keys[1], false);

    expect(
      Object.keys(useConversationCompletionStore.getState().readCompletions),
    ).toEqual([keys[0], keys[2], keys[3]]);
  });

  it("restores read receipts after hydration so old completions stay dismissed", async () => {
    const key = conversationCompletionKey("local", null, "one");
    const updatedAt = "2026-11-23T08:00:00Z";
    useConversationCompletionStore.getState().setRead(key, true, updatedAt);
    const saved = localStorage.getItem(CONVERSATION_COMPLETION_STORAGE_KEY)!;
    useConversationCompletionStore.setState({ readCompletions: {} });
    localStorage.setItem(CONVERSATION_COMPLETION_STORAGE_KEY, saved);

    await useConversationCompletionStore.persist.rehydrate();

    expect(useConversationCompletionStore.getState().readCompletions[key]).toBe(
      updatedAt,
    );
  });
});
