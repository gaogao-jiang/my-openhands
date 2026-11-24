import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { Check, Ellipsis, Square, Volume2 } from "lucide-react";
import {
  HiHandThumbDown,
  HiHandThumbUp,
  HiOutlineHandThumbDown,
  HiOutlineHandThumbUp,
} from "react-icons/hi2";
import { StyledTooltip } from "#/components/shared/buttons/styled-tooltip";
import { I18nKey } from "#/i18n/declaration";
import { useMessageFeedbackStore } from "#/stores/message-feedback-store";
import { useMessageReadAloudStore } from "#/stores/message-read-aloud-store";
import { AGENT_SERVER_UI_SCOPE_SELECTOR } from "#/styles/agent-server-ui-style-scope";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { cn } from "#/utils/utils";
import { RoundedCopyIcon } from "./rounded-copy-icon";
import { MESSAGE_TOOLTIP_CLASS } from "./message-tooltip-style";

export interface MessageAction {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip?: string;
}

interface AssistantMessageToolbarProps {
  message: string;
  feedbackKey?: string;
  isCopy: boolean;
  onCopy: () => void;
  isStreaming?: boolean;
  isFinalReply?: boolean;
  actions?: MessageAction[];
  onMenuOpenChange?: (open: boolean) => void;
  className?: string;
}

const TOOLBAR_BUTTON =
  "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-muted transition-colors hover:bg-interactive-hover hover:text-contrast focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-40";
const MENU_ITEM =
  "flex min-h-6 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs leading-4 font-normal text-foreground outline-none transition-colors hover:bg-interactive-hover data-focus-visible:bg-interactive-hover data-focus-visible:outline-2 data-focus-visible:outline-focus";
const MENU_SURFACE =
  "z-50 w-max max-w-64 rounded-lg border border-border-subtle bg-tertiary px-1 py-0.5 shadow-lg outline-none";

const FEEDBACK_OPTIONS = [
  [
    "helpful",
    I18nKey.CHAT_INTERFACE$HELPFUL,
    HiOutlineHandThumbUp,
    HiHandThumbUp,
  ],
  [
    "not-helpful",
    I18nKey.CHAT_INTERFACE$NOT_HELPFUL,
    HiOutlineHandThumbDown,
    HiHandThumbDown,
  ],
] as const;

export function AssistantMessageToolbar({
  message,
  feedbackKey,
  isCopy,
  onCopy,
  isStreaming = false,
  isFinalReply = true,
  actions,
  onMenuOpenChange,
  className,
}: AssistantMessageToolbarProps) {
  const { t, i18n } = useTranslation("openhands");
  const playbackId = React.useId();
  const [portalContainer, setPortalContainer] = React.useState<
    Element | undefined
  >();
  const setToolbarRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node)
      setPortalContainer(
        node.closest(AGENT_SERVER_UI_SCOPE_SELECTOR) ?? undefined,
      );
  }, []);
  const rating = useMessageFeedbackStore((state) =>
    feedbackKey ? state.ratings[feedbackKey] : undefined,
  );
  const setRating = useMessageFeedbackStore((state) => state.setRating);
  const isReading = useMessageReadAloudStore(
    (state) => state.activeId === playbackId,
  );
  const play = useMessageReadAloudStore((state) => state.play);
  const stop = useMessageReadAloudStore((state) => state.stop);
  const supportsSpeech =
    !!globalThis.speechSynthesis && !!globalThis.SpeechSynthesisUtterance;
  React.useEffect(() => () => stop(playbackId), [playbackId, stop]);
  React.useEffect(() => {
    stop(playbackId);
  }, [message, playbackId, stop]);
  const copyLabel = t(isCopy ? I18nKey.BUTTON$COPIED : I18nKey.BUTTON$COPY);
  const readLabel = t(
    !supportsSpeech
      ? I18nKey.CHAT_INTERFACE$READ_ALOUD_UNAVAILABLE
      : isReading
        ? I18nKey.CHAT_INTERFACE$STOP_READING
        : I18nKey.CHAT_INTERFACE$READ_ALOUD,
  );
  return (
    <div
      ref={setToolbarRef}
      data-testid="assistant-message-actions"
      className={cn("-ml-1.5 flex items-center gap-0", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <StyledTooltip
        tooltipClassName={MESSAGE_TOOLTIP_CLASS}
        content={t(
          isCopy
            ? I18nKey.CHAT_INTERFACE$COPIED_SHORT
            : I18nKey.CHAT_INTERFACE$COPY_SHORT,
        )}
        placement="top"
      >
        <button
          type="button"
          data-testid="copy-to-clipboard"
          aria-label={copyLabel}
          disabled={isCopy}
          onClick={onCopy}
          className={TOOLBAR_BUTTON}
        >
          {isCopy ? (
            <Check size={15} strokeWidth={1.5} aria-hidden />
          ) : (
            <RoundedCopyIcon size={14} strokeWidth={1.6} aria-hidden />
          )}
        </button>
      </StyledTooltip>
      {isFinalReply &&
        FEEDBACK_OPTIONS.map(([value, labelKey, Icon, FilledIcon]) => (
          <StyledTooltip
            key={value}
            content={t(labelKey)}
            placement="top"
            tooltipClassName={MESSAGE_TOOLTIP_CLASS}
          >
            <button
              type="button"
              aria-label={t(labelKey)}
              aria-pressed={rating === value}
              disabled={!feedbackKey || isStreaming}
              className={cn(
                TOOLBAR_BUTTON,
                "message-feedback-button",
                rating === value && "text-contrast",
              )}
              onClick={() => {
                if (feedbackKey)
                  setRating(feedbackKey, rating === value ? null : value);
              }}
            >
              {rating === value ? (
                <FilledIcon size={16} aria-hidden />
              ) : (
                <Icon size={16} aria-hidden />
              )}
            </button>
          </StyledTooltip>
        ))}
      {isFinalReply && (
        <StyledTooltip
          content={isReading ? t(I18nKey.BUTTON$STOP) : readLabel}
          placement="top"
          tooltipClassName={MESSAGE_TOOLTIP_CLASS}
        >
          <button
            type="button"
            aria-label={readLabel}
            aria-pressed={isReading}
            disabled={!supportsSpeech || isStreaming || !message.trim()}
            className={TOOLBAR_BUTTON}
            onClick={() => {
              if (isReading) stop(playbackId);
              else
                play(playbackId, message, i18n.language, () =>
                  displayErrorToast(
                    t(I18nKey.CHAT_INTERFACE$READ_ALOUD_FAILED),
                  ),
                );
            }}
          >
            {isReading ? (
              <Square size={13} strokeWidth={1.5} aria-hidden />
            ) : (
              <Volume2 size={15} strokeWidth={1.5} aria-hidden />
            )}
          </button>
        </StyledTooltip>
      )}
      {actions?.length ? (
        <MenuTrigger onOpenChange={onMenuOpenChange}>
          <StyledTooltip
            content={t(I18nKey.CHAT_INTERFACE$MORE_SHORT)}
            placement="top"
            tooltipClassName={MESSAGE_TOOLTIP_CLASS}
          >
            <Button
              aria-label={t(I18nKey.COMMON$MORE_OPTIONS)}
              className={cn(
                TOOLBAR_BUTTON,
                "relative hover:bg-transparent focus:outline-none focus-visible:outline-none data-focus-visible:outline-2 data-focus-visible:outline-focus active:scale-95 aria-expanded:text-contrast before:absolute before:inset-1 before:rounded-md before:transition-colors hover:before:bg-interactive-hover aria-expanded:before:bg-interactive-selected",
              )}
            >
              <Ellipsis
                className="relative"
                size={15}
                strokeWidth={1.5}
                aria-hidden
              />
            </Button>
          </StyledTooltip>
          <Popover
            placement="top start"
            UNSTABLE_portalContainer={portalContainer}
            className={MENU_SURFACE}
          >
            <Menu
              aria-label={t(I18nKey.COMMON$MORE_OPTIONS)}
              className="outline-none"
            >
              {actions.map((action, index) => (
                <MenuItem
                  key={index}
                  onAction={action.onClick}
                  textValue={action.tooltip ?? t(I18nKey.COMMON$MORE_OPTIONS)}
                  className={MENU_ITEM}
                >
                  {action.icon}
                  {action.tooltip ?? t(I18nKey.COMMON$MORE_OPTIONS)}
                </MenuItem>
              ))}
            </Menu>
          </Popover>
        </MenuTrigger>
      ) : null}
    </div>
  );
}
