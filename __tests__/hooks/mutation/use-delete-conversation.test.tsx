import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import AgentServerConversationService from "#/api/conversation-service/agent-server-conversation-service.api";
import { useDeleteConversation } from "#/hooks/mutation/use-delete-conversation";
import {
  conversationCompletionKey,
  useConversationCompletionStore,
} from "#/stores/conversation-completion-store";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "#/api/backend-registry/active-store";
import {
  sessionActivityKey,
  useSessionActivityStore,
} from "#/stores/session-activity-store";

describe("useDeleteConversation", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    __resetActiveStoreForTests();
    useSessionActivityStore.setState({ entries: {} });
    useConversationCompletionStore.setState({ readCompletions: {} });
  });

  it("keeps the caller's captured delete scope across an asynchronous onMutate", async () => {
    const deleteSpy = vi
      .spyOn(AgentServerConversationService, "deleteConversation")
      .mockResolvedValue(undefined);
    const original = {
      id: "original",
      kind: "local" as const,
      name: "Original",
      host: "http://original.test",
      apiKey: "",
    };
    const next = { ...original, id: "next", host: "http://next.test" };
    setRegisteredBackends([original, next]);
    setActiveSelection({ backendId: original.id });
    const scope =
      AgentServerConversationService.createConversationDeletionScope();
    const originalActivity = sessionActivityKey(original.id, null, "captured");
    const nextActivity = sessionActivityKey(next.id, null, "captured");
    const originalReadKey = conversationCompletionKey(
      original.id,
      null,
      "captured",
    );
    const nextReadKey = conversationCompletionKey(next.id, null, "captured");
    useConversationCompletionStore.getState().setRead(originalReadKey, true);
    useConversationCompletionStore.getState().setRead(nextReadKey, true);
    useSessionActivityStore.getState().begin(originalActivity, "initialize");
    useSessionActivityStore.getState().begin(nextActivity, "initialize");
    let release!: () => void;
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, "cancelQueries").mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
    const deletion = result.current.mutateAsync({
      conversationId: "captured",
      deletionScope: scope,
    });
    await waitFor(() => expect(release).toBeDefined());
    expect(deleteSpy).not.toHaveBeenCalled();
    setActiveSelection({ backendId: next.id });
    release();
    await deletion;
    expect(deleteSpy).toHaveBeenCalledWith("captured", scope);
    expect(
      useConversationCompletionStore.getState().readCompletions[
        originalReadKey
      ],
    ).toBeUndefined();
    expect(
      useConversationCompletionStore.getState().readCompletions[nextReadKey],
    ).toBeNull();
    expect(
      useSessionActivityStore.getState().entries[originalActivity],
    ).toBeUndefined();
    expect(
      useSessionActivityStore.getState().entries[nextActivity],
    ).toHaveLength(1);
  });

  it("invalidates the conversation list and start-tasks queries on settle", async () => {
    vi.spyOn(
      AgentServerConversationService,
      "deleteConversation",
    ).mockResolvedValue(undefined);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await result.current.mutateAsync({ conversationId: "conv-1" });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "conversations"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["start-tasks"],
      });
    });
  });

  it("still invalidates both queries when the delete request fails", async () => {
    const scope =
      AgentServerConversationService.createConversationDeletionScope();
    const readKey = conversationCompletionKey(
      scope.backend.id,
      scope.orgId,
      "conv-1",
    );
    useConversationCompletionStore.getState().setRead(readKey, true);
    vi.spyOn(
      AgentServerConversationService,
      "deleteConversation",
    ).mockRejectedValue(new Error("boom"));

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await expect(
      result.current.mutateAsync({
        conversationId: "conv-1",
        deletionScope: scope,
      }),
    ).rejects.toThrow("boom");
    expect(
      useConversationCompletionStore.getState().readCompletions[readKey],
    ).toBeNull();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "conversations"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["start-tasks"],
      });
    });
  });
});
