import React from "react";
import { useConversationLaunchStore } from "#/stores/conversation-launch-store";
import { OH_STATUS_ERROR_COLOR } from "#/constants/status-colors";
import { useTranslation } from "react-i18next";
import { useAgentState } from "#/hooks/use-agent-state";
import { useTaskPolling } from "#/hooks/query/use-task-polling";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useUnifiedPauseConversation } from "#/hooks/mutation/use-unified-stop-conversation";
import { useUnifiedResumeConversation } from "#/hooks/mutation/use-unified-start-conversation";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useCloseOnEscape } from "#/hooks/use-close-on-escape";
import { useUserProviders } from "#/hooks/use-user-providers";
import { getStatusColor, cn } from "#/utils/utils";
import { AgentState } from "#/types/agent-state";
import DebugStackframeDot from "#/icons/debug-stackframe-dot.svg?react";
import { ServerStatusContextMenu } from "../controls/server-status-context-menu";
import { ConversationName } from "./conversation-name";
import { ConversationGitActionsToggle } from "./conversation-git-actions-toggle";
import { ConversationOverviewToggle } from "./conversation-overview-toggle";
import { RightPanelToggle } from "./right-panel-toggle";
import {
  canStopRuntime,
  isExecutionErrored,
  isExecutionPaused,
} from "#/utils/status";
import { I18nKey } from "#/i18n/declaration";
import { useAgentProfiles } from "#/hooks/query/use-agent-profiles";
import { getAgentProfileDisplayName } from "#/utils/agent-profile-display-name";
import { useSubConversations } from "#/hooks/query/use-sub-conversations";

export function ConversationNameWithStatus({
  showRightPanelToggle = true,
}: {
  showRightPanelToggle?: boolean;
}) {
  const { t } = useTranslation("openhands");
  const { conversationId } = useConversationId();
  const launchError = useConversationLaunchStore((state) =>
    conversationId ? state.launches[conversationId]?.error : undefined,
  );
  const { data: conversation } = useActiveConversation();
  const { curAgentState } = useAgentState();
  const { isTask, taskStatus } = useTaskPolling();
  const { mutate: pauseConversation } = useUnifiedPauseConversation();
  const { mutate: resumeConversation } = useUnifiedResumeConversation();
  const { providers } = useUserProviders();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hoveredOpen, setHoveredOpen] = React.useState(false);
  const [profileDetailsOpen, setProfileDetailsOpen] = React.useState(false);
  const profileTriggerRef = React.useRef<HTMLButtonElement>(null);
  const profileDetailsRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const { data: agentProfiles } = useAgentProfiles();
  const { data: subConversations = [] } = useSubConversations(
    conversation?.sub_conversation_ids,
  );

  const executionStatus = conversation?.execution_status ?? null;
  const isStartingStatus =
    !conversation ||
    curAgentState === AgentState.LOADING ||
    curAgentState === AgentState.INIT;
  const isStopStatus = isExecutionErrored(executionStatus);

  const statusColor = launchError
    ? OH_STATUS_ERROR_COLOR
    : getStatusColor({
        isPausing: false,
        isTask,
        taskStatus,
        isStartingStatus,
        isStopStatus,
        curAgentState,
      });

  const isMenuVisible = menuOpen || hoveredOpen;
  const launchedProfile = conversation?.launched_agent_profile;
  const launchedProfileSummary = agentProfiles?.profiles.find(
    (profile) => profile.id === launchedProfile?.agent_profile_id,
  );
  const launchedProfileName = launchedProfileSummary
    ? getAgentProfileDisplayName(launchedProfileSummary)
    : null;

  React.useEffect(() => {
    if (!profileDetailsOpen) return undefined;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !profileDetailsRef.current?.contains(event.target) &&
        !profileTriggerRef.current?.contains(event.target)
      ) {
        setProfileDetailsOpen(false);
      }
    };
    // Capture before controls in the conversation can stop propagation.
    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointerDown,
        true,
      );
    };
  }, [profileDetailsOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    setHoveredOpen(false);
  };

  // A menu opened by click or Enter returns focus to the dot; one opened by
  // hover closes without moving focus.
  useCloseOnEscape(isMenuVisible, closeMenu, menuOpen ? triggerRef : undefined);

  const handleStopServer = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (conversationId) {
      pauseConversation({ conversationId });
    }
    closeMenu();
  };

  const handleStartServer = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (conversationId) {
      resumeConversation({ conversationId, providers });
    }
    closeMenu();
  };

  const handleStatusClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Click toggles for touch; on desktop it also dismisses a hover-opened menu
    // instead of "pinning" it open under the cursor.
    if (isMenuVisible) {
      closeMenu();
      return;
    }
    setMenuOpen(true);
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center min-w-0">
        <div
          className="relative shrink-0"
          onPointerEnter={(event) => {
            // Gate on this event's pointer, not device-primary matchMedia — hybrid
            // laptops can emit compatibility mouseenter for touchscreen taps.
            if (event.pointerType === "mouse") {
              setHoveredOpen(true);
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") {
              setHoveredOpen(false);
            }
          }}
        >
          <button
            ref={triggerRef}
            type="button"
            data-testid="server-status-menu-trigger"
            aria-label={t(I18nKey.COMMON$SERVER_STATUS)}
            aria-expanded={isMenuVisible}
            aria-haspopup="menu"
            onClick={handleStatusClick}
            className={cn(
              "flex items-center justify-center rounded-md",
              "text-muted hover:bg-contrast/10",
            )}
          >
            <DebugStackframeDot
              className="ml-[3.5px] w-6 h-6 cursor-pointer"
              color={statusColor}
              aria-hidden
            />
          </button>
          {isMenuVisible ? (
            <ServerStatusContextMenu
              onClose={closeMenu}
              ignoreOutsideClickRef={triggerRef}
              onStopServer={
                canStopRuntime(executionStatus, conversation?.sandbox_status)
                  ? handleStopServer
                  : undefined
              }
              onStartServer={
                // A running sandbox needs no start; the composer resumes the agent.
                isExecutionPaused(executionStatus) &&
                conversation?.sandbox_status !== "RUNNING"
                  ? handleStartServer
                  : undefined
              }
              executionStatus={executionStatus}
              position="bottom"
              className="bottom-full left-0 mt-0 min-h-fit"
              isPausing={false}
            />
          ) : null}
        </div>
        <div className="relative flex min-w-0 items-center">
          <ConversationName />
          {launchedProfileName ? (
            <>
              <button
                type="button"
                className="ml-1 max-w-32 truncate rounded px-1.5 text-xs text-muted hover:bg-contrast/10 hover:text-foreground"
                aria-label={`${t(I18nKey.CHAT$SELECT_AGENT)}: ${launchedProfileName}`}
                title={launchedProfileName}
                aria-expanded={profileDetailsOpen}
                onClick={() => setProfileDetailsOpen((open) => !open)}
                data-testid="conversation-launched-agent"
                ref={profileTriggerRef}
              >
                {launchedProfileName}
              </button>
              {profileDetailsOpen ? (
                <div
                  role="dialog"
                  ref={profileDetailsRef}
                  aria-label={launchedProfileName}
                  className="absolute left-0 top-7 z-50 min-w-56 rounded-md border border-border bg-surface p-3 text-xs shadow-lg"
                >
                  <div className="font-medium text-foreground">
                    {launchedProfileName}
                  </div>
                  {conversation?.llm_model ? (
                    <div className="mt-1 text-muted">
                      {t(I18nKey.SCHEMA$LLM$MODEL$LABEL)}:{" "}
                      {conversation.llm_model}
                    </div>
                  ) : null}
                  {subConversations.length > 0 ? (
                    <div className="mt-3 border-t border-border pt-2">
                      <div className="font-medium text-foreground">
                        {t(I18nKey.CHAT$DELEGATED_CHILDREN)}
                      </div>
                      <div className="mt-1 flex flex-col gap-1.5">
                        {subConversations.map((child) => {
                          if (!child) return null;
                          const childProfile = agentProfiles?.profiles.find(
                            (profile) =>
                              profile.id ===
                              child.launched_agent_profile?.agent_profile_id,
                          );
                          const childName = childProfile
                            ? getAgentProfileDisplayName(childProfile)
                            : t(I18nKey.CHAT$AGENT_PROFILE_PLACEHOLDER);
                          return (
                            <div
                              key={child.id}
                              className="flex min-w-0 items-center justify-between gap-3"
                            >
                              <span className="min-w-0 truncate">
                                {childName}
                              </span>
                              <span className="shrink-0 text-text-dim">
                                {child.execution_status ??
                                  t(I18nKey.COMMON$STATUS)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <div className="mr-2 flex shrink-0 items-center gap-1">
        <ConversationGitActionsToggle />
        <ConversationOverviewToggle />
        {showRightPanelToggle && <RightPanelToggle />}
      </div>
    </div>
  );
}
