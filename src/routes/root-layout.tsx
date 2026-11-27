import React from "react";
import {
  useRouteError,
  isRouteErrorResponse,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import i18n from "#/i18n";
import { useConfig } from "#/hooks/query/use-config";
import { Sidebar } from "#/components/features/sidebar/sidebar";
import { SidebarMobileNavProvider } from "#/components/features/sidebar/sidebar-mobile-nav-context";
import { SidebarMobileMenuBar } from "#/components/features/sidebar/sidebar-mobile-menu-bar";
import { LicenseBanner } from "#/components/features/alerts/license-banner";
import { useSettings } from "#/hooks/query/use-settings";
import { useEnsureActiveProfile } from "#/hooks/use-ensure-active-profile";
import { useMigrateDefaultAgentProfile } from "#/hooks/use-migrate-default-agent-profile";
import { useMigrateEnabledSkills } from "#/hooks/use-migrate-enabled-skills";
import { useSyncTelemetryConsent } from "#/hooks/use-sync-telemetry-consent";
import { useSyncAutomationTelemetryConsent } from "#/hooks/use-sync-automation-telemetry-consent";

import { useTelemetryIdentity } from "#/hooks/use-telemetry-identity";
import { useSyncDocumentLanguage } from "#/hooks/use-sync-document-language";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { CloudOrganizationBoundary } from "#/components/features/backends/cloud-organization-boundary";
import { useAppTitle } from "#/hooks/use-app-title";
import { ReactRouterNavigationProvider } from "./react-router-navigation-provider";
import { OnboardingHost } from "#/components/features/onboarding";
import { isOnboardingPreviewActive } from "#/components/features/onboarding/onboarding-preview";
import { CanvasExtensionsRuntimeProvider } from "#/components/features/canvas-extensions/canvas-extensions-runtime";
import {
  isMacDesktopShell,
  isWindowsDesktopShell,
  isDesktopEditAction,
  type DesktopEditAction,
} from "#/utils/desktop-shell";
import { useDesktopFullScreen } from "#/hooks/use-desktop-full-screen";
import { cn } from "#/utils/utils";
import { useSidebarStore } from "#/stores/sidebar-store";
import { ChevronLeft, ChevronRight, PanelLeft } from "lucide-react";
import { useColorTheme } from "#/hooks/use-color-theme";

const EnvironmentSwitchOverlay = React.lazy(
  () => import("#/components/features/backends/environment-switch-overlay"),
);
const AlertBanner = React.lazy(() =>
  import("#/components/features/alerts/alert-banner").then((m) => ({
    default: m.AlertBanner,
  })),
);
const CommandMenu = React.lazy(() =>
  import("#/components/features/command-menu/command-menu").then((m) => ({
    default: m.CommandMenu,
  })),
);
const SuperAdminSetupGuide = React.lazy(
  () => import("#/components/features/setup-guide/super-admin-setup-guide"),
);

/**
 * Desktop builds hide the native title text and overlay the window controls
 * over the shell. Screens reserve a 36px band for them and make it the
 * window's drag handle; the padding keeps it free of controls.
 */
function useShowTitleBarBand(): boolean {
  const isFullScreen = useDesktopFullScreen();
  // Fullscreen hides the native controls, so the band has nothing to clear.
  return (isMacDesktopShell() || isWindowsDesktopShell()) && !isFullScreen;
}

function TitleBarDragRegion() {
  const visible = useShowTitleBarBand();
  return <DesktopTitleBar visible={visible} />;
}

type TitleBarAction =
  | DesktopEditAction
  | "new-window"
  | "new-conversation"
  | "open-workspace"
  | "close-window"
  | "quit"
  | "settings"
  | "toggle-sidebar"
  | "reload"
  | "about";
interface TitleBarMenuItem {
  action: TitleBarAction;
  label?: I18nKey;
  copyKey?: keyof typeof titleBarCopy.en.actions;
  shortcut?: string;
  macShortcut?: string;
  separator?: boolean;
}
const titleBarMenus: Record<
  "file" | "edit" | "view" | "help",
  TitleBarMenuItem[]
> = {
  file: [
    { action: "new-window", label: I18nKey.DESKTOP_MENU$NEW_WINDOW },
    {
      action: "new-conversation",
      label: I18nKey.COMMAND_MENU$NEW_CHAT_TITLE,
      shortcut: "N",
    },
    {
      action: "open-workspace",
      label: I18nKey.DESKTOP_MENU$OPEN_FOLDER,
      shortcut: "O",
      separator: true,
    },
    {
      action: "close-window",
      label: I18nKey.BUTTON$CLOSE,
      shortcut: "W",
      separator: true,
    },
    {
      action: "quit",
      label: I18nKey.DESKTOP_MENU$QUIT,
      shortcut: "Q",
      separator: true,
    },
  ],
  edit: [
    { action: "undo", copyKey: "undo", shortcut: "Z" },
    { action: "redo", copyKey: "redo", shortcut: "Y", macShortcut: "Shift+Z" },
    {
      action: "cut",
      label: I18nKey.DESKTOP_MENU$CUT,
      shortcut: "X",
      separator: true,
    },
    { action: "copy", label: I18nKey.DESKTOP_MENU$COPY, shortcut: "C" },
    { action: "paste", label: I18nKey.DESKTOP_MENU$PASTE, shortcut: "V" },
    { action: "delete", label: I18nKey.BUTTON$DELETE },
    {
      action: "select-all",
      label: I18nKey.DESKTOP_MENU$SELECT_ALL,
      shortcut: "A",
      separator: true,
    },
    {
      action: "settings",
      label: I18nKey.SIDEBAR$SETTINGS,
      shortcut: ",",
      separator: true,
    },
  ],
  view: [
    {
      action: "toggle-sidebar",
      label: I18nKey.DESKTOP_MENU$TOGGLE_SIDEBAR,
      shortcut: "Shift+S",
    },
    { action: "reload", copyKey: "reload", shortcut: "R" },
  ],
  help: [{ action: "about", copyKey: "about" }],
};
type TitleBarMenuName = keyof typeof titleBarMenus;
const DESKTOP_HOME_PATH = "/conversations";
const DESKTOP_SETTINGS_PATH = "/settings";
const DESKTOP_SETTINGS_LINK_SELECTOR =
  '[data-testid="backend-selector-settings-link"], [data-testid="collapsed-settings-link"]';
const DESKTOP_MENU_ACTION_PARAM = "desktopAction";
const WORKSPACE_LAUNCHER_SELECTOR =
  'button[data-testid="open-workspace-button"], button[data-testid="open-repository-button"]';

const titleBarCopy = {
  en: {
    menus: { file: "File", edit: "Edit", view: "View", help: "Help" },
    actions: {
      newConversation: "New conversation",
      openWorkspace: "Open workspace",
      undo: "Undo",
      redo: "Redo",
      toggleSidebar: "Toggle sidebar",
      reload: "Reload",
      about: "About Jora",
    },
    labels: {
      toggleSidebar: "Toggle sidebar",
      back: "Go back",
      forward: "Go forward",
    },
  },
  zh: {
    menus: { file: "文件", edit: "编辑", view: "视图", help: "帮助" },
    actions: {
      newConversation: "新建对话",
      openWorkspace: "打开工作区",
      undo: "撤销",
      redo: "重做",
      toggleSidebar: "切换侧边栏",
      reload: "刷新",
      about: "关于 Jora",
    },
    labels: { toggleSidebar: "切换侧边栏", back: "后退", forward: "前进" },
  },
} as const;

interface DesktopEditTarget {
  element: HTMLElement;
  inputSelection?: {
    start: number;
    end: number;
    direction: "forward" | "backward" | "none" | null;
  };
  range?: Range;
}

function DesktopTitleBar({ visible }: { visible: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const titleBarRef = React.useRef<HTMLDivElement>(null);
  const activeMenuRef = React.useRef<HTMLDivElement>(null);
  const hoverOpenedMenuRef = React.useRef<TitleBarMenuName | null>(null);
  const editTargetRef = React.useRef<DesktopEditTarget | null>(null);
  const [openMenu, setOpenMenu] = React.useState<TitleBarMenuName | null>(null);
  const toggleSidebar = useSidebarStore((state) => state.toggleCollapsed);
  const { i18n, t } = useTranslation("openhands");
  const colorTheme = useColorTheme();
  const shortcutModifier = isMacDesktopShell() ? "⌘" : "Ctrl+";
  const copy = i18n.language.startsWith("zh")
    ? titleBarCopy.zh
    : titleBarCopy.en;

  const rememberEditTarget = (
    element: EventTarget | null = document.activeElement,
  ) => {
    if (
      !(element instanceof HTMLElement) ||
      titleBarRef.current?.contains(element)
    )
      return;
    const target: DesktopEditTarget = { element };
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      if (element.selectionStart !== null && element.selectionEnd !== null) {
        target.inputSelection = {
          start: element.selectionStart,
          end: element.selectionEnd,
          direction: element.selectionDirection,
        };
      }
    }
    const selection = window.getSelection();
    if (selection?.rangeCount)
      target.range = selection.getRangeAt(0).cloneRange();
    editTargetRef.current = target;
  };

  React.useEffect(() => {
    const shell = window.desktopShell;
    if (!shell?.setTitleBarTheme || !titleBarRef.current) return;
    const titleBarStyle = getComputedStyle(titleBarRef.current);
    void shell.setTitleBarTheme({
      color: titleBarStyle.backgroundColor,
      symbolColor: titleBarStyle.color,
    });
  }, [colorTheme, visible]);

  React.useEffect(() => {
    if (openMenu === null) {
      editTargetRef.current = null;
      return undefined;
    }

    const dismissMenu = () => setOpenMenu(null);
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !activeMenuRef.current?.contains(event.target)
      ) {
        dismissMenu();
      }
    };
    // Capture outside presses before a child can stop propagation.
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [openMenu]);

  const runMenuAction = React.useCallback(
    (action: TitleBarAction) => {
      setOpenMenu(null);
      if (action === "new-conversation") {
        navigate(DESKTOP_HOME_PATH);
      } else if (action === "open-workspace") {
        const button = document.querySelector<HTMLButtonElement>(
          WORKSPACE_LAUNCHER_SELECTOR,
        );
        if (button) button.click();
        else
          navigate(
            DESKTOP_HOME_PATH + "?" + DESKTOP_MENU_ACTION_PARAM + "=" + action,
          );
      } else if (action === "toggle-sidebar") {
        toggleSidebar();
      } else if (action === "reload") {
        window.location.reload();
      } else if (action === "settings") {
        const link = document.querySelector<HTMLElement>(
          DESKTOP_SETTINGS_LINK_SELECTOR,
        );
        if (link) link.click();
        else navigate(DESKTOP_SETTINGS_PATH);
      } else if (isDesktopEditAction(action)) {
        const target = editTargetRef.current;
        if (target?.element.isConnected) {
          target.element.focus({ preventScroll: true });
          if (
            target.inputSelection &&
            (target.element instanceof HTMLInputElement ||
              target.element instanceof HTMLTextAreaElement)
          ) {
            const { start, end, direction } = target.inputSelection;
            target.element.setSelectionRange(
              start,
              end,
              direction ?? undefined,
            );
          } else if (
            target.range?.startContainer.isConnected &&
            target.range.endContainer.isConnected
          ) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(target.range);
          }
        }
        void window.desktopShell?.performEditingAction?.(action);
      } else {
        void window.desktopShell?.performWindowAction?.(action);
      }
    },
    [navigate, toggleSidebar],
  );

  React.useEffect(
    () => window.desktopShell?.onMenuAction?.(runMenuAction),
    [runMenuAction],
  );
  React.useEffect(() => {
    if (!visible) setOpenMenu(null);
  }, [visible]);
  React.useEffect(() => {
    if (
      new URLSearchParams(location.search).get(DESKTOP_MENU_ACTION_PARAM) !==
      "open-workspace"
    )
      return undefined;
    let opened = false;
    const openLauncher = () => {
      const button = document.querySelector<HTMLButtonElement>(
        WORKSPACE_LAUNCHER_SELECTOR,
      );
      if (!button || button.disabled || opened) return;
      opened = true;
      button.click();
      navigate(DESKTOP_HOME_PATH, { replace: true });
    };
    const observer = new MutationObserver(openLauncher);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });
    openLauncher();
    return () => observer.disconnect();
  }, [location.search, navigate]);

  if (!visible) return null;

  return (
    <div
      ref={titleBarRef}
      className="app-shell-chrome desktop-titlebar fixed inset-x-0 top-0 z-50 flex h-9 select-none text-sm text-muted"
      onPointerDownCapture={() => rememberEditTarget()}
      onFocusCapture={(event) => {
        if (editTargetRef.current?.element !== event.relatedTarget) {
          rememberEditTarget(event.relatedTarget);
        }
      }}
    >
      <div
        className={cn(
          "app-region-no-drag flex shrink-0 items-center gap-0.5",
          isMacDesktopShell() ? "pl-20" : "pl-2",
        )}
      >
        <button
          type="button"
          className="app-region-no-drag inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-contrast"
          aria-label={copy.labels.toggleSidebar}
          title={copy.labels.toggleSidebar}
          onClick={toggleSidebar}
        >
          <PanelLeft
            size={14}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </button>
        <button
          type="button"
          className="app-region-no-drag inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-contrast"
          aria-label={copy.labels.back}
          title={copy.labels.back}
          onClick={() => window.history.back()}
        >
          <ChevronLeft
            size={15}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </button>
        <button
          type="button"
          className="app-region-no-drag inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-contrast"
          aria-label={copy.labels.forward}
          title={copy.labels.forward}
          onClick={() => window.history.forward()}
        >
          <ChevronRight
            size={15}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </button>
        <div className="mx-1 h-4 w-px bg-border/50" />
        {(Object.keys(titleBarMenus) as TitleBarMenuName[]).map((menuName) => (
          <div
            key={menuName}
            ref={openMenu === menuName ? activeMenuRef : null}
            className="app-region-no-drag relative"
          >
            <button
              type="button"
              className="app-region-no-drag desktop-menu-trigger inline-flex h-6 items-center px-2.5 text-xs-plus leading-none"
              aria-haspopup="menu"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => {
                if (openMenu !== null && openMenu !== menuName) {
                  hoverOpenedMenuRef.current = menuName;
                  setOpenMenu(menuName);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setOpenMenu(menuName);
                  requestAnimationFrame(() =>
                    activeMenuRef.current
                      ?.querySelector<HTMLButtonElement>(
                        '[role="menuitem"]:not(:disabled)',
                      )
                      ?.focus(),
                  );
                }
              }}
              aria-expanded={openMenu === menuName}
              onClick={() => {
                const openedByHover = hoverOpenedMenuRef.current === menuName;
                hoverOpenedMenuRef.current = null;
                setOpenMenu((current) =>
                  current === menuName && !openedByHover ? null : menuName,
                );
              }}
            >
              {copy.menus[menuName]}
            </button>
            {openMenu === menuName ? (
              <div
                className="app-region-no-drag desktop-app-menu absolute left-0 top-full mt-1"
                role="menu"
                data-menu={menuName}
                tabIndex={-1}
                aria-label={copy.menus[menuName]}
                onKeyDown={(event) => {
                  const items = Array.from(
                    event.currentTarget.querySelectorAll<HTMLButtonElement>(
                      '[role="menuitem"]:not(:disabled)',
                    ),
                  );
                  const index = items.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  let target: number | undefined;
                  if (event.key === "ArrowDown")
                    target = (index + 1) % items.length;
                  if (event.key === "ArrowUp")
                    target = (index - 1 + items.length) % items.length;
                  if (event.key === "Home") target = 0;
                  if (event.key === "End") target = items.length - 1;
                  if (target !== undefined) {
                    event.preventDefault();
                    items[target]?.focus();
                  }
                }}
              >
                {titleBarMenus[menuName].map((item) => (
                  <React.Fragment key={item.action}>
                    {item.separator ? (
                      <div
                        className="desktop-menu-separator"
                        role="separator"
                      />
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      className="desktop-menu-item"
                      onMouseDown={(event) => event.preventDefault()}
                      disabled={
                        (isDesktopEditAction(item.action) &&
                          !window.desktopShell?.performEditingAction) ||
                        ((item.action === "new-window" ||
                          item.action === "close-window" ||
                          item.action === "quit" ||
                          item.action === "about") &&
                          !window.desktopShell?.performWindowAction)
                      }
                      onClick={() => runMenuAction(item.action)}
                    >
                      <span>
                        {item.label
                          ? t(item.label)
                          : item.copyKey
                            ? copy.actions[item.copyKey]
                            : null}
                      </span>
                      {item.shortcut ? (
                        <kbd
                          aria-hidden="true"
                          className="desktop-menu-shortcut"
                        >
                          {shortcutModifier}
                          {isMacDesktopShell()
                            ? (item.macShortcut ?? item.shortcut)
                            : item.shortcut}
                        </kbd>
                      ) : null}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div
        data-testid="titlebar-drag-region"
        aria-hidden="true"
        className={cn(
          "flex-1",
          openMenu === null ? "app-region-drag" : "app-region-no-drag",
        )}
      />
    </div>
  );
}

function ErrorShell({ children }: { children: React.ReactNode }) {
  const showTitleBarBand = useShowTitleBarBand();
  return (
    <div
      className={cn(
        "app-shell-content",
        showTitleBarBand && "app-shell-titlebar-inset",
      )}
    >
      <TitleBarDragRegion />
      {children}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation("openhands");

  if (isRouteErrorResponse(error)) {
    return (
      <ErrorShell>
        <h1>{error.status}</h1>
        <p>{error.statusText}</p>
        <pre>
          {error.data instanceof Object
            ? JSON.stringify(error.data)
            : error.data}
        </pre>
      </ErrorShell>
    );
  }
  if (error instanceof Error) {
    return (
      <ErrorShell>
        <h1>{t(I18nKey.ERROR$GENERIC)}</h1>
        <pre>{error.message}</pre>
      </ErrorShell>
    );
  }

  return (
    <ErrorShell>
      <h1>{t(I18nKey.ERROR$UNKNOWN)}</h1>
    </ErrorShell>
  );
}

export default function MainApp() {
  return (
    <CloudOrganizationBoundary>
      <MainAppContent />
    </CloudOrganizationBoundary>
  );
}

function DocumentTitle() {
  const appTitle = useAppTitle();
  return <title>{appTitle}</title>;
}

function MainAppContent() {
  const location = useLocation();
  const { data: settings } = useSettings();
  const config = useConfig();
  const showTitleBarBand = useShowTitleBarBand();

  useSyncAutomationTelemetryConsent();

  useSyncTelemetryConsent();
  useTelemetryIdentity();
  // Local-mode policy: keep a profile active so a usable LLM is always selected.
  useEnsureActiveProfile();
  // One-shot move from the catalog deny-list to an explicit allow-list.
  useMigrateEnabledSkills();
  // One-shot move of global agent behavior into the `default` profile.
  useMigrateDefaultAgentProfile();

  React.useEffect(() => {
    if (settings?.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings?.language]);
  useSyncDocumentLanguage();

  if (config.isLoading) {
    return (
      <div className="app-shell-content min-h-screen flex items-center justify-center">
        <TitleBarDragRegion />
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const isConversationRoute = /^\/conversations\/[^/]+/.test(location.pathname);
  const hideMobileSidebarMenuBar = isConversationRoute;
  const showOnboardingPreview = isOnboardingPreviewActive(location.search);

  return (
    <ReactRouterNavigationProvider>
      <CanvasExtensionsRuntimeProvider>
        <SidebarMobileNavProvider>
          <div
            data-testid="root-layout"
            className={cn(
              "app-shell-chrome app-shell-safe-area h-dvh lg:min-w-5xl flex flex-col md:flex-row overflow-hidden p-0",
              showTitleBarBand && "app-shell-titlebar-inset",
            )}
          >
            <DocumentTitle />
            <TitleBarDragRegion />
            <Sidebar />

            <div className="app-shell-content flex min-h-0 flex-col w-full min-w-0 h-full gap-3 overflow-hidden md:rounded-tl-[20px]">
              {!hideMobileSidebarMenuBar ? <SidebarMobileMenuBar /> : null}
              <LicenseBanner />
              {config.data &&
                (config.data.maintenance_start_time ||
                  (config.data.faulty_models &&
                    config.data.faulty_models.length > 0) ||
                  config.data.error_message) && (
                  <React.Suspense fallback={null}>
                    <AlertBanner
                      maintenanceStartTime={config.data.maintenance_start_time}
                      faultyModels={config.data.faulty_models}
                      errorMessage={config.data.error_message}
                      updatedAt={config.data.updated_at}
                    />
                  </React.Suspense>
                )}
              <div
                id="root-outlet"
                className={cn(
                  "relative min-h-0 flex-1 px-0",
                  isConversationRoute
                    ? "overflow-hidden"
                    : "overflow-auto scrollbar-hide",
                )}
              >
                <Outlet />
              </div>
            </div>
          </div>
          <React.Suspense fallback={null}>
            <EnvironmentSwitchOverlay />
            <CommandMenu />
          </React.Suspense>
          <React.Suspense fallback={null}>
            <SuperAdminSetupGuide />
          </React.Suspense>
          {showOnboardingPreview ? <OnboardingHost /> : null}
        </SidebarMobileNavProvider>
      </CanvasExtensionsRuntimeProvider>
    </ReactRouterNavigationProvider>
  );
}
