import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BrandButton } from "#/components/features/settings/brand-button";
import { AgentProfilesBody } from "./agent-profiles-body";
import { DeleteAgentProfileModal } from "./delete-agent-profile-modal";
import { type AgentProfileSummary } from "#/api/agent-profiles-service/agent-profiles-service.api";
import { useAgentProfiles } from "#/hooks/query/use-agent-profiles";
import { useActivateAgentProfile } from "#/hooks/mutation/use-activate-agent-profile";
import { useCanManageOrgProfiles } from "#/hooks/use-can-manage-org-profiles";
import { displaySuccessToast } from "#/utils/custom-toast-handlers";
import { I18nKey } from "#/i18n/declaration";
import { getAgentProfileDisplayName } from "#/utils/agent-profile-display-name";
import { Plus } from "lucide-react";
import { useActiveBackend } from "#/contexts/active-backend-context";

interface AgentProfilesManagerProps {
  onAddProfile?: () => void;
  onEditProfile?: (profile: AgentProfileSummary) => void;
}

export function AgentProfilesManager({
  onAddProfile,
  onEditProfile,
}: AgentProfilesManagerProps) {
  const { t } = useTranslation("openhands");
  const { data, isLoading, error } = useAgentProfiles();
  const { backend } = useActiveBackend();
  const activateProfile = useActivateAgentProfile();
  // Cloud members are view-only; only owners/admins (and all local users) may
  // add, edit, delete, or activate agent profiles (org-scoped, same permission
  // as LLM profiles). Mirrors LlmProfilesManager.
  const canManage = useCanManageOrgProfiles();
  const [profileToDelete, setProfileToDelete] =
    useState<AgentProfileSummary | null>(null);

  const profiles = data?.profiles ?? [];
  const activeId = data?.active_agent_profile_id ?? null;

  const handleActivate = async (profile: AgentProfileSummary) => {
    if (!profile.id) return;
    try {
      await activateProfile.mutateAsync(profile.id);
      displaySuccessToast(
        t(I18nKey.SETTINGS$PROFILE_ACTIVATED, {
          name: getAgentProfileDisplayName(profile),
        }),
      );
    } catch (error) {
      // The global mutation error toast reports the failure; just log here.
      console.error("Failed to activate agent profile:", error);
    }
  };

  return (
    <>
      <div className="flex w-full max-w-168 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-tertiary-alt">
            {t(I18nKey.SETTINGS$AGENT_PAGE_BREADCRUMB)}
          </span>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-contrast">
                {t(I18nKey.SETTINGS$AGENT_PAGE_TITLE)}
              </h2>
              <span className="sr-only">{t(I18nKey.CHAT$MANAGE_AGENTS)}</span>
              <p className="mt-1 text-sm text-muted">
                {t(I18nKey.SETTINGS$AGENT_PAGE_SUBTITLE)}
              </p>
            </div>
            {onAddProfile && canManage ? (
              <BrandButton
                testId="add-agent-profile"
                type="button"
                variant="primary"
                startContent={<Plus size={16} aria-hidden="true" />}
                className="ml-auto"
                onClick={onAddProfile}
              >
                {t(I18nKey.SETTINGS$AGENT_CARD_CREATE)}
              </BrandButton>
            ) : null}
          </div>
        </div>

        <AgentProfilesBody
          isLoading={isLoading}
          loadError={error ?? null}
          profiles={profiles}
          activeId={activeId}
          canManage={canManage}
          onActivate={handleActivate}
          onEdit={(profile) => onEditProfile?.(profile)}
          onDelete={setProfileToDelete}
          isActivating={activateProfile.isPending}
          showSyncStatus={backend.kind === "local"}
        />
      </div>

      <DeleteAgentProfileModal
        profile={profileToDelete}
        onClose={() => setProfileToDelete(null)}
      />
    </>
  );
}
