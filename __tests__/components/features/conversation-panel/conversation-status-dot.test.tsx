import type { ReactNode } from "react";
import { act, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils";
import { ConversationStatusDot } from "#/components/features/conversation-panel/conversation-status-dot";
import { ExecutionStatus } from "#/types/agent-server/core/base/common";
import { useConversationStateStore } from "#/stores/conversation-state-store";
import { NavigationProvider } from "#/context/navigation-context";
import { useConversationCompletionStore } from "#/stores/conversation-completion-store";

vi.mock("#/components/shared/buttons/styled-tooltip", () => ({
  StyledTooltip: ({
    children,
    content,
  }: {
    children: ReactNode;
    content: string;
  }) => (
    <div data-testid="styled-tooltip" data-content={content}>
      {children}
    </div>
  ),
}));

describe("ConversationStatusDot", () => {
  beforeEach(() => {
    useConversationStateStore.getState().reset();
    useConversationCompletionStore.setState({ readCompletions: {} });
  });

  it("exposes startup activity without adding a tooltip", () => {
    renderWithProviders(
      <ConversationStatusDot
        executionStatus={null}
        isStarting
        showTooltip={false}
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "CONVERSATION$STARTING_CONVERSATION",
    );
    expect(screen.queryByTestId("styled-tooltip")).not.toBeInTheDocument();
  });

  it.each([
    [
      ExecutionStatus.FINISHED,
      "conversation-status-finished",
      "COMMON$FINISHED",
    ],
    [ExecutionStatus.RUNNING, "conversation-status-working", "COMMON$WORKING"],
    [ExecutionStatus.PAUSED, "conversation-status-paused", "COMMON$PAUSED"],
    [ExecutionStatus.IDLE, "conversation-status-active", "COMMON$WORKING"],
    [
      ExecutionStatus.WAITING_FOR_CONFIRMATION,
      "conversation-status-active",
      "COMMON$WORKING",
    ],
    [ExecutionStatus.ERROR, "conversation-status-error", "COMMON$ERROR"],
    [ExecutionStatus.STUCK, "conversation-status-error", "COMMON$ERROR"],
  ])("renders %s as %s", (status, testId, tooltipLabel) => {
    renderWithProviders(<ConversationStatusDot executionStatus={status} />);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(screen.getByTestId("styled-tooltip")).toHaveAttribute(
      "data-content",
      tooltipLabel,
    );
  });

  it("follows the active conversation's live reply through completion and a follow-up", () => {
    renderWithProviders(
      <ConversationStatusDot
        conversationId="test-conversation-id"
        executionStatus={ExecutionStatus.FINISHED}
        showTooltip={false}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    for (const status of [
      ExecutionStatus.RUNNING,
      ExecutionStatus.FINISHED,
      ExecutionStatus.RUNNING,
    ]) {
      act(() => {
        useConversationStateStore
          .getState()
          .setExecutionStatus("test-conversation-id", status);
      });
      if (status === ExecutionStatus.RUNNING) {
        expect(screen.getByRole("img")).toHaveAccessibleName("COMMON$WORKING");
        expect(screen.getByRole("img").querySelector("svg")).not.toBeNull();
      } else {
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
      }
    }
  });

  it("clears a completion when opened and only restores it after another run", () => {
    const indicator = (activeId: string | null, status: ExecutionStatus) => (
      <NavigationProvider
        value={{
          currentPath: "/",
          conversationId: activeId,
          navigate: vi.fn(),
          isNavigating: false,
        }}
      >
        <ConversationStatusDot
          conversationId="unread-task"
          executionStatus={status}
          showTooltip={false}
        />
      </NavigationProvider>
    );
    const view = renderWithProviders(indicator(null, ExecutionStatus.FINISHED));
    expect(screen.getByRole("img")).toHaveAccessibleName("COMMON$FINISHED");

    view.rerender(indicator("unread-task", ExecutionStatus.FINISHED));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    view.rerender(indicator(null, ExecutionStatus.FINISHED));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    view.rerender(indicator("unread-task", ExecutionStatus.RUNNING));
    expect(screen.getByRole("img")).toHaveAccessibleName("COMMON$WORKING");
    view.rerender(indicator(null, ExecutionStatus.FINISHED));
    expect(screen.getByRole("img")).toHaveAccessibleName("COMMON$FINISHED");
  });

  it("uses list status for inactive conversations whose last live status may be stale", () => {
    useConversationStateStore
      .getState()
      .setExecutionStatus("inactive", ExecutionStatus.RUNNING);
    renderWithProviders(
      <ConversationStatusDot
        conversationId="inactive"
        executionStatus={ExecutionStatus.FINISHED}
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("COMMON$FINISHED");
  });

  it("does not re-arm a viewed completion from a stale running list snapshot", () => {
    const indicator = (
      activeId: string | null,
      status: ExecutionStatus,
      updatedAt: string,
    ) => (
      <NavigationProvider
        value={{
          currentPath: "/",
          conversationId: activeId,
          navigate: vi.fn(),
          isNavigating: false,
        }}
      >
        <ConversationStatusDot
          conversationId="test-conversation-id"
          executionStatus={status}
          updatedAt={updatedAt}
          showTooltip={false}
        />
      </NavigationProvider>
    );
    const oldVersion = "2026-11-23T08:00:00Z";
    const newVersion = "2026-11-23T09:00:00Z";
    useConversationStateStore
      .getState()
      .setExecutionStatus("test-conversation-id", ExecutionStatus.FINISHED);
    const view = renderWithProviders(
      indicator("test-conversation-id", ExecutionStatus.RUNNING, oldVersion),
    );
    view.rerender(indicator(null, ExecutionStatus.RUNNING, oldVersion));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    view.rerender(indicator(null, ExecutionStatus.FINISHED, newVersion));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    view.rerender(indicator(null, ExecutionStatus.RUNNING, newVersion));
    expect(screen.getByRole("img")).toHaveAccessibleName("COMMON$WORKING");
    view.rerender(indicator(null, ExecutionStatus.FINISHED, newVersion));
    expect(screen.getByRole("img")).toHaveAccessibleName("COMMON$FINISHED");
  });

  it("renders the unknown state for missing execution status", () => {
    renderWithProviders(<ConversationStatusDot executionStatus={undefined} />);

    expect(
      screen.getByTestId("conversation-status-unknown"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("styled-tooltip")).toHaveAttribute(
      "data-content",
      "COMMON$STOPPED",
    );
  });

  it("renders archive icon when sandbox is MISSING (archived)", () => {
    renderWithProviders(
      <ConversationStatusDot
        executionStatus={ExecutionStatus.PAUSED}
        sandboxStatus="MISSING"
      />,
    );

    expect(
      screen.getByTestId("conversation-status-archived"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("styled-tooltip")).toHaveAttribute(
      "data-content",
      "COMMON$ARCHIVED",
    );
  });

  it("renders the error dot, not the archive icon, when sandbox is ERROR", () => {
    renderWithProviders(
      <ConversationStatusDot
        executionStatus={ExecutionStatus.FINISHED}
        sandboxStatus="ERROR"
        isStarting
      />,
    );

    expect(screen.getByTestId("conversation-status-error")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName("COMMON$ERROR");
    expect(
      screen.queryByTestId("conversation-status-archived"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("styled-tooltip")).toHaveAttribute(
      "data-content",
      "COMMON$ERROR",
    );
  });

  it("renders the archive icon for an explicitly archived row regardless of sandbox status", () => {
    renderWithProviders(
      <ConversationStatusDot
        executionStatus={ExecutionStatus.RUNNING}
        sandboxStatus="RUNNING"
        isArchived
      />,
    );

    expect(
      screen.getByTestId("conversation-status-archived"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("conversation-status-working"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("styled-tooltip")).toHaveAttribute(
      "data-content",
      "COMMON$ARCHIVED",
    );
  });

  it("prefers the archive presentation over the error dot when the row is archived", () => {
    renderWithProviders(
      <ConversationStatusDot
        executionStatus={ExecutionStatus.ERROR}
        sandboxStatus="ERROR"
        isArchived
      />,
    );

    expect(
      screen.getByTestId("conversation-status-archived"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("conversation-status-error"),
    ).not.toBeInTheDocument();
  });
});
