import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoutesStub, data, Link } from "react-router";
import MainApp, { ErrorBoundary } from "#/routes/root-layout";
import { ActiveBackendProvider } from "#/contexts/active-backend-context";
import { I18nKey } from "#/i18n/declaration";
import { useSidebarStore } from "#/stores/sidebar-store";

const useConfigMock = vi.fn();
const useSettingsMock = vi.fn();
const changeLanguageMock = vi.fn();
const ensureActiveProfileMock = vi.fn();
const migrateEnabledSkillsMock = vi.fn();
const migrateDefaultAgentProfileMock = vi.fn();
const syncTelemetryConsentMock = vi.fn();
const syncAutomationTelemetryConsentMock = vi.fn();
const telemetryIdentityMock = vi.fn();
const syncDocumentLanguageMock = vi.fn();
const openWorkspaceLauncherMock = vi.fn();

vi.mock("#/hooks/query/use-config", () => ({
  useConfig: () => useConfigMock(),
}));

vi.mock("#/hooks/query/use-settings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("#/hooks/use-migrate-enabled-skills", () => ({
  useMigrateEnabledSkills: () => migrateEnabledSkillsMock(),
}));

vi.mock("#/hooks/use-migrate-default-agent-profile", () => ({
  useMigrateDefaultAgentProfile: () => migrateDefaultAgentProfileMock(),
}));

vi.mock("#/hooks/use-sync-telemetry-consent", () => ({
  useSyncTelemetryConsent: () => syncTelemetryConsentMock(),
}));

vi.mock("#/hooks/use-sync-automation-telemetry-consent", () => ({
  useSyncAutomationTelemetryConsent: () => syncAutomationTelemetryConsentMock(),
}));

vi.mock("#/hooks/use-telemetry-identity", () => ({
  useTelemetryIdentity: () => telemetryIdentityMock(),
}));

vi.mock("#/hooks/use-sync-document-language", () => ({
  useSyncDocumentLanguage: () => syncDocumentLanguageMock(),
}));

vi.mock("#/hooks/use-ensure-active-profile", () => ({
  useEnsureActiveProfile: () => ensureActiveProfileMock(),
}));

vi.mock(
  "#/components/features/canvas-extensions/canvas-extensions-runtime",
  () => ({
    CanvasExtensionsRuntimeProvider: ({ children }: { children: ReactNode }) =>
      children,
  }),
);

vi.mock("#/hooks/use-app-title", () => ({
  useAppTitle: () => "OpenHands",
}));

vi.mock("#/components/features/sidebar/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("#/components/features/sidebar/sidebar-mobile-menu-bar", () => ({
  SidebarMobileMenuBar: () => <div data-testid="mobile-menu-bar" />,
}));

vi.mock("#/components/features/alerts/alert-banner", () => ({
  AlertBanner: ({
    errorMessage,
  }: {
    errorMessage: string | null | undefined;
  }) => <div data-testid="alert-banner">{errorMessage}</div>,
}));

vi.mock("#/components/features/backends/environment-switch-overlay", () => ({
  default: () => <div data-testid="environment-switch-overlay" />,
}));

vi.mock("#/components/features/command-menu/command-menu", () => ({
  CommandMenu: () => <div data-testid="command-menu" />,
}));

vi.mock("#/components/features/onboarding", () => ({
  OnboardingHost: () => <div data-testid="onboarding-host" />,
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: (namespace?: string) => ({
      i18n: { language: "en" },
      t: (key: string) => {
        const labels: Record<string, string> = {
          [I18nKey.DESKTOP_MENU$NEW_WINDOW]: "New window",
          [I18nKey.DESKTOP_MENU$OPEN_FOLDER]: "Open folder",
          [I18nKey.DESKTOP_MENU$QUIT]: "Quit Jora",
          [I18nKey.COMMAND_MENU$NEW_CHAT_TITLE]: "New chat",
          [I18nKey.BUTTON$CLOSE]: "Close",
          [I18nKey.DESKTOP_MENU$CUT]: "Cut",
          [I18nKey.DESKTOP_MENU$COPY]: "Copy",
          [I18nKey.DESKTOP_MENU$PASTE]: "Paste",
          [I18nKey.DESKTOP_MENU$SELECT_ALL]: "Select all",
          [I18nKey.BUTTON$DELETE]: "Delete",
          [I18nKey.SIDEBAR$SETTINGS]: "Settings",
          [I18nKey.DESKTOP_MENU$TOGGLE_SIDEBAR]: "Show/hide sidebar",
        };
        return namespace === "openhands"
          ? (labels[key] ?? key)
          : `missing-namespace:${key}`;
      },
    }),
  };
});

vi.mock("#/i18n", () => ({
  default: {
    changeLanguage: (...args: unknown[]) => changeLanguageMock(...args),
  },
}));

const RouterStub = createRoutesStub([
  {
    path: "/",
    Component: MainApp,
    children: [
      {
        path: "/",
        Component: () => (
          <>
            <div data-testid="outlet-content" />
            <Link to="/settings" data-testid="rerender-link">
              Settings
            </Link>
          </>
        ),
      },
      {
        path: "/automations",
        Component: () => <div data-testid="outlet-content" />,
      },
      {
        path: "/automations/:id",
        Component: () => <div data-testid="outlet-content" />,
      },
      {
        path: "/conversations",
        Component: () => (
          <div data-testid="outlet-content">
            <button
              data-testid="open-workspace-button"
              onClick={openWorkspaceLauncherMock}
            >
              Workspace launcher
            </button>
          </div>
        ),
      },
      {
        path: "/conversations/:id",
        Component: () => <div data-testid="outlet-content" />,
      },
      {
        path: "/settings",
        Component: () => (
          <div data-testid="outlet-content">
            <div data-testid="settings-content" />
          </div>
        ),
      },
      {
        path: "*",
        Component: () => <div data-testid="outlet-content" />,
      },
    ],
  },
]);

function renderMainApp(path = "/") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveBackendProvider>
        <RouterStub initialEntries={[path]} />
      </ActiveBackendProvider>
    </QueryClientProvider>,
  );
}

function renderRouteError(thrown: unknown) {
  const ErrorRouterStub = createRoutesStub([
    {
      path: "/",
      Component: () => null,
      ErrorBoundary,
      loader: () => {
        throw thrown;
      },
    },
  ]);

  return render(<ErrorRouterStub initialEntries={["/"]} />);
}

describe("root layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useConfigMock.mockReturnValue({
      isLoading: false,
      data: {
        maintenance_start_time: null,
        faulty_models: [],
        error_message: null,
        updated_at: new Date().toISOString(),
      },
    });
    useSettingsMock.mockReturnValue({
      data: {
        language: "en",
        user_consents_to_analytics: true,
      },
    });
  });

  it("shows a loading spinner while config is loading", () => {
    useConfigMock.mockReturnValue({ isLoading: true, data: null });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ActiveBackendProvider>
          <RouterStub initialEntries={["/"]} />
        </ActiveBackendProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("does not render the analytics consent modal when analytics consent is missing", async () => {
    useSettingsMock.mockReturnValue({
      data: {
        language: "en",
        user_consents_to_analytics: null,
      },
    });

    renderMainApp();

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("outlet-content")).toBeInTheDocument();
    // The analytics consent popup was removed from onboarding: a missing
    // (null) consent value must no longer surface the consent form.
    expect(
      screen.queryByTestId("user-capture-consent-form"),
    ).not.toBeInTheDocument();
    expect(await screen.findByTestId("command-menu")).toBeInTheDocument();
  });

  it("renders an identical root-layout className across routes so navigation never shifts the outer container", () => {
    const paths = [
      "/",
      "/automations/abc-123",
      "/conversations/abc-123",
      "/settings",
    ];

    const classNames = paths.map((path) => {
      const { unmount } = render(
        <QueryClientProvider client={new QueryClient()}>
          <ActiveBackendProvider>
            <RouterStub initialEntries={[path]} />
          </ActiveBackendProvider>
        </QueryClientProvider>,
      );
      const { className } = screen.getByTestId("root-layout");
      unmount();
      return className;
    });

    expect(new Set(classNames).size).toBe(1);
  });

  it("initializes layout services and renders the lazy global chrome", async () => {
    renderMainApp();

    expect(changeLanguageMock).toHaveBeenCalledWith("en");
    expect(migrateEnabledSkillsMock).toHaveBeenCalledOnce();
    expect(migrateDefaultAgentProfileMock).toHaveBeenCalledOnce();
    expect(syncTelemetryConsentMock).toHaveBeenCalledOnce();
    expect(syncAutomationTelemetryConsentMock).toHaveBeenCalledOnce();
    expect(telemetryIdentityMock).toHaveBeenCalledOnce();
    expect(ensureActiveProfileMock).toHaveBeenCalledOnce();
    expect(syncDocumentLanguageMock).toHaveBeenCalledOnce();
    expect(document.title).toBe("OpenHands");
    expect(
      await screen.findByTestId("environment-switch-overlay"),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("command-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("alert-banner")).not.toBeInTheDocument();
  });

  it("updates the active language when the setting changes", () => {
    renderMainApp();
    expect(changeLanguageMock).toHaveBeenCalledWith("en");
    changeLanguageMock.mockClear();
    useSettingsMock.mockReturnValue({
      data: {
        language: "fr",
        user_consents_to_analytics: true,
      },
    });

    fireEvent.click(screen.getByTestId("rerender-link"));

    expect(changeLanguageMock).toHaveBeenCalledOnce();
    expect(changeLanguageMock).toHaveBeenCalledWith("fr");
  });

  it("leaves the current language unchanged when no language is configured", () => {
    useSettingsMock.mockReturnValue({
      data: {
        language: null,
        user_consents_to_analytics: true,
      },
    });

    renderMainApp();

    expect(changeLanguageMock).not.toHaveBeenCalled();
    expect(ensureActiveProfileMock).toHaveBeenCalledOnce();
  });

  it("renders while settings are loading without changing the language", () => {
    useSettingsMock.mockReturnValue({ data: undefined });

    renderMainApp();

    expect(screen.getByTestId("root-layout")).toBeInTheDocument();
    expect(changeLanguageMock).not.toHaveBeenCalled();
  });

  it("shows the mobile menu outside a conversation and hides it inside one", () => {
    const { unmount } = renderMainApp("/settings");

    expect(screen.getByTestId("mobile-menu-bar")).toBeInTheDocument();
    unmount();

    renderMainApp("/conversations/abc-123");

    expect(screen.queryByTestId("mobile-menu-bar")).not.toBeInTheDocument();
  });

  it("bounds conversation routes inside the dynamic safe-area viewport", () => {
    renderMainApp("/conversations/abc-123");

    expect(screen.getByTestId("root-layout")).toHaveClass(
      "h-dvh",
      "app-shell-safe-area",
    );
    expect(document.getElementById("root-outlet")).toHaveClass(
      "min-h-0",
      "overflow-hidden",
    );
  });

  it("keeps non-conversation routes scrollable in the app outlet", () => {
    renderMainApp("/settings");

    expect(document.getElementById("root-outlet")).toHaveClass("overflow-auto");
  });

  it("does not hide the mobile menu for a nested non-conversation route", () => {
    renderMainApp("/settings/conversations/abc-123");

    expect(screen.getByTestId("mobile-menu-bar")).toBeInTheDocument();
  });

  it("renders the onboarding host only when preview mode is requested", () => {
    const { unmount } = renderMainApp("/settings");

    expect(screen.queryByTestId("onboarding-host")).not.toBeInTheDocument();
    unmount();

    renderMainApp("/settings?previewOnboardingStep=2");

    expect(screen.getByTestId("onboarding-host")).toBeInTheDocument();
  });

  it("renders the lazy alert banner when the backend reports an error", async () => {
    useConfigMock.mockReturnValue({
      isLoading: false,
      data: {
        maintenance_start_time: null,
        faulty_models: [],
        error_message: "Backend degraded",
        updated_at: new Date().toISOString(),
      },
    });

    renderMainApp();

    expect(await screen.findByTestId("alert-banner")).toHaveTextContent(
      "Backend degraded",
    );
  });

  it.each([
    {
      label: "scheduled maintenance",
      data: {
        maintenance_start_time: "2030-01-02T03:04:05.000Z",
        faulty_models: [],
        error_message: null,
        updated_at: "2030-01-01T00:00:00.000Z",
      },
    },
    {
      label: "a faulty model",
      data: {
        maintenance_start_time: null,
        faulty_models: ["broken-model"],
        error_message: null,
        updated_at: "2030-01-01T00:00:00.000Z",
      },
    },
  ])("renders the alert banner for $label", async ({ data: configData }) => {
    useConfigMock.mockReturnValue({
      isLoading: false,
      data: configData,
    });

    renderMainApp();

    expect(await screen.findByTestId("alert-banner")).toBeInTheDocument();
  });

  it("renders without an alert when config data is unavailable", async () => {
    useConfigMock.mockReturnValue({ isLoading: false, data: null });

    renderMainApp();

    expect(await screen.findByTestId("command-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("alert-banner")).not.toBeInTheDocument();
  });

  describe("desktop title bar", () => {
    afterEach(() => {
      delete window.desktopShell;
    });

    it("toggles the sidebar through the renamed view menu and native shortcut", async () => {
      let emit:
        | Parameters<
            NonNullable<NonNullable<Window["desktopShell"]>["onMenuAction"]>
          >[0]
        | undefined;
      window.desktopShell = {
        platform: "win32",
        onMenuAction: (cb) => {
          emit = cb;
          return () => {};
        },
      };
      const user = userEvent.setup();
      const initialCollapsed = useSidebarStore.getState().collapsed;
      renderMainApp();
      try {
        await user.click(screen.getByRole("button", { name: "View" }));
        const item = screen.getByRole("menuitem", {
          name: "Show/hide sidebar",
        });
        expect(item).toHaveTextContent("Ctrl+Shift+S");

        await user.click(item);

        expect(useSidebarStore.getState().collapsed).toBe(!initialCollapsed);
        act(() => emit?.("toggle-sidebar"));
        expect(useSidebarStore.getState().collapsed).toBe(initialCollapsed);
      } finally {
        act(() => useSidebarStore.getState().setCollapsed(initialCollapsed));
      }
    });

    it("keeps the input selection when invoking an edit command and shows the Windows redo shortcut", async () => {
      const observedTargets: {
        focused: boolean;
        start: number;
        end: number;
      }[] = [];
      const performEditingAction = vi.fn().mockImplementation(() => {
        const input = screen.getByRole("textbox") as HTMLTextAreaElement;
        observedTargets.push({
          focused: document.activeElement === input,
          start: input.selectionStart,
          end: input.selectionEnd,
        });
        return Promise.resolve();
      });
      window.desktopShell = { platform: "win32", performEditingAction };
      const user = userEvent.setup();
      renderMainApp();
      render(<textarea defaultValue="hello world" />);
      const input = screen.getByRole("textbox") as HTMLTextAreaElement;
      input.focus();
      input.setSelectionRange(0, 5);

      await user.click(screen.getByRole("button", { name: "Edit" }));
      expect(screen.getByRole("menuitem", { name: "Redo" })).toHaveTextContent(
        "Ctrl+Y",
      );
      await user.click(screen.getByRole("menuitem", { name: "Cut" }));

      expect(performEditingAction).toHaveBeenCalledWith("cut");
      expect(observedTargets).toEqual([{ focused: true, start: 0, end: 5 }]);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("restores a contenteditable selection after keyboard focus enters the menu", async () => {
      const observedTargets: {
        element: Element | null;
        selection: string | undefined;
      }[] = [];
      const performEditingAction = vi.fn().mockImplementation(() => {
        observedTargets.push({
          element: document.activeElement,
          selection: window.getSelection()?.toString(),
        });
        return Promise.resolve();
      });
      window.desktopShell = { platform: "win32", performEditingAction };
      const user = userEvent.setup();
      renderMainApp();
      const { container } = render(
        <div contentEditable suppressContentEditableWarning>
          chosen text
        </div>,
      );
      const editor = container.firstElementChild as HTMLElement;
      editor.focus();
      const range = document.createRange();
      range.setStart(editor.firstChild!, 0);
      range.setEnd(editor.firstChild!, 6);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      await user.click(screen.getByRole("button", { name: "Edit" }));
      screen.getByRole("menuitem", { name: "Copy" }).focus();
      window.getSelection()?.removeAllRanges();

      await user.keyboard("{Enter}");

      expect(performEditingAction).toHaveBeenCalledWith("copy");
      expect(observedTargets).toEqual([
        { element: editor, selection: "chosen" },
      ]);
    });

    it("opens the settings screen from the edit menu", async () => {
      window.desktopShell = { platform: "win32" };
      const user = userEvent.setup();
      renderMainApp();
      await user.click(screen.getByRole("button", { name: "Edit" }));

      await user.click(screen.getByRole("menuitem", { name: "Settings" }));

      expect(await screen.findByTestId("settings-content")).toBeInTheDocument();
    });

    it("uses the existing Cloud settings entry when it is available", async () => {
      const openCloudSettings = vi.fn();
      window.desktopShell = { platform: "win32" };
      const user = userEvent.setup();
      renderMainApp();
      render(
        <a
          href="https://cloud.example.test/settings?org=team"
          data-testid="backend-selector-settings-link"
          onClick={(event) => {
            event.preventDefault();
            openCloudSettings();
          }}
        >
          Cloud settings
        </a>,
      );
      await user.click(screen.getByRole("button", { name: "Edit" }));

      await user.click(screen.getByRole("menuitem", { name: "Settings" }));

      expect(openCloudSettings).toHaveBeenCalledOnce();
      expect(screen.queryByTestId("settings-content")).not.toBeInTheDocument();
    });

    it("opens the workspace launcher from another route through native shortcuts, including fullscreen", async () => {
      let emit:
        ((action: "new-conversation" | "open-workspace") => void) | undefined;
      const unsubscribe = vi.fn();
      window.desktopShell = {
        platform: "win32",
        isFullScreen: () => true,
        onMenuAction: (cb) => {
          emit = cb;
          return unsubscribe;
        },
      };
      const { unmount } = renderMainApp("/settings");

      await act(async () => emit?.("open-workspace"));

      await waitFor(() =>
        expect(openWorkspaceLauncherMock).toHaveBeenCalledOnce(),
      );
      expect(screen.getByTestId("open-workspace-button")).toBeInTheDocument();
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it.each([
      ["New window", "new-window"],
      ["Close", "close-window"],
      ["Quit Jora", "quit"],
    ] as const)("executes the %s window command", async (label, action) => {
      const performWindowAction = vi.fn().mockResolvedValue(undefined);
      window.desktopShell = { platform: "win32", performWindowAction };
      const user = userEvent.setup();
      renderMainApp();
      await user.click(screen.getByRole("button", { name: "File" }));

      await user.click(screen.getByRole("menuitem", { name: label }));

      expect(performWindowAction).toHaveBeenCalledWith(action);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("switches an open menu when hovering another title and supports keyboard selection", async () => {
      window.desktopShell = {
        platform: "win32",
        performEditingAction: vi.fn(),
      };
      const user = userEvent.setup();
      renderMainApp();
      await user.click(screen.getByRole("button", { name: "File" }));

      await user.hover(screen.getByRole("button", { name: "Edit" }));

      const undo = screen.getByRole("menuitem", { name: "Undo" });
      undo.focus();
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("menuitem", { name: "Redo" })).toHaveFocus();
    });

    it.each(["outlet-content", "sidebar"])(
      "dismisses an open menu when clicking %s, even if propagation is stopped",
      async (testId) => {
        window.desktopShell = { platform: "win32" };
        const user = userEvent.setup();
        renderMainApp();
        const fileMenu = screen.getByRole("button", { name: "File" });
        const outside = screen.getByTestId(testId);
        outside.addEventListener(
          "pointerdown",
          (event) => event.stopPropagation(),
          { once: true },
        );
        await user.click(fileMenu);
        expect(fileMenu).toHaveAttribute("aria-expanded", "true");

        await user.click(outside);

        expect(fileMenu).toHaveAttribute("aria-expanded", "false");
        expect(
          screen.queryByRole("menuitem", { name: "Open folder" }),
        ).not.toBeInTheDocument();
      },
    );

    it("dismisses the menu when clicking another title bar control", async () => {
      window.desktopShell = { platform: "win32" };
      const user = userEvent.setup();
      renderMainApp();
      const fileMenu = screen.getByRole("button", { name: "File" });
      await user.click(fileMenu);

      await user.click(screen.getByRole("button", { name: "Toggle sidebar" }));

      expect(fileMenu).toHaveAttribute("aria-expanded", "false");
    });

    it("switches between menus and closes on a second click of the active title", async () => {
      window.desktopShell = { platform: "win32" };
      const user = userEvent.setup();
      renderMainApp();
      const fileMenu = screen.getByRole("button", { name: "File" });
      const editMenu = screen.getByRole("button", { name: "Edit" });
      await user.click(fileMenu);

      await user.click(editMenu);

      expect(fileMenu).toHaveAttribute("aria-expanded", "false");
      expect(editMenu).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByRole("menuitem", { name: "Undo" }),
      ).toBeInTheDocument();

      await user.click(editMenu);

      expect(editMenu).toHaveAttribute("aria-expanded", "false");
    });

    it("runs a selected menu action and dismisses the menu", async () => {
      window.desktopShell = { platform: "win32" };
      const user = userEvent.setup();
      const openWorkspace = vi.fn();
      renderMainApp();
      render(
        <button data-testid="open-workspace-button" onClick={openWorkspace}>
          Choose folder
        </button>,
      );
      const fileMenu = screen.getByRole("button", { name: "File" });
      await user.click(fileMenu);

      await user.click(screen.getByRole("menuitem", { name: "Open folder" }));

      expect(openWorkspace).toHaveBeenCalledOnce();
      expect(fileMenu).toHaveAttribute("aria-expanded", "false");
    });

    it("allows clicking the title bar's empty space to dismiss the menu", async () => {
      window.desktopShell = { platform: "win32" };
      const user = userEvent.setup();
      renderMainApp();
      const fileMenu = screen.getByRole("button", { name: "File" });
      const emptyTitleBar = screen.getByTestId("titlebar-drag-region");
      await user.click(fileMenu);
      // Electron consumes mouse events in drag regions, so this surface must
      // accept normal input while a menu is open.
      expect(emptyTitleBar).toHaveClass("app-region-no-drag");
      expect(emptyTitleBar).not.toHaveClass("app-region-drag");

      await user.click(emptyTitleBar);

      expect(fileMenu).toHaveAttribute("aria-expanded", "false");
      expect(emptyTitleBar).toHaveClass("app-region-drag");
    });

    it.each(["darwin", "win32"])(
      "reserves a native drag surface beside the menu on %s",
      (platform) => {
        window.desktopShell = { platform };

        renderMainApp();

        const dragRegion = screen.getByTestId("titlebar-drag-region");
        expect(dragRegion).toHaveAttribute("aria-hidden", "true");
        expect(dragRegion).toBeEmptyDOMElement();
        fireEvent.click(screen.getByRole("button", { name: "File" }));
        expect(
          screen.getByRole("menuitem", { name: "New chat" }),
        ).toBeInTheDocument();
        expect(screen.getByTestId("root-layout")).toHaveClass(
          "app-shell-titlebar-inset",
        );
      },
    );

    it("adds no band in a browser tab, where the shell owns no window chrome", () => {
      renderMainApp();

      expect(
        screen.queryByTestId("titlebar-drag-region"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("root-layout")).not.toHaveClass(
        "app-shell-titlebar-inset",
      );
    });

    it("adds no band on Linux, which keeps the native title bar", () => {
      window.desktopShell = { platform: "linux" };

      renderMainApp();

      expect(
        screen.queryByTestId("titlebar-drag-region"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("root-layout")).not.toHaveClass(
        "app-shell-titlebar-inset",
      );
    });

    it("keeps a drag band on the loading screen, before config resolves", () => {
      window.desktopShell = { platform: "darwin" };
      useConfigMock.mockReturnValue({ isLoading: true, data: null });

      renderMainApp();

      expect(screen.getByTestId("titlebar-drag-region")).toBeInTheDocument();
    });

    it("keeps the band and the inset on the route error screen", async () => {
      window.desktopShell = { platform: "darwin" };

      renderRouteError(new Error("Kaboom"));

      expect(await screen.findByText("Kaboom")).toBeInTheDocument();
      expect(
        screen
          .getByTestId("titlebar-drag-region")
          .closest(".app-shell-titlebar-inset"),
      ).toBeInTheDocument();
    });

    it("drops the band once the window goes fullscreen, where macOS hides the traffic lights", async () => {
      let isFullScreen = false;
      let emit: ((value: boolean) => void) | undefined;
      window.desktopShell = {
        platform: "darwin",
        isFullScreen: () => isFullScreen,
        onFullScreenChange: (cb) => {
          emit = (value) => {
            isFullScreen = value;
            cb(value);
          };
          return () => {};
        },
      };

      renderMainApp();
      expect(screen.getByTestId("titlebar-drag-region")).toBeInTheDocument();

      await act(async () => emit?.(true));

      expect(
        screen.queryByTestId("titlebar-drag-region"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("root-layout")).not.toHaveClass(
        "app-shell-titlebar-inset",
      );

      await act(async () => emit?.(false));

      expect(screen.getByTestId("titlebar-drag-region")).toBeInTheDocument();
    });

    it("never renders the band when the window is already fullscreen on load, as after a reload", () => {
      window.desktopShell = {
        platform: "darwin",
        isFullScreen: () => true,
        onFullScreenChange: () => () => {},
      };

      renderMainApp();

      // Checked on the first commit: a band that is dropped later still flashes.
      expect(
        screen.queryByTestId("titlebar-drag-region"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("root-layout")).not.toHaveClass(
        "app-shell-titlebar-inset",
      );
    });
  });
});

describe("root layout error boundary", () => {
  it("renders an object route response with its HTTP details", async () => {
    renderRouteError(
      data(
        { reason: "maintenance" },
        { status: 503, statusText: "Service Unavailable" },
      ),
    );

    expect(
      await screen.findByRole("heading", { name: "503" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Service Unavailable")).toBeInTheDocument();
    expect(screen.getByText('{"reason":"maintenance"}')).toBeInTheDocument();
  });

  it("renders primitive route-response data without serializing it", async () => {
    renderRouteError(
      data("plain failure", { status: 400, statusText: "Bad Request" }),
    );

    expect(
      await screen.findByRole("heading", { name: "400" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bad Request")).toBeInTheDocument();
    expect(screen.getByText("plain failure")).toBeInTheDocument();
  });

  it("renders the generic translated heading and message for an Error", async () => {
    renderRouteError(new Error("Kaboom"));

    expect(
      await screen.findByRole("heading", { name: I18nKey.ERROR$GENERIC }),
    ).toBeInTheDocument();
    expect(screen.getByText("Kaboom")).toBeInTheDocument();
  });

  it("renders the unknown translated heading for a non-Error value", async () => {
    renderRouteError("mystery failure");

    expect(
      await screen.findByRole("heading", { name: I18nKey.ERROR$UNKNOWN }),
    ).toBeInTheDocument();
  });
});
