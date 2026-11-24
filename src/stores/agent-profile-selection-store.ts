import { create } from "zustand";

export function agentProfileSelectionKey(
  backendId: string,
  orgId: string | null | undefined,
): string {
  return JSON.stringify([backendId, orgId ?? null]);
}

interface AgentProfileSelectionState {
  selections: Record<string, string>;
  setSelection: (scope: string, profileId: string) => void;
  clearSelection: (scope: string) => void;
}

export const useAgentProfileSelectionStore = create<AgentProfileSelectionState>(
  (set) => ({
    selections: {},
    setSelection: (scope, profileId) =>
      set((state) => ({
        selections: { ...state.selections, [scope]: profileId },
      })),
    clearSelection: (scope) =>
      set((state) => {
        if (!(scope in state.selections)) return state;
        const selections = { ...state.selections };
        delete selections[scope];
        return { selections };
      }),
  }),
);
