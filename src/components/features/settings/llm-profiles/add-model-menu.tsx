import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Plug, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandButton } from "../brand-button";
import { AppearancePortal } from "#/components/shared/appearance-portal";
import { usePopoverFixedPlacement } from "#/hooks/use-popover-fixed-placement";
import { dropdownMenuRowClassName } from "#/utils/dropdown-classes";
import { I18nKey } from "#/i18n/declaration";

interface AddModelMenuProps {
  onManual?: () => void;
  onProvider?: () => void;
}

export function AddModelMenu({ onManual, onProvider }: AddModelMenuProps) {
  const { t } = useTranslation("openhands");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const box = usePopoverFixedPlacement(trigger, {
    open,
    enabled: true,
    targetWidth: 240,
  });

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open]);

  useEffect(() => {
    if (open && box)
      menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [open, box]);

  if (!onManual && !onProvider) return null;

  return (
    <>
      <BrandButton
        ref={trigger}
        testId="add-model-menu-trigger"
        type="button"
        variant="primary"
        startContent={<Plus size={16} aria-hidden="true" />}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {t(I18nKey.SETTINGS$MODEL_ADD)}
        <ChevronDown size={14} aria-hidden="true" />
      </BrandButton>
      {open && box && (
        <AppearancePortal>
          <div
            ref={menu}
            role="menu"
            tabIndex={-1}
            aria-label={t(I18nKey.SETTINGS$MODEL_ADD)}
            className="fixed z-50 flex flex-col gap-0.5 rounded-lg border border-border-subtle bg-overlay p-1 shadow-lg"
            style={{ top: box.top, left: box.left, width: box.width }}
            onKeyDown={(event) => {
              const items = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button",
                ),
              ];
              if (event.key === "Escape" || event.key === "Tab") {
                if (event.key === "Escape") event.preventDefault();
                trigger.current?.focus();
                setOpen(false);
              } else if (
                ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const index = items.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : (index +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          items.length) %
                        items.length;
                items[next]?.focus();
              }
            }}
          >
            {onProvider && (
              <button
                type="button"
                role="menuitem"
                data-testid="add-models-from-provider"
                className={dropdownMenuRowClassName}
                onClick={() => {
                  setOpen(false);
                  onProvider();
                }}
              >
                <Plug size={16} aria-hidden="true" />
                {t(I18nKey.SETTINGS$ADD_MODELS_FROM_PROVIDER)}
              </button>
            )}
            {onManual && (
              <button
                type="button"
                role="menuitem"
                data-testid="add-llm-profile"
                className={dropdownMenuRowClassName}
                onClick={() => {
                  setOpen(false);
                  onManual();
                }}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                {t(I18nKey.SETTINGS$MODEL_ADD_MANUALLY)}
              </button>
            )}
          </div>
        </AppearancePortal>
      )}
    </>
  );
}
