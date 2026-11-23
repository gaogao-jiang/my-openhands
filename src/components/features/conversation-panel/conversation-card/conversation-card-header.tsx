import { ConversationCardTitle } from "./conversation-card-title";

interface ConversationCardHeaderProps {
  title: string;
  titlePending?: boolean;
  titleMode: "view" | "edit";
  onTitleSave: (title: string) => void;
  /** The effective archived state resolved by the card. */
  isArchived?: boolean;
}

export function ConversationCardHeader({
  title,
  titlePending,
  titleMode,
  onTitleSave,
  isArchived,
}: ConversationCardHeaderProps) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
      <ConversationCardTitle
        title={title}
        titlePending={titlePending}
        titleMode={titleMode}
        onSave={onTitleSave}
        isConversationArchived={isArchived}
      />
    </div>
  );
}
