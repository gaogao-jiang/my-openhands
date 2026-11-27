import { useRef, useState } from "react";
import {
  AlertTriangle,
  Cpu,
  CircleCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileActionsMenu } from "./profile-actions-menu";
import { ProfileInfo } from "#/api/profiles-service/profiles-service.api";
import { I18nKey } from "#/i18n/declaration";
import { EllipsisButton } from "#/components/features/conversation-panel/ellipsis-button";
import { BrandButton } from "#/components/features/settings/brand-button";
import { ModelCatalogWarning } from "#/components/shared/model-catalog-warning";
import { cn } from "#/utils/utils";
import { useFreeModels } from "#/hooks/query/use-free-models";
import { formatModelNameForDisplay } from "#/utils/format-model-name";
import { settingsListIconActionButtonClassName } from "#/utils/settings-list-classes";

interface ProfileRowProps {
  profile: ProfileInfo;
  isActive: boolean;
  /** When false, the row is read-only and the actions menu is hidden. */
  canManage: boolean;
  onActivate: (name: string) => void;
  onEdit: (profile: ProfileInfo) => void;
  onRename: (profile: ProfileInfo) => void;
  onDuplicate: (profile: ProfileInfo) => void;
  onDelete: (profile: ProfileInfo) => void;
  isActivating: boolean;
  isModelUnlisted?: boolean;
}

export function ProfileRow({
  profile,
  isActive,
  canManage,
  onActivate,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
  isActivating,
  isModelUnlisted = false,
}: ProfileRowProps) {
  const { t } = useTranslation("openhands");
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const freeModels = useFreeModels();
  const displayModel = formatModelNameForDisplay(profile.model, freeModels);

  return (
    <article
      aria-label={profile.name}
      data-testid="profile-row"
      className={cn(
        "flex min-h-20 min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        isActive
          ? "border-primary/40 bg-primary/5"
          : "border-border-subtle bg-overlay",
      )}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface text-muted">
        <Cpu size={16} aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <h3
          className={cn(
            "truncate text-sm font-medium",
            isActive ? "text-primary" : "text-contrast",
          )}
          title={profile.name}
        >
          {profile.name}
        </h3>
        <div className="flex min-w-0 items-center gap-2">
          {displayModel ? (
            <span
              className="min-w-0 truncate text-xs text-muted"
              title={profile.model ?? undefined}
            >
              {displayModel}
            </span>
          ) : null}
          {profile.provider_connection_broken && (
            <span
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-warning"
              title={t(I18nKey.SETTINGS$PROFILE_BROKEN_CONNECTION_TOOLTIP)}
              data-testid="profile-broken-connection-badge"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {t(I18nKey.SETTINGS$PROFILE_BROKEN_CONNECTION)}
            </span>
          )}
          {isModelUnlisted && <ModelCatalogWarning />}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isActive && (
          <span
            className="inline-flex shrink-0 items-center gap-1 text-xs text-primary"
            data-testid="profile-active-badge"
          >
            <CircleCheck size={12} aria-hidden="true" />
            {t(I18nKey.SETTINGS$PROFILE_DEFAULT)}
          </span>
        )}
        {canManage && (
          <>
            {!isActive && (
              <button
                type="button"
                data-testid="profile-card-set-default"
                className="whitespace-nowrap rounded-md px-1.5 py-1.5 text-xs text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isActivating}
                onClick={() => onActivate(profile.name)}
              >
                {t(I18nKey.SETTINGS$PROFILE_SET_DEFAULT)}
              </button>
            )}
            <BrandButton
              testId="profile-card-edit"
              type="button"
              variant="secondary"
              className="flex size-7 min-h-7 items-center justify-center bg-overlay p-0"
              ariaLabel={t(I18nKey.SETTINGS$PROFILE_EDIT)}
              onClick={() => onEdit(profile)}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
            </BrandButton>
            <EllipsisButton
              ref={triggerRef}
              onClick={() => setMenuOpen((open) => !open)}
              ariaLabel={t(I18nKey.SETTINGS$PROFILE_MENU)}
              testId="profile-menu-trigger"
              className={settingsListIconActionButtonClassName}
            />
          </>
        )}
      </div>
      {canManage && menuOpen && (
        <ProfileActionsMenu
          anchorRef={triggerRef}
          onEdit={() => onEdit(profile)}
          onRename={() => onRename(profile)}
          onDuplicate={() => onDuplicate(profile)}
          onSetActive={() => onActivate(profile.name)}
          onDelete={() => onDelete(profile)}
          isActive={isActive}
          isActivating={isActivating}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </article>
  );
}
