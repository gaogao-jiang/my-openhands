import type { AgentProfileSummary } from "@openhands/typescript-client";
import { getActiveBackend } from "#/api/backend-registry/active-store";
import { WELL_KNOWN_DEFAULT_AGENT_PROFILE_NAME } from "#/api/agent-profiles-service/agent-profiles-service.api";
import { I18nKey } from "#/i18n/declaration";

export const JORA_AGENT_NAME = "Jora";
export const JORA_EXPERT_NAMES = {
  "Jora-Developer": "Jora Developer",
  "Jora-Reviewer": "Jora Reviewer",
  "Jora-Documenter": "Jora Documenter",
} as const;

export const JORA_AGENT_DESCRIPTION_KEYS = {
  default: I18nKey.CHAT$JORA_DESCRIPTION,
  "Jora-Developer": I18nKey.CHAT$DEVELOPER_DESCRIPTION,
  "Jora-Reviewer": I18nKey.CHAT$REVIEWER_DESCRIPTION,
  "Jora-Documenter": I18nKey.CHAT$DOCUMENTER_DESCRIPTION,
} as const;

/** Presentation only: API requests and stored references keep their original identity. */
export function getAgentProfileDisplayName(
  profile: Pick<AgentProfileSummary, "name" | "agent_kind">,
): string {
  if (
    getActiveBackend().backend.kind !== "local" ||
    profile.agent_kind !== "openhands"
  )
    return profile.name;
  if (profile.name === WELL_KNOWN_DEFAULT_AGENT_PROFILE_NAME)
    return JORA_AGENT_NAME;
  return (
    JORA_EXPERT_NAMES[profile.name as keyof typeof JORA_EXPERT_NAMES] ??
    profile.name
  );
}

export function getAgentProfileDescriptionKey(
  profile: Pick<AgentProfileSummary, "name" | "agent_kind">,
): I18nKey | null {
  if (
    getActiveBackend().backend.kind !== "local" ||
    profile.agent_kind !== "openhands"
  ) {
    return null;
  }
  return (
    JORA_AGENT_DESCRIPTION_KEYS[
      profile.name as keyof typeof JORA_AGENT_DESCRIPTION_KEYS
    ] ?? null
  );
}
