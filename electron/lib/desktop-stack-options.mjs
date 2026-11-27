/** Resolve the frontend mode used by the Electron-owned local stack. */
export function getDesktopStackOptions(useViteFrontend) {
  return {
    staticMode: !useViteFrontend,
    skipNpmCheck: !useViteFrontend,
    mode: useViteFrontend ? "agent-canvas:desktop-dev" : "agent-canvas",
  };
}
