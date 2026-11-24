import CloseIcon from "#/icons/u-close.svg?react";
import { cn, isMobileDevice } from "#/utils/utils";

interface RemoveFileButtonProps {
  onClick: () => void;
  /** Names the attachment this icon-only button removes. */
  ariaLabel: string;
  className?: string;
}

export function RemoveFileButton({
  onClick,
  ariaLabel,
  className,
}: RemoveFileButtonProps) {
  const isMobile = isMobileDevice();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "z-10 flex size-5 rounded-full items-center justify-center bg-contrast text-contrast-foreground hover:bg-contrast/80 cursor-pointer absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        isMobile && "opacity-100",
        className,
      )}
    >
      <CloseIcon width={12} height={12} className="text-contrast-foreground" />
    </button>
  );
}
