import { useCallback, useEffect } from "react";
import { getAgentProfileDisplayName } from "#/utils/agent-profile-display-name";
import { useIsMutating } from "@tanstack/react-query";
import type { AgentProfileSummary } from "#/api/agent-profiles-service/agent-profiles-service.api";
import { getStoredConversationMetadata } from "#/api/conversation-metadata-store";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { useNavigation } from "#/context/navigation-context";
import { useAgentProfiles } from "#/hooks/query/use-agent-profiles";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import {
  CREATE_CONVERSATION_MUTATION_KEY,
  useCreateConversation,
  type CreateConversationVariables,
} from "#/hooks/mutation/use-create-conversation";
import {
  agentProfileSelectionKey,
  useAgentProfileSelectionStore,
} from "#/stores/agent-profile-selection-store";

export interface ChatInputProfileState {
  profiles: AgentProfileSummary[];
  currentProfileId: string | null;
  currentProfileName: string | null;
  isInConversation: boolean;
  isLoading: boolean;
  isSwitching: boolean;
  selectProfile: (profile: AgentProfileSummary) => void;
}

export function useChatInputProfileState(): ChatInputProfileState {
  const { backend, orgId } = useActiveBackend();
  const { conversationId, navigate } = useNavigation();
  const { data: conversation, isLoading: isLoadingConversation } =
    useActiveConversation();
  const { data: agentProfiles, isLoading: isLoadingProfiles } =
    useAgentProfiles();
  const createConversation = useCreateConversation();
  const setDraftProfile = useAgentProfileSelectionStore(
    (state) => state.setSelection,
  );
  const selectedDraftProfileId = useAgentProfileSelectionStore(
    (state) =>
      state.selections[agentProfileSelectionKey(backend.id, orgId)] ?? null,
  );
  const profileScope = agentProfileSelectionKey(backend.id, orgId);
  const creatingConversations = useIsMutating({
    mutationKey: CREATE_CONVERSATION_MUTATION_KEY,
  });
  const isTaskRoute = conversationId?.startsWith("task-") ?? false;
  const isSwitching = isTaskRoute || creatingConversations > 0;

  const profiles = agentProfiles?.profiles ?? [];
  const isInConversation = Boolean(conversationId);
  const defaultProfileId = agentProfiles?.active_agent_profile_id ?? null;
  const draftProfileId =
    selectedDraftProfileId &&
    profiles.some((profile) => profile.id === selectedDraftProfileId)
      ? selectedDraftProfileId
      : null;
  useEffect(() => {
    if (
      !isInConversation &&
      selectedDraftProfileId &&
      !profiles.some((profile) => profile.id === selectedDraftProfileId)
    ) {
      useAgentProfileSelectionStore.getState().clearSelection(profileScope);
    }
  }, [isInConversation, profileScope, profiles, selectedDraftProfileId]);
  const currentProfileId = isInConversation
    ? (conversation?.launched_agent_profile?.agent_profile_id ??
      defaultProfileId ??
      null)
    : (draftProfileId ?? defaultProfileId);
  const currentProfile = profiles.find(
    (p) => p.id != null && p.id === currentProfileId,
  );
  const currentProfileName = currentProfile
    ? getAgentProfileDisplayName(currentProfile)
    : null;

  const selectProfile = useCallback(
    (profile: AgentProfileSummary) => {
      if (isTaskRoute || !profile.id || profile.id === currentProfileId) return;
      if (!isInConversation) {
        setDraftProfile(profileScope, profile.id);
        return;
      }

      const metadata = conversationId
        ? getStoredConversationMetadata(conversationId)
        : null;
      const variables: CreateConversationVariables = {
        agentProfileId: profile.id,
        entryPoint: "blank_conversation_profile_picker",
      };
      if (conversation?.selected_repository) {
        variables.repository = {
          name: conversation.selected_repository,
          gitProvider: conversation.git_provider ?? "github",
          branch: conversation.selected_branch ?? undefined,
        };
      }
      if (conversation?.selected_workspace) {
        variables.workingDir = conversation.selected_workspace;
        variables.workspaceMode = metadata?.workspace_mode ?? "local_repo";
      } else if (metadata?.workspace_mode === "docker_container") {
        variables.workspaceMode = "docker_container";
      }
      if (metadata?.plugins?.length) {
        variables.plugins = metadata.plugins;
      }

      // mutateAsync, not mutate-scoped callbacks: this hook lives inside the
      // tools-menu content, which unmounts as soon as a profile is picked, and
      // React Query drops mutate-scoped callbacks on unmount — the replacement
      // conversation would be created without ever navigating to it. The
      // promise (and the navigate closure) survive the unmount. Errors are
      // already surfaced by the global mutation toast; swallow the rejection.
      createConversation
        .mutateAsync(variables)
        .then((data) => navigate(`/conversations/${data.conversation_id}`))
        .catch(() => {});
    },
    [
      conversation,
      conversationId,
      createConversation,
      currentProfileId,
      isInConversation,
      isTaskRoute,
      navigate,
      profileScope,
      setDraftProfile,
    ],
  );

  return {
    profiles,
    currentProfileId,
    currentProfileName,
    isInConversation,
    isLoading:
      isLoadingProfiles ||
      isTaskRoute ||
      (isInConversation && isLoadingConversation),
    isSwitching,
    selectProfile,
  };
}
