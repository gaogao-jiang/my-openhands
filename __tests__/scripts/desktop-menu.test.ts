// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  registerDesktopMenu,
  handleDesktopMenuShortcut,
  DESKTOP_WINDOW_ACTION_CHANNEL,
  DESKTOP_FRONTEND_ACTION_CHANNEL,
  DESKTOP_EDIT_ACTION_CHANNEL,
} from "../../electron/lib/desktop-menu.mjs";

describe("desktop menu", () => {
  it.each(["win32", "darwin"])(
    "toggles the sidebar with the shifted S shortcut on %s",
    (platform) => {
      const event = { preventDefault: vi.fn() };
      const win = { webContents: { send: vi.fn() } };
      const modifiers = {
        control: platform === "win32",
        meta: platform === "darwin",
      };
      const options = { platform, app: { quit: vi.fn() } };
      handleDesktopMenuShortcut(
        event,
        { type: "keyDown", key: "s", ...modifiers },
        win,
        options,
      );
      handleDesktopMenuShortcut(
        event,
        { type: "keyDown", key: "n", shift: true, ...modifiers },
        win,
        options,
      );
      expect(event.preventDefault).not.toHaveBeenCalled();

      handleDesktopMenuShortcut(
        event,
        { type: "keyDown", key: "S", shift: true, ...modifiers },
        win,
        options,
      );

      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(win.webContents.send).toHaveBeenCalledWith(
        DESKTOP_FRONTEND_ACTION_CHANNEL,
        "toggle-sidebar",
      );
    },
  );
  it.each([
    ["undo", "Z", "win32"],
    ["redo", "Y", "win32"],
    ["redo", "Z", "darwin"],
    ["cut", "X", "win32"],
    ["copy", "C", "win32"],
    ["paste", "V", "win32"],
    ["delete", "Delete", "win32"],
    ["select-all", "A", "win32"],
  ] as const)(
    "dispatches %s through the focused editor's keyboard handling on %s (%s)",
    (action, keyCode, platform) => {
      const handlers = new Map();
      const sendInputEvent = vi.fn();
      const win = { webContents: { sendInputEvent } };
      registerDesktopMenu({
        ipcMain: {
          handle: (
            channel: string,
            handler: (event: { sender: object }, action: string) => void,
          ) => handlers.set(channel, handler),
        },
        BrowserWindow: { fromWebContents: (sender: object) => sender },
        app: {},
        windows: new Set([win]),
        createWindow: vi.fn(),
        platform,
      });
      const invoke = handlers.get(DESKTOP_EDIT_ACTION_CHANNEL);

      invoke({ sender: {} }, action);
      invoke({ sender: win }, "reload");
      expect(sendInputEvent).not.toHaveBeenCalled();
      invoke({ sender: win }, action);

      const modifiers =
        action === "delete"
          ? []
          : platform === "darwin"
            ? ["meta", "shift"]
            : ["control"];
      expect(sendInputEvent.mock.calls).toEqual([
        [{ type: "keyDown", keyCode, modifiers }],
        [{ type: "keyUp", keyCode, modifiers }],
      ]);
    },
  );

  it("restricts window commands to registered app windows and closes the sender", () => {
    const handlers = new Map();
    const first = { close: vi.fn() };
    const second = { close: vi.fn() };
    const foreign = { close: vi.fn() };
    const app = { quit: vi.fn() };
    const createWindow = vi.fn();
    registerDesktopMenu({
      ipcMain: {
        handle: (
          channel: string,
          handler: (event: { sender: object }, action: string) => void,
        ) => handlers.set(channel, handler),
      },
      BrowserWindow: { fromWebContents: (sender: object) => sender },
      app,
      windows: new Set([first, second]),
      createWindow,
    });
    const invoke = handlers.get(DESKTOP_WINDOW_ACTION_CHANNEL);

    invoke({ sender: foreign }, "quit");
    invoke({ sender: second }, "close-window");
    invoke({ sender: first }, "new-window");
    invoke({ sender: first }, "quit");

    expect(foreign.close).not.toHaveBeenCalled();
    expect(first.close).not.toHaveBeenCalled();
    expect(second.close).toHaveBeenCalledOnce();
    expect(createWindow).toHaveBeenCalledOnce();
    expect(app.quit).toHaveBeenCalledOnce();
  });

  it.each([
    ["n", "new-conversation", "win32"],
    ["o", "open-workspace", "win32"],
    ["n", "new-conversation", "darwin"],
    [",", "settings", "win32"],
  ])(
    "routes the %s shortcut to the active renderer (%s, %s)",
    (key, action, platform) => {
      const event = { preventDefault: vi.fn() };
      const win = { webContents: { send: vi.fn() }, close: vi.fn() };

      handleDesktopMenuShortcut(
        event,
        {
          type: "keyDown",
          key,
          control: platform === "win32",
          meta: platform === "darwin",
        },
        win,
        { platform, app: { quit: vi.fn() } },
      );

      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(win.webContents.send).toHaveBeenCalledWith(
        DESKTOP_FRONTEND_ACTION_CHANNEL,
        action,
      );
    },
  );

  it("closes only the active window, quits on the quit shortcut, and ignores text/AltGr input", () => {
    const event = { preventDefault: vi.fn() };
    const win = { close: vi.fn(), webContents: { send: vi.fn() } };
    const app = { quit: vi.fn() };
    const options = { platform: "win32", app };
    handleDesktopMenuShortcut(
      event,
      { type: "keyDown", key: "n" },
      win,
      options,
    );
    handleDesktopMenuShortcut(
      event,
      { type: "keyDown", key: "o", control: true, alt: true },
      win,
      options,
    );
    expect(event.preventDefault).not.toHaveBeenCalled();

    handleDesktopMenuShortcut(
      event,
      { type: "keyDown", key: "w", control: true },
      win,
      options,
    );
    handleDesktopMenuShortcut(
      event,
      { type: "keyDown", key: "q", control: true },
      win,
      options,
    );

    expect(win.close).toHaveBeenCalledOnce();
    expect(app.quit).toHaveBeenCalledOnce();
  });
});
