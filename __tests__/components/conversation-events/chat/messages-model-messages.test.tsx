import React from "react";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPlanningObservationEvent,
  createUserMessageEvent,
  renderWithProviders,
} from "test-utils";
import { Messages } from "#/components/conversation-events/chat/messages";
import { useModelStore } from "#/stores/model-store";
import type { ProfileInfo } from "#/api/profiles-service/profiles-service.api";
import {
  ActionEvent,
  OpenHandsEvent,
  SecurityRisk,
} from "#/types/agent-server/core";
import { ExecuteBashAction } from "#/types/agent-server/core/base/action";
import { StreamingDeltaEvent } from "#/types/agent-server/core/events/streaming-delta-event";
import { ExecutionStatus } from "#/types/agent-server/core/base/common";
import { useConversationStateStore } from "#/stores/conversation-state-store";
import { useConversationStore } from "#/stores/conversation-store";

const CONVERSATION_ID = "test-conversation-id";

const profiles: ProfileInfo[] = [
  {
    name: "haiku",
    model: "anthropic/claude-haiku-4-5",
    base_url: "https://llm.example.test",
    api_key_set: true,
  },
];

// PlanPreview needs the chat's ScrollProvider, which this isolated mount does
// not supply; the regression below only cares whether the row survives.
vi.mock("#/components/features/chat/plan-preview", () => ({
  PlanPreview: () => <div data-testid="plan-preview" />,
}));

// Renders the list against a real scroll container so a long conversation
// crosses the virtualization threshold, like the chat column does.
function Harness({ events }: { events: OpenHandsEvent[] }) {
  const [scrollElement, setScrollElement] =
    React.useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setScrollElement}
      data-testid="scroll-parent"
      style={{ height: 600, overflowY: "auto" }}
    >
      <Messages
        messages={events}
        allEvents={events}
        scrollParent={scrollElement}
      />
    </div>
  );
}

const makeBashAction = (id: string): ActionEvent<ExecuteBashAction> => ({
  id,
  timestamp: new Date().toISOString(),
  source: "agent",
  thought: [],
  thinking_blocks: [],
  action: {
    kind: "ExecuteBashAction",
    command: `echo ${id}`,
    is_input: false,
    timeout: null,
    reset: false,
  },
  tool_name: "execute_bash",
  tool_call_id: `call_${id}`,
  tool_call: {
    id: `call_${id}`,
    type: "function",
    function: {
      name: "execute_bash",
      arguments: JSON.stringify({ command: `echo ${id}` }),
    },
  },
  llm_response_id: `response_${id}`,
  security_risk: SecurityRisk.UNKNOWN,
});

const makeStreamingDelta = (content: string): StreamingDeltaEvent => ({
  id: "item-1",
  timestamp: "2026-06-12T12:00:00Z",
  source: "agent",
  kind: "StreamingDeltaEvent",
  content,
  reasoning_content: null,
});

describe("Messages model entries", () => {
  beforeEach(() => {
    useConversationStateStore.setState({ executionStatusByConversation: {} });
    useConversationStore.setState({ localPlanningConversationId: null });
    useModelStore.setState({ entriesByConversation: {} });
    // jsdom has no layout; give the scroll container a measurable viewport so
    // the virtualizer can compute a range.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    useConversationStore.setState({ localPlanningConversationId: null });
    vi.restoreAllMocks();
  });

  it("omits actions for progress attached to a tool", () => {
    const tool = {
      ...makeBashAction("check-fonts"),
      thought: [{ type: "text" as const, text: "Checking presentation fonts" }],
    };
    renderWithProviders(<Messages messages={[tool]} allEvents={[tool]} />);
    fireEvent.mouseEnter(screen.getByTestId("agent-message"));
    expect(
      screen.queryByTestId("assistant-message-actions"),
    ).not.toBeInTheDocument();
  });

  it("hides a running planner's actions until the planner finishes", () => {
    const event = createUserMessageEvent("planner-progress");
    const reply = {
      ...event,
      source: "agent" as const,
      isFromPlanningAgent: true,
      llm_message: { ...event.llm_message, role: "assistant" as const },
    };
    useConversationStore.setState({ localPlanningConversationId: "planner" });
    const store = useConversationStateStore.getState();
    store.setExecutionStatus(CONVERSATION_ID, ExecutionStatus.FINISHED);
    store.setExecutionStatus("planner", ExecutionStatus.RUNNING);
    renderWithProviders(<Messages messages={[reply]} allEvents={[reply]} />);
    expect(
      screen.queryByTestId("assistant-message-actions"),
    ).not.toBeInTheDocument();

    act(() => store.setExecutionStatus("planner", ExecutionStatus.FINISHED));
    const toolbar = screen.getByTestId("assistant-message-actions");
    expect(toolbar).not.toHaveClass("opacity-0");
    expect(
      within(toolbar).getByRole("button", { name: "CHAT_INTERFACE$HELPFUL" }),
    ).toBeEnabled();
  });

  it("omits progress footers through tools and streaming, reserving actions for the final result", async () => {
    useConversationStateStore
      .getState()
      .setExecutionStatus(CONVERSATION_ID, ExecutionStatus.RUNNING);
    const reply = (id: string) => {
      const event = createUserMessageEvent(id);
      return {
        ...event,
        source: "agent" as const,
        llm_message: { ...event.llm_message, role: "assistant" as const },
      };
    };
    const earlier = reply("earlier");
    const latest = reply("latest");
    const events = [
      createUserMessageEvent("request"),
      earlier,
      makeBashAction("tool-before-latest"),
      latest,
      makeBashAction("tool-after-reply"),
    ];
    const view = renderWithProviders(
      <Messages messages={events} allEvents={events} />,
    );
    fireEvent.mouseEnter(screen.getAllByTestId("agent-message")[1]);
    expect(
      screen.queryByTestId("assistant-message-actions"),
    ).not.toBeInTheDocument();
    fireEvent.mouseLeave(screen.getAllByTestId("agent-message")[1]);
    const streaming = [...events, makeStreamingDelta("New streamed reply")];
    view.rerender(<Messages messages={streaming} allEvents={streaming} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("agent-message")).toHaveLength(3),
    );
    expect(
      screen.queryByTestId("assistant-message-actions"),
    ).not.toBeInTheDocument();
    const finished: OpenHandsEvent[] = [
      ...events,
      {
        ...makeBashAction("finish"),
        action: { kind: "FinishAction" as const, message: "Final reply" },
      },
    ];
    view.rerender(<Messages messages={finished} allEvents={finished} />);
    const toolbar = screen.getByTestId("assistant-message-actions");
    expect(toolbar).not.toHaveClass("opacity-0");
    expect(
      within(toolbar).getByRole("button", {
        name: "CHAT_INTERFACE$HELPFUL",
      }),
    ).toBeEnabled();
    view.rerender(<Messages messages={events} allEvents={events} />);
    expect(
      screen.queryByTestId("assistant-message-actions"),
    ).not.toBeInTheDocument();
  });

  it("promotes a text-only ACP answer when its turn finishes and preserves it in history", () => {
    const event = createUserMessageEvent("acp-answer");
    const reply = {
      ...event,
      source: "agent" as const,
      llm_message: { ...event.llm_message, role: "assistant" as const },
    };
    const store = useConversationStateStore.getState();
    store.setExecutionStatus(CONVERSATION_ID, ExecutionStatus.RUNNING);
    const view = renderWithProviders(
      <Messages messages={[reply]} allEvents={[reply]} />,
    );
    const toolbar = () => screen.getByTestId("assistant-message-actions");
    expect(
      screen.queryByTestId("assistant-message-actions"),
    ).not.toBeInTheDocument();

    act(() =>
      store.setExecutionStatus(CONVERSATION_ID, ExecutionStatus.FINISHED),
    );
    expect(toolbar()).not.toHaveClass("opacity-0");
    expect(
      within(toolbar()).getByRole("button", { name: "CHAT_INTERFACE$HELPFUL" }),
    ).toBeEnabled();

    const nextTurn = [
      reply,
      createUserMessageEvent("next-request"),
      makeBashAction("next-tool"),
    ];
    act(() =>
      store.setExecutionStatus(CONVERSATION_ID, ExecutionStatus.RUNNING),
    );
    view.rerender(<Messages messages={nextTurn} allEvents={nextTurn} />);
    fireEvent.mouseEnter(screen.getByTestId("agent-message"));
    expect(
      within(toolbar()).getByRole("button", { name: "CHAT_INTERFACE$HELPFUL" }),
    ).toBeEnabled();
  });

  it("renders model entries anchored to non-last events inside grouped runs", () => {
    const first = makeBashAction("action-1");
    const second = makeBashAction("action-2");
    useModelStore.getState().show(CONVERSATION_ID, first.id, []);

    renderWithProviders(
      <Messages messages={[first, second]} allEvents={[first, second]} />,
    );

    expect(screen.getByTestId("model-messages")).toBeInTheDocument();
  });

  it("rerenders as a streaming slot accumulates under the same event id", async () => {
    const firstDelta = makeStreamingDelta("First");
    const mergedDelta = makeStreamingDelta("First second third");

    const { rerender } = renderWithProviders(
      <Messages messages={[firstDelta]} allEvents={[firstDelta]} />,
    );

    expect(screen.getByText("First")).toBeInTheDocument();

    rerender(<Messages messages={[mergedDelta]} allEvents={[mergedDelta]} />);

    // Revealed on a clock (#15493), so the added text lands over a few frames.
    // Streamed words are separate spans, so match the bubble's text.
    await waitFor(() =>
      expect(screen.getByTestId("agent-message")).toHaveTextContent(
        "First second third",
      ),
    );
  });

  it("keeps a model entry anchored to a hidden planning observation", () => {
    // Two plan observations in one phase: only the last renders a preview, so
    // the earlier row is dropped from the virtualized list. Its /model entry is
    // anchored to that earlier row (getLastRenderableEventId accepts observation
    // events), so the row has to stay or the entry disappears in long chats.
    const user = createUserMessageEvent("user-1");
    const firstPlan = createPlanningObservationEvent("plan-obs-1");
    const secondPlan = createPlanningObservationEvent("plan-obs-2");
    // Pad past the 150-row virtualization threshold with plain user messages.
    const padding = Array.from({ length: 160 }, (_, index) =>
      createUserMessageEvent(`padding-${index}`),
    );
    const events: OpenHandsEvent[] = [user, firstPlan, secondPlan, ...padding];
    useModelStore.getState().show(CONVERSATION_ID, firstPlan.id, []);

    renderWithProviders(<Harness events={events} />);

    expect(screen.getByTestId("virtualized-message-list")).toBeInTheDocument();
    // Row 1 (plan-obs-1) is in the initial window and carries the entry even
    // though its own event content renders nothing.
    expect(screen.getByTestId("model-messages")).toBeInTheDocument();
  });

  it("keeps a /model listing expanded after its virtualized row remounts", async () => {
    const user = userEvent.setup();
    // The /model entry anchors to the first row, with enough padding after it
    // to virtualize. Scrolling away unmounts that row entirely.
    const action = makeBashAction("action-1");
    const events: OpenHandsEvent[] = [
      action,
      ...Array.from({ length: 200 }, (_, index) =>
        createUserMessageEvent(`padding-${index}`),
      ),
    ];
    useModelStore.getState().show(CONVERSATION_ID, action.id, profiles);

    renderWithProviders(<Harness events={events} />);

    expect(screen.getByTestId("virtualized-message-list")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "BUTTON$EXPAND" }));
    // The expanded listing shows its profile rows.
    expect(
      screen.getByRole("button", { name: "Toggle details for haiku" }),
    ).toBeInTheDocument();

    // Scroll to the bottom: the listing's row leaves the window.
    const scrollParent = screen.getByTestId("scroll-parent");
    scrollParent.scrollTop = 200 * 608;
    fireEvent.scroll(scrollParent);
    expect(screen.queryByTestId("model-messages")).toBeNull();

    // Scroll back: the remounted row must remember the listing was open.
    scrollParent.scrollTop = 0;
    fireEvent.scroll(scrollParent);
    expect(
      screen.getByRole("button", { name: "Toggle details for haiku" }),
    ).toBeInTheDocument();
  });
});

it("preserves the open startup group through reasoning, tools and completion", async () => {
  const { getActiveBackend } =
    await import("#/api/backend-registry/active-store");
  const { sessionActivityKey, useSessionActivityStore } =
    await import("#/stores/session-activity-store");
  const { fireEvent } = await import("@testing-library/react");
  const { backend, orgId } = getActiveBackend();
  const key = sessionActivityKey(backend.id, orgId, CONVERSATION_ID);
  const store = useSessionActivityStore.getState();
  store.begin(key, "initialize");
  store.observe(key, "READY");
  const first = {
    ...makeStreamingDelta(""),
    reasoning_content: "Check the implementation",
  };
  const { rerender } = renderWithProviders(
    <Messages messages={[first]} allEvents={[first]} />,
  );
  const header = screen.getByTestId("event-group-toggle");
  fireEvent.click(header);
  expect(header).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByTestId("session-activity-details")).toBeVisible();
  const command = makeBashAction("command");
  rerender(
    <Messages messages={[first, command]} allEvents={[first, command]} />,
  );
  expect(screen.getByTestId("event-group-toggle")).toBe(header);
  expect(header).toHaveAttribute("aria-expanded", "true");
  expect(screen.getAllByTestId("collapsible-thinking")).toHaveLength(1);
  expect(screen.queryByTestId("live-thinking")).not.toBeInTheDocument();
  const reply = { ...makeStreamingDelta("Here is the answer"), id: "answer" };
  rerender(
    <Messages
      messages={[first, command, reply]}
      allEvents={[first, command, reply]}
    />,
  );
  expect(screen.getByTestId("event-group-toggle")).toBe(header);
  expect(screen.getByTestId("agent-message")).toHaveTextContent(
    "Here is the answer",
  );
  useSessionActivityStore.setState({ entries: {} });
});
