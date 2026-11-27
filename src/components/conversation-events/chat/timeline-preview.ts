import type { MessageEvent } from "#/types/agent-server/core";
import { parseMessageFromEvent } from "./event-content-helpers/parse-message-from-event";

const PREVIEW_LENGTH = 600;

/** Preview the submitted question, including when its row is virtualized away. */
export function getTimelinePreview(event: MessageEvent): string {
  const text = parseMessageFromEvent(event).trim();
  return text.length > PREVIEW_LENGTH
    ? `${text.slice(0, PREVIEW_LENGTH)}…`
    : text;
}
