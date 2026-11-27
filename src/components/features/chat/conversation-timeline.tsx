import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { Tooltip } from "#/components/shared/tooltip";
import { cn } from "#/utils/utils";

interface ConversationTimelineProps {
  rowKeys: string[];
  previews?: Record<string, string>;
  currentRowKey: string | null;
  visibleRowKeys?: string[];
  placement: { top: number; height: number };
  onSelect: (rowKey: string) => void;
}

export function ConversationTimeline({
  rowKeys,
  previews = {},
  currentRowKey,
  visibleRowKeys = [],
  placement,
  onSelect,
}: ConversationTimelineProps) {
  const { t } = useTranslation("openhands");

  if (rowKeys.length === 0) return null;

  const activeIndex = Math.max(0, rowKeys.indexOf(currentRowKey ?? ""));

  return (
    <nav
      aria-label={t(I18nKey.CHAT_INTERFACE$CONVERSATION_TIMELINE)}
      data-testid="conversation-timeline"
      style={
        {
          "--conversation-timeline-top": `${placement.top}px`,
          "--conversation-timeline-height": `${placement.height}px`,
        } as CSSProperties
      }
      className="pointer-events-none absolute left-0 top-(--conversation-timeline-top) z-10 flex h-(--conversation-timeline-height) w-10 items-center justify-center py-1"
    >
      <div className="flex max-h-full w-8 min-w-0 flex-col items-start gap-2 scrollbar-hide overflow-y-auto py-1">
        {rowKeys.map((rowKey, index) => {
          const isCurrent = rowKey === currentRowKey;
          const isVisible = visibleRowKeys.includes(rowKey);

          const [title, ...body] = (previews[rowKey] ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

          return (
            <Tooltip
              key={rowKey}
              placement="right"
              offset={12}
              delay={150}
              closeDelay={80}
              isDisabled={!title}
              disableAnimation={import.meta.env.MODE === "test"}
              className="pointer-events-none z-50 w-max max-w-64 rounded-2xl border border-border bg-surface px-3 py-2 text-foreground shadow-lg"
              content={
                <div className="min-w-0 text-xs leading-5">
                  <div className="line-clamp-1 font-medium">{title}</div>
                  {body.length > 0 && (
                    <div className="mt-1 line-clamp-3 whitespace-pre-line text-muted">
                      {body.join("\n")}
                    </div>
                  )}
                </div>
              }
            >
              <button
                type="button"
                tabIndex={index === activeIndex ? 0 : -1}
                aria-label={t(I18nKey.CHAT_INTERFACE$TIMELINE_ITEM, {
                  number: index + 1,
                })}
                aria-current={isCurrent ? "location" : undefined}
                data-testid="conversation-timeline-marker"
                onClick={() => onSelect(rowKey)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                    return;
                  }
                  event.preventDefault();
                  const nextIndex = Math.min(
                    rowKeys.length - 1,
                    Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)),
                  );
                  const nextKey = rowKeys[nextIndex];
                  const nextButton = event.currentTarget.parentElement
                    ?.children[nextIndex] as HTMLButtonElement | undefined;
                  nextButton?.focus();
                  if (nextKey) onSelect(nextKey);
                }}
                className="group pointer-events-auto flex h-3 w-full shrink-0 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span
                  className={cn(
                    "h-0.5 w-[7px] rounded-full transition-all group-hover:w-6 group-hover:bg-contrast/75 group-active:scale-x-90 motion-reduce:transition-none",
                    isVisible ? "bg-contrast/55" : "bg-border",
                  )}
                />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </nav>
  );
}
