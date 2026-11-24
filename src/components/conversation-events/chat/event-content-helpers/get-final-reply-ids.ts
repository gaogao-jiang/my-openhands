import type { OHEvent } from "#/stores/use-event-store";
import { AgentState } from "#/types/agent-state";
import { ExecutionStatus } from "#/types/agent-server/core/base/common";
import {
  isActionEvent,
  isACPToolCallEvent,
  isConversationStateUpdateEvent,
  isMessageEvent,
  isObservationEvent,
  isStreamingDeltaEvent,
} from "#/types/agent-server/type-guards";
import { shouldRenderEvent } from "./should-render-event";

/** Derive presentation from existing turn boundaries, independently for each agent. */
export function getFinalReplyIds(
  events: OHEvent[],
  agentState: AgentState,
  planningAgentState: AgentState,
): Set<string> {
  const finalIds = new Set<string>();
  const candidates = new Map<boolean, string>();
  const finishCandidate = (planning: boolean) => {
    const id = candidates.get(planning);
    if (id) finalIds.add(id);
    candidates.delete(planning);
  };

  for (const event of events) {
    const planning = !!event.isFromPlanningAgent;
    if (isActionEvent(event) && event.action.kind === "FinishAction") {
      finalIds.add(event.id);
      candidates.delete(planning);
    } else if (isMessageEvent(event) && shouldRenderEvent(event)) {
      if (event.source === "user") finishCandidate(planning);
      else if (event.source === "agent") {
        if (event.llm_message.tool_calls?.length) candidates.delete(planning);
        else candidates.set(planning, event.id);
      }
    } else if (
      isActionEvent(event) ||
      isObservationEvent(event) ||
      isACPToolCallEvent(event) ||
      isStreamingDeltaEvent(event)
    ) {
      // A message followed by more work is progress, even if the run is paused.
      candidates.delete(planning);
    } else if (isConversationStateUpdateEvent(event)) {
      const status =
        event.key === "execution_status"
          ? event.value
          : event.key === "full_state"
            ? event.value.execution_status
            : undefined;
      if (
        status === ExecutionStatus.FINISHED ||
        status === ExecutionStatus.IDLE
      )
        finishCandidate(planning);
      else if (status && status !== ExecutionStatus.RUNNING)
        candidates.delete(planning);
    }
  }

  for (const [planning, state] of [
    [false, agentState],
    [true, planningAgentState],
  ] as const) {
    if (
      state === AgentState.FINISHED ||
      state === AgentState.AWAITING_USER_INPUT
    )
      finishCandidate(planning);
  }
  return finalIds;
}
