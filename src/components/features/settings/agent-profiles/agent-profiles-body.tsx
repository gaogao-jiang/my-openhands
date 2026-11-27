import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { AgentProfileRow } from "./agent-profile-row";
import { type AgentProfileSummary } from "#/api/agent-profiles-service/agent-profiles-service.api";
import { I18nKey } from "#/i18n/declaration";
import { extensionModuleEmptyStateClassName } from "#/utils/extension-module-card-classes";

interface AgentProfilesBodyProps {
  isLoading: boolean;
  loadError: Error | null;
  profiles: AgentProfileSummary[];
  activeId: string | null;
  /** When false, rows are read-only and the actions menu is hidden. */
  canManage: boolean;
  onActivate: (profile: AgentProfileSummary) => void;
  onEdit: (profile: AgentProfileSummary) => void;
  onDelete: (profile: AgentProfileSummary) => void;
  isActivating: boolean;
  showSyncStatus?: boolean;
}

export function AgentProfilesBody({
  isLoading,
  loadError,
  profiles,
  activeId,
  canManage,
  onActivate,
  onEdit,
  onDelete,
  isActivating,
  showSyncStatus = false,
}: AgentProfilesBodyProps) {
  const { t } = useTranslation("openhands");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const scrollContent = scrollContentRef.current;
    if (!scrollContainer || !scrollContent) return;

    const updateScrollHint = () => {
      const hasOverflow =
        scrollContainer.scrollHeight > scrollContainer.clientHeight + 1;
      const isAtBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
        scrollContainer.scrollHeight - 1;
      setHasMoreBelow(hasOverflow && !isAtBottom);
    };

    updateScrollHint();
    scrollContainer.addEventListener("scroll", updateScrollHint, {
      passive: true,
    });
    const resizeObserver = new ResizeObserver(updateScrollHint);
    resizeObserver.observe(scrollContainer);
    resizeObserver.observe(scrollContent);

    return () => {
      scrollContainer.removeEventListener("scroll", updateScrollHint);
      resizeObserver.disconnect();
    };
  }, [profiles.length]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        data-testid="agent-profiles-load-error"
        className={extensionModuleEmptyStateClassName}
      >
        <p className="text-sm text-feedback-error">
          {t(I18nKey.SETTINGS$PROFILES_LOAD_ERROR)}
        </p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div
        data-testid="agent-profiles-empty"
        className={extensionModuleEmptyStateClassName}
      >
        <p className="text-sm text-muted">
          {t(I18nKey.SETTINGS$PROFILES_EMPTY)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          data-testid="agent-profiles-scroll-container"
          className="agent-profile-list-scroll scrollbar-hide overflow-y-auto"
        >
          <div ref={scrollContentRef} className="flex flex-col gap-3 pr-1">
            {profiles.map((profile) => (
              <AgentProfileRow
                key={profile.name}
                profile={profile}
                isActive={!!profile.id && profile.id === activeId}
                canManage={canManage}
                onActivate={onActivate}
                onEdit={onEdit}
                onDelete={onDelete}
                isActivating={isActivating}
              />
            ))}
          </div>
        </div>
        <div
          aria-hidden="true"
          data-testid="agent-profiles-scroll-fade"
          className={`agent-profile-list-fade pointer-events-none absolute inset-x-0 bottom-0 h-12 transition-opacity duration-200 ${hasMoreBelow ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      {showSyncStatus ? (
        <div
          data-testid="agent-profiles-sync-status"
          className="flex items-center gap-2 px-1 text-xs text-muted"
        >
          <span className="flex size-4 items-center justify-center rounded-full bg-success/10 text-success">
            <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
              <path
                d="m3.5 8 3 3 6-6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
              />
            </svg>
          </span>
          {t(I18nKey.SETTINGS$AGENT_PAGE_SYNCED)}
        </div>
      ) : null}
    </div>
  );
}
