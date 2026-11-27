/**
 * Shared layout tokens for /settings/* and extensions pages (/skills, /mcp,
 * /plugins) so mobile gets horizontal inset while desktop keeps the aside +
 * `gap-10` + right gutter pattern.
 *
 * The settings shell keeps native scrolling available while hiding the
 * scrollbar chrome so the content area stays visually clean.
 */
export const settingsLikeMainScrollClassName =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto scrollbar-hide px-4 pt-8 pb-12 lg:px-0 lg:pr-3.5";

/** Same scroll shell as {@link settingsLikeMainScrollClassName} but desktop top padding comes from the outer `lg:pt-8` wrapper ({@link SettingsLayout}). */
export const settingsLayoutMainScrollClassName =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto scrollbar-hide px-4 pt-8 pb-12 lg:px-0 lg:pt-0 lg:pr-3.5";
