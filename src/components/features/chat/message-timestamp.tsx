import React from "react";
import { useTranslation } from "react-i18next";
import { StyledTooltip } from "#/components/shared/buttons/styled-tooltip";
import { cn } from "#/utils/utils";
import { MESSAGE_TOOLTIP_CLASS } from "./message-tooltip-style";
import {
  formatClockTime,
  formatEventTimestamp,
} from "#/utils/format-event-timestamp";

export function MessageTimestamp({
  timestamp,
  active,
  align,
  className,
}: {
  timestamp: string;
  active: boolean;
  align: "left" | "right";
  className?: string;
}) {
  const { i18n } = useTranslation("openhands");
  const [focused, setFocused] = React.useState(false);
  const exact = formatEventTimestamp(timestamp, i18n?.language);
  const visible = active || focused;

  if (!exact) return null;
  const clockTime = formatClockTime(timestamp, i18n?.language);
  if (!clockTime) return null;

  return (
    <div
      data-testid="message-timestamp"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      className={cn(
        // Padding bridges the pointer path from the bubble to its timestamp.
        "absolute top-full z-10 w-max pt-0.5 text-xs leading-4 text-muted",
        align === "right" ? "right-0 text-right" : "left-0 text-left",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
    >
      <StyledTooltip
        content={<time dateTime={timestamp}>{exact}</time>}
        placement="top"
        tooltipClassName={MESSAGE_TOOLTIP_CLASS}
      >
        <button
          type="button"
          aria-label={exact}
          className="cursor-default whitespace-nowrap rounded-sm focus-visible:outline-2 focus-visible:outline-focus"
        >
          <time dateTime={timestamp}>{clockTime}</time>
        </button>
      </StyledTooltip>
    </div>
  );
}
