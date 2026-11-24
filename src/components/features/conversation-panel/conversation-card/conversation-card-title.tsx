import { ConversationTitleText } from "#/components/features/conversation/conversation-title-text";
import { cn } from "#/utils/utils";

export type ConversationCardTitleMode = "view" | "edit";

export type ConversationCardTitleProps = {
  titleMode: ConversationCardTitleMode;
  title: string;
  titlePending?: boolean;
  onSave: (title: string) => void;
  isConversationArchived?: boolean;
};

export function ConversationCardTitle({
  titleMode,
  title,
  titlePending,
  onSave,
  isConversationArchived,
}: ConversationCardTitleProps) {
  if (titleMode === "edit") {
    return (
      <input
        /* eslint-disable jsx-a11y/no-autofocus */
        autoFocus
        data-testid="conversation-card-title"
        onClick={(event: React.MouseEvent<HTMLInputElement>) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onBlur={(e) => {
          const trimmed = e.currentTarget?.value?.trim?.() ?? "";
          onSave(trimmed);
        }}
        onKeyUp={(event: React.KeyboardEvent<HTMLInputElement>) => {
          // Ignore Enter key during IME composition (e.g., Chinese, Japanese, Korean input)
          if (event.nativeEvent.isComposing) {
            return;
          }
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        type="text"
        defaultValue={title}
        className="w-full appearance-none border-0 !bg-transparent text-sm leading-6 font-semibold !text-contrast caret-contrast shadow-none outline-none placeholder:text-muted focus:!bg-transparent focus:!text-contrast focus:shadow-none focus:outline-none focus:ring-0"
      />
    );
  }

  return (
    <p
      data-testid="conversation-card-title"
      className={cn(
        "text-xs leading-6 font-semibold bg-transparent truncate overflow-hidden",
        isConversationArchived && "opacity-60",
      )}
    >
      <ConversationTitleText title={title} pending={titlePending} />
    </p>
  );
}
