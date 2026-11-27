/**
 * Desktop-shell detection for the renderer.
 *
 * The app is served over loopback, so a desktop launch is indistinguishable
 * from a browser tab unless the Electron preload says so — see
 * electron/preload-main.cjs.
 */

const DESKTOP_EDIT_ACTIONS = [
  "undo",
  "redo",
  "cut",
  "copy",
  "paste",
  "delete",
  "select-all",
] as const;
export type DesktopEditAction = (typeof DESKTOP_EDIT_ACTIONS)[number];

export function isDesktopEditAction(
  action: string,
): action is DesktopEditAction {
  return (DESKTOP_EDIT_ACTIONS as readonly string[]).includes(action);
}

interface DesktopShellBridge {
  platform?: string;
  performEditingAction?: (action: DesktopEditAction) => Promise<void>;
  performWindowAction?: (
    action: "new-window" | "close-window" | "quit" | "about",
  ) => Promise<void>;
  onMenuAction?: (
    cb: (
      action:
        "new-conversation" | "open-workspace" | "settings" | "toggle-sidebar",
    ) => void,
  ) => () => void;
  isFullScreen?: () => boolean;
  setTitleBarTheme?: (theme: {
    color: string;
    symbolColor: string;
  }) => Promise<void>;
  onFullScreenChange?: (cb: (isFullScreen: boolean) => void) => () => void;
}

declare global {
  interface Window {
    desktopShell?: DesktopShellBridge;
  }
}

function getDesktopShell(): DesktopShellBridge | undefined {
  return typeof window === "undefined" ? undefined : window.desktopShell;
}

/** True inside the macOS desktop app with overlaid native controls. */
export function isMacDesktopShell(): boolean {
  return getDesktopShell()?.platform === "darwin";
}

/** True inside the Windows desktop app with an overlaid native title bar. */
export function isWindowsDesktopShell(): boolean {
  return getDesktopShell()?.platform === "win32";
}

/** Whether the desktop window is in native fullscreen; false in a browser tab. */
export function isDesktopFullScreen(): boolean {
  return getDesktopShell()?.isFullScreen?.() ?? false;
}

/**
 * Subscribe to native fullscreen transitions. Returns an unsubscribe function;
 * outside the desktop app it is a no-op, since a browser tab owns no window.
 */
export function subscribeDesktopFullScreen(
  cb: (isFullScreen: boolean) => void,
): () => void {
  return getDesktopShell()?.onFullScreenChange?.(cb) ?? (() => {});
}
