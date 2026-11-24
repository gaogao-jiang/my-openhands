import { useTranslation } from "react-i18next";
import JoraMark from "#/assets/branding/jora-mark.svg?react";
import { NavigationLink } from "#/components/shared/navigation-link";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";

const DEFAULT_LOGO_WIDTH = 24;
const DEFAULT_LOGO_HEIGHT = 24;

export type OpenHandsLogoButtonProps = {
  className?: string;
  /** Applied to the root `<svg>` (e.g. `max-w-none` so Tailwind preflight doesn’t clamp wide marks inside a narrow flex slot). */
  logoClassName?: string;
  logoWidth?: number;
  logoHeight?: number;
  showName?: boolean;
};

export function OpenHandsLogoButton({
  className,
  logoClassName,
  logoWidth = DEFAULT_LOGO_WIDTH,
  logoHeight = DEFAULT_LOGO_HEIGHT,
  showName = false,
}: OpenHandsLogoButtonProps = {}) {
  const { t } = useTranslation("openhands");

  const ariaLabel = t(I18nKey.BRANDING$OPENHANDS_LOGO);
  const productName = t(I18nKey.BRANDING$OPENHANDS);

  return (
    <NavigationLink
      to="/conversations"
      aria-label={ariaLabel}
      className={cn(
        "min-w-0 items-center",
        showName ? "flex gap-2" : "inline-flex",
        className,
      )}
    >
      <JoraMark
        width={logoWidth}
        height={logoHeight}
        className={cn("shrink-0 text-contrast", logoClassName)}
      />
      {showName ? (
        <span className="truncate text-sm-plus font-semibold text-contrast">
          {productName}
        </span>
      ) : null}
    </NavigationLink>
  );
}
