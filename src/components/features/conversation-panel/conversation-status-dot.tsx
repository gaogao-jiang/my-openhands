import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaArchive } from "react-icons/fa";
import { LoaderCircle } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { ExecutionStatus } from "#/types/agent-server/core/base/common";
import { SandboxStatus } from "#/api/conversation-service/agent-server-conversation-service.types";
import { StyledTooltip } from "#/components/shared/buttons/styled-tooltip";
import { isMissingSandboxStatus } from "#/utils/conversation-archive-status";
import { useNavigation } from "#/context/navigation-context";
import { useConversationStateStore } from "#/stores/conversation-state-store";
import { useActiveBackend } from "#/contexts/active-backend-context";
import {
  conversationCompletionKey,
  useConversationCompletionStore,
} from "#/stores/conversation-completion-store";
import { cn } from "#/utils/utils";

interface ConversationStatusDotProps {
  conversationId?: string;
  /** The list snapshot's revision, so a stale RUNNING row cannot reset a receipt. */
  updatedAt?: string;
  className?: string;
  executionStatus: ExecutionStatus | null | undefined;
  /**
   * Cloud-only sandbox lifecycle status. When provided, MISSING and ERROR
   * override the execution-status visual so the dot reflects the sandbox
   * state rather than the last agent execution state.
   */
  sandboxStatus?: SandboxStatus | null;
  /**
   * Wrap the dot in a tooltip showing the human-readable status label.
   * Disable this when the dot is already nested inside a larger tooltip
   * (e.g. the collapsed-sidebar conversation preview) so the smaller
   * tooltip doesn't intercept the hover.
   */
  showTooltip?: boolean;
  isStarting?: boolean;
  /**
   * The row's effective archived state (explicit archive or a missing
   * runtime). When true the dot shows the archive presentation even if the
   * sandbox/execution state would otherwise render as working, finished, or
   * errored, so the dot never disagrees with the "Archived" chip. Leave
   * undefined for the runtime-derived archived case, which is inferred from
   * `sandboxStatus`.
   */
  isArchived?: boolean;
}

type Visual =
  | "finished"
  | "working"
  | "active"
  | "paused"
  | "error"
  | "unknown"
  | "starting";

const visualFor = (status: ExecutionStatus | null | undefined): Visual => {
  switch (status) {
    case ExecutionStatus.FINISHED:
      return "finished";
    case ExecutionStatus.RUNNING:
      return "working";
    case ExecutionStatus.IDLE:
    case ExecutionStatus.WAITING_FOR_CONFIRMATION:
      return "active";
    case ExecutionStatus.PAUSED:
      return "paused";
    case ExecutionStatus.ERROR:
    case ExecutionStatus.STUCK:
      return "error";
    default:
      return "unknown";
  }
};

const labelKeyFor = (visual: Visual, isArchived?: boolean): string => {
  if (isArchived) return "COMMON$ARCHIVED";
  switch (visual) {
    case "starting":
      return I18nKey.CONVERSATION$STARTING_CONVERSATION;
    case "finished":
      return "COMMON$FINISHED";
    case "working":
    case "active":
      return "COMMON$WORKING";
    case "paused":
      return "COMMON$PAUSED";
    case "error":
      return "COMMON$ERROR";
    default:
      return "COMMON$STOPPED";
  }
};

function renderIndicator(visual: Visual) {
  switch (visual) {
    case "starting":
      return (
        <LoaderCircle
          aria-hidden="true"
          className="size-2.5 animate-spin text-muted motion-reduce:animate-none"
        />
      );
    case "finished":
      return (
        <span
          data-testid="conversation-status-finished"
          className="size-1.5 rounded-full bg-status-success"
        />
      );
    case "working":
      return (
        <LoaderCircle
          data-testid="conversation-status-working"
          aria-hidden="true"
          className="size-2.5 animate-spin text-muted motion-reduce:animate-none"
        />
      );
    case "active":
      return (
        <span
          data-testid="conversation-status-active"
          className="w-1.5 h-1.5 rounded-full bg-muted"
        />
      );
    case "paused":
      return (
        <span
          data-testid="conversation-status-paused"
          className="w-1.5 h-1.5 rounded-full bg-muted"
        />
      );
    case "error":
      return (
        <span
          data-testid="conversation-status-error"
          className="w-1.5 h-1.5 rounded-full bg-status-error"
        />
      );
    default:
      return (
        <span
          data-testid="conversation-status-unknown"
          className="w-1.5 h-1.5 rounded-full bg-tertiary"
        />
      );
  }
}

export function ConversationStatusDot({
  conversationId,
  updatedAt,
  className,
  executionStatus,
  sandboxStatus,
  showTooltip = true,
  isStarting = false,
  isArchived,
}: ConversationStatusDotProps) {
  const { t } = useTranslation("openhands");
  const { conversationId: activeConversationId } = useNavigation();
  const { backend, orgId } = useActiveBackend();
  const completionKey = conversationId
    ? conversationCompletionKey(backend.id, orgId, conversationId)
    : undefined;
  const isActive = !!conversationId && conversationId === activeConversationId;
  const readVersion = useConversationCompletionStore((state) =>
    completionKey ? state.readCompletions[completionKey] : undefined,
  );
  const wasRead = readVersion !== undefined;
  const setRead = useConversationCompletionStore((state) => state.setRead);
  // Only the open conversation has an up-to-date WebSocket. Background rows
  // must use list polling rather than a last-seen live status from an old visit.
  const liveExecutionStatus = useConversationStateStore((state) =>
    conversationId && conversationId === activeConversationId
      ? state.executionStatusByConversation[conversationId]
      : undefined,
  );

  // An archived row (explicit archive or missing runtime) downloads to a gray
  // archive icon so it matches the "Archived" chip. A missing sandbox is
  // inferred here for callers that only pass `sandboxStatus`; an unarchived
  // `ERROR` row keeps its red "Error" dot.
  const archived = isArchived ?? isMissingSandboxStatus(sandboxStatus);
  // A run completed while its list snapshot still said RUNNING. After viewing
  // that completion, the same snapshot cannot start the spinner or unread dot again.
  const isReadSnapshot = wasRead && !!updatedAt && readVersion === updatedAt;
  const executionVisual = visualFor(
    liveExecutionStatus ??
      (isReadSnapshot && executionStatus === ExecutionStatus.RUNNING
        ? ExecutionStatus.FINISHED
        : executionStatus),
  );
  const effectiveVisual: Visual =
    sandboxStatus === "ERROR" && !archived
      ? "error"
      : archived
        ? "paused"
        : isStarting && executionVisual !== "error"
          ? "starting"
          : executionVisual;

  const visual = effectiveVisual;
  useEffect(() => {
    if (!completionKey) return;
    if (visual === "working") {
      const previousReadVersion =
        useConversationCompletionStore.getState().readCompletions[
          completionKey
        ];
      if (isActive || !updatedAt || previousReadVersion !== updatedAt) {
        setRead(completionKey, false);
      }
    } else if (visual === "finished" && isActive) {
      setRead(completionKey, true, updatedAt);
    }
  }, [completionKey, visual, isActive, updatedAt, setRead]);

  if (visual === "finished" && (isActive || wasRead)) return null;

  const label = t(labelKeyFor(visual, archived));
  const indicator = archived ? (
    <FaArchive
      data-testid="conversation-status-archived"
      size={10}
      className="shrink-0 text-muted opacity-60"
      aria-hidden
    />
  ) : (
    renderIndicator(visual)
  );

  const dot = (
    <div
      className={cn(
        "w-2.5 h-2.5 flex items-center justify-center shrink-0",
        className,
      )}
      role="img"
      aria-label={label}
    >
      {indicator}
    </div>
  );

  if (!showTooltip) return dot;

  return (
    <StyledTooltip
      content={label}
      placement="right"
      showArrow
      tooltipClassName="bg-canvas-base text-contrast text-xs shadow-lg"
    >
      {dot}
    </StyledTooltip>
  );
}
