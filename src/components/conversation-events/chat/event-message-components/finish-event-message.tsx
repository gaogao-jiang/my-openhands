import { ActionEvent } from "#/types/agent-server/core";
import { FinishAction } from "#/types/agent-server/core/base/action";
import { ChatMessage } from "../../../features/chat/chat-message";
import {
  MessageReactions,
  useMessageReactions,
} from "../../../features/chat/message-reactions";
import {
  MessageEditedMark,
  useMessageEdit,
} from "../../../features/chat/message-edits";
import { getEventContent } from "../event-content-helpers/get-event-content";
import { CriticResultDisplay } from "./critic-result-display";
import { useMessageFeedbackKey } from "#/hooks/use-message-feedback-key";

interface FinishEventMessageProps {
  event: ActionEvent<FinishAction>;
  isFromPlanningAgent?: boolean;
  showActions?: boolean;
}

export function FinishEventMessage({
  event,
  isFromPlanningAgent = false,
  showActions = false,
}: FinishEventMessageProps) {
  const feedbackKey = useMessageFeedbackKey(event.id);
  const reactions = useMessageReactions(event.id, "agent", {
    isFromPlanningAgent,
  });
  const editedText = useMessageEdit(event.id);
  const eventContent = getEventContent(event);
  const message =
    editedText ??
    (typeof eventContent.details === "string"
      ? eventContent.details
      : String(eventContent.details));

  return (
    <>
      <ChatMessage
        type="agent"
        message={message}
        isFromPlanningAgent={isFromPlanningAgent}
        timestamp={event.timestamp}
        feedbackKey={feedbackKey}
        showActions={showActions}
      >
        {editedText !== undefined && <MessageEditedMark />}
        {reactions.visible && <MessageReactions state={reactions} />}
      </ChatMessage>
      {event.critic_result != null && (
        <CriticResultDisplay criticResult={event.critic_result} />
      )}
    </>
  );
}
