import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Code,
  FileText,
  ShieldCheck,
  PawPrint,
  Terminal,
  CircleCheck,
  Cpu,
} from "lucide-react";
import { AgentProfileActionsMenu } from "./agent-profile-actions-menu";
import {
  WELL_KNOWN_DEFAULT_AGENT_PROFILE_NAME,
  type AgentProfileSummary,
} from "#/api/agent-profiles-service/agent-profiles-service.api";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { I18nKey } from "#/i18n/declaration";
import { EllipsisButton } from "#/components/features/conversation-panel/ellipsis-button";
import { BrandButton } from "#/components/features/settings/brand-button";
import { cn } from "#/utils/utils";
import {
  getAgentProfileDisplayName,
  getAgentProfileDescriptionKey,
} from "#/utils/agent-profile-display-name";
import { settingsListIconActionButtonClassName } from "#/utils/settings-list-classes";

function AgentProfileIcon({
  descriptionKey,
  kind,
}: {
  descriptionKey: I18nKey | null;
  kind: AgentProfileSummary["agent_kind"];
}) {
  switch (descriptionKey) {
    case I18nKey.CHAT$JORA_DESCRIPTION:
      return <PawPrint size={18} aria-hidden="true" />;
    case I18nKey.CHAT$DEVELOPER_DESCRIPTION:
      return <Code size={18} aria-hidden="true" />;
    case I18nKey.CHAT$DOCUMENTER_DESCRIPTION:
      return <FileText size={18} aria-hidden="true" />;
    case I18nKey.CHAT$REVIEWER_DESCRIPTION:
      return <ShieldCheck size={18} aria-hidden="true" />;
    default:
      return kind === "acp" ? (
        <Terminal size={18} aria-hidden="true" />
      ) : (
        <Bot size={18} aria-hidden="true" />
      );
  }
}

interface AgentProfileRowProps {
  profile: AgentProfileSummary;
  isActive: boolean;
  /** When false, the row is read-only and the actions menu is hidden. */
  canManage: boolean;
  onActivate: (profile: AgentProfileSummary) => void;
  onEdit: (profile: AgentProfileSummary) => void;
  onDelete: (profile: AgentProfileSummary) => void;
  isActivating: boolean;
}

export function AgentProfileRow({
  profile,
  isActive,
  canManage,
  onActivate,
  onEdit,
  onDelete,
  isActivating,
}: AgentProfileRowProps) {
  const { t } = useTranslation("openhands");
  const { backend } = useActiveBackend();
  const displayName = getAgentProfileDisplayName(profile);
  const descriptionKey = getAgentProfileDescriptionKey(profile);
  const description =
    profile.agent_kind === "acp"
      ? t(I18nKey.SETTINGS$AGENT_TYPE_ACP)
      : t(descriptionKey ?? I18nKey.SETTINGS$AGENT_CARD_DESCRIPTION);
  // The server reseeds a deleted `default`, which would reset what it shares
  // with the global pages.
  const isProtected =
    backend.kind === "local" &&
    profile.name === WELL_KNOWN_DEFAULT_AGENT_PROFILE_NAME;
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const llmProfile =
    profile.agent_kind === "openhands" ? profile.llm_profile_ref : null;

  return (
    <article
      aria-label={displayName}
      data-testid="agent-profile-row"
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:gap-4",
        isActive
          ? "border-primary/40 bg-primary/5"
          : "border-border-subtle bg-overlay",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          isActive ? "bg-primary/10 text-primary" : "bg-surface text-muted",
        )}
      >
        <AgentProfileIcon
          descriptionKey={descriptionKey}
          kind={profile.agent_kind}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3
            className="min-w-0 truncate text-sm font-semibold text-contrast"
            title={displayName}
          >
            {displayName}
          </h3>
          {isActive && (
            <span
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary"
              data-testid="agent-profile-active-badge"
            >
              <CircleCheck size={13} aria-hidden="true" />
              {t(I18nKey.SETTINGS$AGENT_CARD_CURRENT)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-medium text-muted">{description}</p>
        {llmProfile ? (
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-tertiary-alt">
            <Cpu size={12} className="shrink-0" aria-hidden="true" />
            <span className="sr-only">
              {t(I18nKey.SETTINGS$AGENT_CARD_MODEL)}
            </span>
            <span className="truncate" title={llmProfile}>
              {llmProfile}
            </span>
          </div>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:ml-auto sm:max-w-56">
          {!isActive ? (
            <button
              data-testid="agent-profile-card-activate"
              type="button"
              className="rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isActivating || !profile.id}
              onClick={() => onActivate(profile)}
            >
              {t(I18nKey.SETTINGS$AGENT_CARD_USE)}
            </button>
          ) : (
            <span className="rounded-md bg-success/10 px-2 py-1.5 text-xs font-medium text-success">
              {t(I18nKey.SETTINGS$AGENT_CARD_CURRENT)}
            </span>
          )}
          <BrandButton
            testId="agent-profile-card-edit"
            type="button"
            variant="secondary"
            className="h-8 min-h-8 bg-overlay px-2.5 text-xs"
            onClick={() => onEdit(profile)}
          >
            {t(I18nKey.SETTINGS$AGENT_CARD_EDIT)}
          </BrandButton>
          <div className="relative">
            <EllipsisButton
              ref={triggerRef}
              onClick={() => setMenuOpen((open) => !open)}
              ariaLabel={t(I18nKey.SETTINGS$PROFILE_MENU)}
              testId="agent-profile-menu-trigger"
              className={settingsListIconActionButtonClassName}
            />
            {menuOpen && (
              <AgentProfileActionsMenu
                anchorRef={triggerRef}
                onEdit={() => onEdit(profile)}
                onSetActive={() => onActivate(profile)}
                onDelete={() => onDelete(profile)}
                deleteDisabledReason={
                  isProtected
                    ? t(I18nKey.SETTINGS$AGENT_PROFILE_DEFAULT_LOCKED)
                    : undefined
                }
                isActive={isActive}
                isActivating={isActivating}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}
