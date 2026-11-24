import { useQuery, useQueryClient } from "@tanstack/react-query";
import AgentProfilesService from "#/api/agent-profiles-service/agent-profiles-service.api";
import { initializeJoraAgentPresets } from "#/api/agent-profiles-service/jora-agent-presets";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { useLlmProfiles } from "./use-llm-profiles";
import {
  CONFIG_CACHE_OPTIONS,
  AGENT_PROFILES_QUERY_KEYS,
  AGENT_PROFILES_RETRY_OPTIONS,
} from "./query-keys";

export { AGENT_PROFILES_QUERY_KEYS };

interface UseAgentProfilesOptions {
  enabled?: boolean;
}

/**
 * List the user's AgentProfiles (Settings → Agent profiles library). On first
 * GET of an empty store the backend lazily seeds one default profile mirroring
 * the user's prior config (#3719), so the list is never empty for an upgrading
 * user. Works on both local and cloud backends — `AgentProfilesService` routes
 * cloud calls through the cloud proxy (OpenHands #15060).
 */
export function useAgentProfiles(options: UseAgentProfilesOptions = {}) {
  const { backend, orgId } = useActiveBackend();
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const { data: llms } = useLlmProfiles({
    enabled: enabled && backend.kind === "local",
  });
  const llm =
    llms?.profiles.find((profile) => profile.name === llms.active_profile) ??
    llms?.profiles[0];

  const profiles = useQuery({
    // Backend identity isolates the cache across backend/org switches.
    queryKey: [...AGENT_PROFILES_QUERY_KEYS.all, backend.id, orgId],
    queryFn: AgentProfilesService.listProfiles,
    ...CONFIG_CACHE_OPTIONS,
    ...AGENT_PROFILES_RETRY_OPTIONS,
    enabled,
    meta: { disableToast: true },
  });

  // Provision independently: existing agents stay available during initialization or failure.
  // id/revision identify the captured connection; the backend object contains credentials.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  useQuery({
    queryKey: AGENT_PROFILES_QUERY_KEYS.presets(
      backend.id,
      backend.connectionRevision,
      llm?.name,
      llm?.model,
      orgId,
    ),
    queryFn: async () => {
      const initialized = await initializeJoraAgentPresets(backend);
      if (initialized) {
        await queryClient.invalidateQueries({
          queryKey: [...AGENT_PROFILES_QUERY_KEYS.all, backend.id, orgId],
          exact: true,
        });
      }
      return initialized;
    },
    enabled:
      enabled &&
      backend.kind === "local" &&
      profiles.isSuccess &&
      Boolean(llm?.model?.trim()),
    staleTime: Infinity,
    retry: false,
    meta: { disableToast: true },
  });
  return profiles;
}
