import { describe, expect, it, vi } from "vitest";
import { getAgentProfileDisplayName } from "#/utils/agent-profile-display-name";

const backend = vi.hoisted(() => ({ kind: "local" }));
vi.mock("#/api/backend-registry/active-store", () => ({
  getActiveBackend: () => ({ backend }),
}));

describe("agent profile display identity", () => {
  it("preserves Cloud, ACP and custom profile names", () => {
    backend.kind = "cloud";
    expect(
      getAgentProfileDisplayName({ name: "default", agent_kind: "openhands" }),
    ).toBe("default");
    backend.kind = "local";
    expect(
      getAgentProfileDisplayName({ name: "default", agent_kind: "acp" }),
    ).toBe("default");
    expect(
      getAgentProfileDisplayName({
        name: "My reviewer",
        agent_kind: "openhands",
      }),
    ).toBe("My reviewer");
  });
});
