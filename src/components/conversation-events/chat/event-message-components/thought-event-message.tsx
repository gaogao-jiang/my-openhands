import React from "react";
import { ActionEvent } from "#/types/agent-server/core";
import { ChatMessage } from "../../../features/chat/chat-message";
import { useMessageFeedbackKey } from "#/hooks/use-message-feedback-key";

interface ThoughtEventMessageProps {
  event: ActionEvent;
  actions?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
  }>;
  isFromPlanningAgent?: boolean;
}

export function ThoughtEventMessage({
  event,
  actions,
  isFromPlanningAgent = false,
}: ThoughtEventMessageProps) {
  const feedbackKey = useMessageFeedbackKey(event.id);
  // Extract thought content from the action event
  const thoughtContent = event.thought
    .filter((t) => t.type === "text")
    .map((t) => t.text)
    .join("\n");

  // If there's no thought content, don't render anything
  if (!thoughtContent) {
    return null;
  }

  return (
    <ChatMessage
      type="agent"
      message={thoughtContent}
      actions={actions}
      isFromPlanningAgent={isFromPlanningAgent}
      timestamp={event.timestamp}
      feedbackKey={feedbackKey}
    />
  );
}
