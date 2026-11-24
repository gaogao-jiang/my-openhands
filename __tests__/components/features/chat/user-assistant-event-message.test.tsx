import { fireEvent, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "test-utils";
import type { MessageEvent } from "#/types/agent-server/core";
import { I18nKey } from "#/i18n/declaration";
import { UserAssistantEventMessage } from "#/components/conversation-events/chat/event-message-components/user-assistant-event-message";
import AgentServerConversationService from "#/api/conversation-service/agent-server-conversation-service.api";
import { getConversationState } from "#/utils/conversation-local-storage";
import type { DirectConversationInfo } from "#/api/agent-server-adapter";

// Capture the filters the row passes to `useIsMutating` (while still running the
// real hook), so a test can assert the row never subscribes to a shared key.
const { isMutatingFilters } = vi.hoisted(() => ({
  isMutatingFilters: [] as unknown[],
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useIsMutating: (filters?: unknown) => {
      isMutatingFilters.push(filters);
      return (actual.useIsMutating as (f?: unknown) => number)(filters);
    },
  };
});

const {
  useActiveBackendMock,
  useOptionalConversationIdMock,
  navigateMock,
  navigationState,
} = vi.hoisted(() => ({
  useActiveBackendMock: vi.fn(),
  useOptionalConversationIdMock: vi.fn(),
  navigateMock: vi.fn(),
  // The route the navigation owner supplies. The fork reads only this (and an
  // optional live getter), never `window.location`.
  navigationState: {
    currentPath: "/",
    getCurrentPath: undefined as (() => string) | undefined,
  },
}));

// These provide test context (backend kind, conversation id, navigation); the
// fork behaviour is exercised through the real hook against a mocked service
// (per the repo convention: mock the service, not the hook).
vi.mock("#/hooks/use-conversation-id", () => ({
  useOptionalConversationId: () => useOptionalConversationIdMock(),
}));

vi.mock("#/contexts/active-backend-context", () => ({
  useActiveBackend: () => useActiveBackendMock(),
}));

vi.mock("#/context/navigation-context", async (importActual) => ({
  ...(await importActual<object>()),
  useNavigation: () => ({
    navigate: navigateMock,
    currentPath: navigationState.currentPath,
    getCurrentPath: navigationState.getCurrentPath,
  }),
}));

// test-utils re-inits i18n with empty resources, so `t()` returns the key —
// which becomes the button's accessible name (aria-label).
const BRANCH_LABEL = I18nKey.CHAT_INTERFACE$BRANCH_FROM_HERE;
function getBranchButton() {
  const direct = screen.queryByRole("button", { name: BRANCH_LABEL });
  if (direct) return direct;
  fireEvent.click(
    screen.getByRole("button", { name: I18nKey.COMMON$MORE_OPTIONS }),
  );
  return screen.getByRole("menuitem", { name: BRANCH_LABEL });
}

const CONVERSATION_ID = "conv-1";
const forkResult = { id: "fork-123" } as DirectConversationInfo;

let forkSpy: ReturnType<typeof vi.spyOn>;

const makeEvent = (source: "user" | "agent", id: string): MessageEvent =>
  ({
    id,
    source,
    timestamp: "2024-01-01T00:00:00.000Z",
    llm_message: {
      role: source === "user" ? "user" : "assistant",
      content: [{ type: "text", text: "Hello world" }],
    },
    critic_result: null,
  }) as unknown as MessageEvent;

const renderMessage = (event: MessageEvent) =>
  renderWithProviders(
    <UserAssistantEventMessage
      event={event}
      isLastMessage={false}
      isFinalReply
      isFromPlanningAgent={false}
    />,
  );

describe("UserAssistantEventMessage — branch action", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useActiveBackendMock.mockReset();
    useOptionalConversationIdMock.mockReset();
    navigateMock.mockReset();
    isMutatingFilters.length = 0;
    localStorage.clear();
    // The fork navigates only while the reader is still on the source
    // conversation, which the hook reads from the navigation owner's route.
    navigationState.currentPath = `/conversations/${CONVERSATION_ID}`;
    navigationState.getCurrentPath = undefined;

    useActiveBackendMock.mockReturnValue({
      backend: { kind: "local" },
      orgId: null,
    });
    useOptionalConversationIdMock.mockReturnValue({
      conversationId: CONVERSATION_ID,
    });

    forkSpy = vi
      .spyOn(AgentServerConversationService, "forkConversation")
      // Modern backend (>= 1.31.0): the fork's HEAD (leaf_event_id) is exactly
      // the requested branch point, confirming the message was excluded.
      .mockImplementation((_source, fromEventId) =>
        Promise.resolve({
          ...forkResult,
          leaf_event_id: fromEventId,
        } as unknown as DirectConversationInfo),
      );
  });

  it("branches an assistant message inclusively, without a parent lookup or prefill", async () => {
    renderMessage(makeEvent("agent", "evt-agent"));

    // Actions only appear on hover.
    fireEvent.mouseEnter(screen.getByTestId("agent-message"));
    fireEvent.click(getBranchButton());

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/conversations/fork-123"),
    );
    expect(forkSpy).toHaveBeenCalledWith("conv-1", "evt-agent", undefined);
  });

  it("does not show a branch action on a user message", () => {
    renderMessage(makeEvent("user", "evt-user"));

    fireEvent.mouseEnter(screen.getByTestId("user-message"));
    expect(
      screen.queryByRole("button", { name: BRANCH_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("edits in the original conversation without forking or navigating", async () => {
    const edit = vi
      .spyOn(AgentServerConversationService, "editUserMessage")
      .mockResolvedValue(true);
    renderMessage(makeEvent("user", "evt-user"));
    fireEvent.mouseEnter(screen.getByTestId("user-message"));
    fireEvent.click(screen.getByTestId("edit-user-message"));
    expect(edit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Revised question" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "CHAT_INTERFACE$EDIT_SEND",
      }),
    );
    await waitFor(() =>
      expect(edit).toHaveBeenCalledWith(
        "conv-1",
        "evt-user",
        "Revised question",
      ),
    );
    expect(forkSpy).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(getConversationState("fork-123").draftMessage).toBeNull();
  });

  it("does not offer editing outside a conversation", () => {
    useOptionalConversationIdMock.mockReturnValue({
      conversationId: undefined,
    });
    renderMessage(makeEvent("user", "evt-user"));
    expect(screen.queryByTestId("edit-user-message")).not.toBeInTheDocument();
  });

  it("hides the branch action on the cloud backend", () => {
    useActiveBackendMock.mockReturnValue({
      backend: { kind: "cloud" },
      orgId: null,
    });

    renderMessage(makeEvent("user", "evt-user"));

    fireEvent.mouseEnter(screen.getByTestId("user-message"));
    expect(
      screen.queryByRole("button", { name: BRANCH_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("hides the branch action outside of a conversation", () => {
    useOptionalConversationIdMock.mockReturnValue({
      conversationId: undefined,
    });

    renderMessage(makeEvent("agent", "evt-agent"));

    fireEvent.mouseEnter(screen.getByTestId("agent-message"));
    expect(
      screen.queryByRole("button", { name: BRANCH_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("does not scope the in-flight-fork check to a shared empty conversation key", () => {
    // Outside a conversation the id is empty. Matching `["fork-conversation",
    // ""]` would make every id-less view share one key, so a fork started in
    // one would read as in-flight in another. The row must not subscribe to
    // that key at all.
    useOptionalConversationIdMock.mockReturnValue({
      conversationId: undefined,
    });

    renderMessage(makeEvent("agent", "evt-agent"));

    expect(isMutatingFilters.length).toBeGreaterThan(0);
    for (const filters of isMutatingFilters) {
      expect(filters).not.toHaveProperty("mutationKey");
    }
  });
});
