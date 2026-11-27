// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getDesktopStackOptions } from "../../electron/lib/desktop-stack-options.mjs";

describe("Electron desktop stack options", () => {
  it("uses Vite for the renderer development client", () => {
    expect(getDesktopStackOptions(true)).toEqual({
      staticMode: false,
      skipNpmCheck: false,
      mode: "agent-canvas:desktop-dev",
    });
  });

  it("keeps the standard desktop client on its built static frontend", () => {
    expect(getDesktopStackOptions(false)).toEqual({
      staticMode: true,
      skipNpmCheck: true,
      mode: "agent-canvas",
    });
  });
});
