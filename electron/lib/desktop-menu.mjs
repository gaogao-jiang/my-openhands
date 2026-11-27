export const DESKTOP_WINDOW_ACTION_CHANNEL = "window:menu-action";
export const DESKTOP_FRONTEND_ACTION_CHANNEL = "window:frontend-menu-action";
export const DESKTOP_EDIT_ACTION_CHANNEL = "window:edit-action";

export function registerDesktopMenu({
  ipcMain,
  BrowserWindow,
  app,
  windows,
  createWindow,
  platform = process.platform,
}) {
  ipcMain.handle(DESKTOP_WINDOW_ACTION_CHANNEL, (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!windows.has(win)) return;
    if (action === "new-window") createWindow();
    else if (action === "close-window") win.close();
    else if (action === "quit") app.quit();
    else if (action === "about") app.showAboutPanel();
  });
  ipcMain.handle(DESKTOP_EDIT_ACTION_CHANNEL, (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!windows.has(win) || typeof action !== "string") return;
    const keys = {
      undo: "Z",
      redo: platform === "darwin" ? "Z" : "Y",
      cut: "X",
      copy: "C",
      paste: "V",
      delete: "Delete",
      "select-all": "A",
    };
    if (!Object.hasOwn(keys, action)) return;
    const modifiers =
      action === "delete" ? [] : [platform === "darwin" ? "meta" : "control"];
    if (action === "redo" && platform === "darwin") modifiers.push("shift");
    // Native input reaches both browser editors and JS editors such as Monaco.
    const keyCode = keys[action];
    win.webContents.sendInputEvent({ type: "keyDown", keyCode, modifiers });
    win.webContents.sendInputEvent({ type: "keyUp", keyCode, modifiers });
  });
}

export function handleDesktopMenuShortcut(
  event,
  input,
  win,
  { platform, app },
) {
  const modifier = platform === "darwin" ? input.meta : input.control;
  if (input.type !== "keyDown" || !modifier || input.alt) return false;
  const key = input.key.toLowerCase();
  if (input.shift) {
    if (key !== "s") return false;
    event.preventDefault();
    win.webContents.send(DESKTOP_FRONTEND_ACTION_CHANNEL, "toggle-sidebar");
    return true;
  }
  if (key === "n" || key === "o" || key === ",") {
    event.preventDefault();
    win.webContents.send(
      DESKTOP_FRONTEND_ACTION_CHANNEL,
      key === "n"
        ? "new-conversation"
        : key === "o"
          ? "open-workspace"
          : "settings",
    );
  } else if (key === "w") {
    event.preventDefault();
    win.close();
  } else if (key === "q") {
    event.preventDefault();
    app.quit();
  } else return false;
  return true;
}
