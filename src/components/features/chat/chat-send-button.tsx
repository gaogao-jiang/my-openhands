import { ArrowUp, Loader2, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { StyledTooltip } from "#/components/shared/buttons/styled-tooltip";

export interface ChatSendButtonProps {
  buttonClassName: string;
  handleSubmit: () => void;
  disabled: boolean;
  isPending?: boolean;
  isStopping?: boolean;
}

export function ChatSendButton({
  buttonClassName,
  handleSubmit,
  disabled,
  isPending = false,
  isStopping = false,
}: ChatSendButtonProps) {
  const { t } = useTranslation("openhands");
  const label = t(
    isStopping
      ? I18nKey.BUTTON$STOP
      : I18nKey.CHAT_INTERFACE$TOOLTIP_SEND_MESSAGE,
  );

  return (
    <StyledTooltip content={label} placement="top">
      <button
        type="button"
        className={cn(
          "flex items-center justify-center rounded-full border border-contrast size-8",
          disabled
            ? "cursor-not-allowed border-muted"
            : "cursor-pointer hover:bg-contrast/10",
          buttonClassName,
        )}
        data-name={isStopping ? "stop-circle" : "arrow-up-circle-fill"}
        data-testid={isStopping ? "stop-button" : "submit-button"}
        onClick={handleSubmit}
        disabled={disabled}
        aria-busy={isPending}
        aria-label={label}
      >
        {isPending ? (
          <Loader2
            data-testid="submit-button-pending-icon"
            className="size-4 animate-spin text-muted"
            aria-hidden
          />
        ) : isStopping ? (
          <Square
            className="size-3.5 fill-current text-status-error"
            aria-hidden
          />
        ) : (
          <ArrowUp
            className="w-4 h-4"
            color={disabled ? "var(--oh-muted)" : "var(--oh-contrast)"}
          />
        )}
      </button>
    </StyledTooltip>
  );
}
