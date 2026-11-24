import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeJoraAgentPresets } from "#/api/agent-profiles-service/jora-agent-presets";

const mocks = vi.hoisted(() => ({
  environment: {
    backend: {
      id: "local",
      kind: "local",
      host: "http://local",
      apiKey: "key",
    },
    orgId: null,
  },
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
  llms: vi.fn(),
  catalog: vi.fn(),
  info: vi.fn(),
}));
vi.mock("#/api/backend-registry/active-store", () => ({
  getActiveBackend: () => mocks.environment,
  isNoBackend: () => false,
}));
vi.mock("#/api/agent-server-client-options", () => ({
  getAgentServerClientOptions: (overrides: object) => overrides,
}));
vi.mock("@openhands/typescript-client/clients", () => ({
  SettingsClient: class {
    getSettings = mocks.getSettings;
    updateSettings = mocks.updateSettings;
  },
  AgentProfilesClient: class {
    listAgentProfiles = mocks.list;
    saveAgentProfile = mocks.save;
  },
  ProfilesClient: class {
    listProfiles = mocks.llms;
  },
  ToolClient: class {
    getToolCatalog = mocks.catalog;
  },
  ServerClient: class {
    getServerInfo = mocks.info;
  },
}));

let handled: Record<string, boolean>;
let profiles: { name: string; id: string; agent_kind: string }[];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.environment.backend.kind = "local";
  handled = {};
  profiles = [{ name: "default", id: "default-id", agent_kind: "openhands" }];
  mocks.getSettings.mockImplementation(async () => ({
    misc_settings: { jora_agent_presets: { handled: { ...handled } } },
  }));
  mocks.updateSettings.mockImplementation(async (patch) => {
    Object.assign(handled, patch.misc_settings_diff.jora_agent_presets.handled);
  });
  mocks.list.mockImplementation(async () => ({
    profiles: [...profiles],
    active_agent_profile_id: "custom-active",
  }));
  mocks.save.mockImplementation(async (name) => {
    profiles.push({ name, id: name, agent_kind: "openhands" });
  });
  mocks.llms.mockResolvedValue({
    profiles: [{ name: "team-model", model: "configured-model" }],
    active_profile: "team-model",
  });
  mocks.catalog.mockResolvedValue({
    tools: ["terminal", "file_editor", "glob", "grep", "task_tracker"].map(
      (name) => ({ name, usable: true }),
    ),
  });
  mocks.info.mockResolvedValue({ capabilities: ["profile_persona_v1"] });
});

describe("Jora preset initialization", () => {
  it("creates scoped experts using the configured LLM without saving or activating default", async () => {
    await initializeJoraAgentPresets();
    expect(mocks.save.mock.calls.map(([name]) => name)).toEqual([
      "Jora-Developer",
      "Jora-Reviewer",
      "Jora-Documenter",
    ]);
    for (const [, saved] of mocks.save.mock.calls) {
      expect(saved).toMatchObject({
        agent_kind: "openhands",
        llm_profile_ref: "team-model",
        mcp_server_refs: [],
        secret_refs: [],
        integration_refs: [],
      });
      expect(saved.persona).toEqual(expect.any(String));
      expect(saved.public_skills.length).toBeGreaterThan(0);
    }
    const reviewer = mocks.save.mock.calls.find(
      ([name]) => name === "Jora-Reviewer",
    )![1];
    const reviewTools = reviewer.tools.map(
      (tool: { name: string }) => tool.name,
    );
    expect(reviewTools).toContain("terminal");
    expect(reviewTools).not.toContain("file_editor");
    expect((await mocks.list()).active_agent_profile_id).toBe("custom-active");
  });

  it("preserves namesakes, edited presets and deletions across reloads", async () => {
    profiles.push({
      name: "Jora-Reviewer",
      id: "user-owned",
      agent_kind: "acp",
    });
    await initializeJoraAgentPresets();
    expect(mocks.save).not.toHaveBeenCalledWith(
      "Jora-Reviewer",
      expect.anything(),
    );
    profiles = profiles.filter((p) => p.name !== "Jora-Developer");
    mocks.save.mockClear();
    await initializeJoraAgentPresets();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("retries failed creation while leaving completed and deleted roles alone", async () => {
    mocks.save.mockRejectedValueOnce(new Error("temporary failure"));
    await expect(initializeJoraAgentPresets()).rejects.toThrow(
      "temporary failure",
    );
    expect(handled).toEqual({});
    await initializeJoraAgentPresets();
    expect(profiles).toHaveLength(4);
  });

  it("deduplicates simultaneous initialization", async () => {
    await Promise.all([
      initializeJoraAgentPresets(),
      initializeJoraAgentPresets(),
    ]);
    expect(mocks.save).toHaveBeenCalledTimes(3);
  });

  it("does not recreate a completed role when a later role fails", async () => {
    const save = mocks.save.getMockImplementation()!;
    mocks.save
      .mockImplementationOnce(save)
      .mockRejectedValueOnce(new Error("retry later"));
    await expect(initializeJoraAgentPresets()).rejects.toThrow("retry later");
    profiles = profiles.filter((profile) => profile.name !== "Jora-Developer");
    mocks.save.mockClear();
    await initializeJoraAgentPresets();
    expect(mocks.save.mock.calls.map(([name]) => name)).toEqual([
      "Jora-Reviewer",
      "Jora-Documenter",
    ]);
  });

  it("leaves unsupported servers untouched", async () => {
    mocks.info.mockResolvedValue({ capabilities: [] });
    await initializeJoraAgentPresets();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });

  it("does not provision on Cloud or without a usable LLM", async () => {
    mocks.environment.backend.kind = "cloud";
    await initializeJoraAgentPresets();
    expect(mocks.getSettings).not.toHaveBeenCalled();
    mocks.environment.backend.kind = "local";
    mocks.llms.mockResolvedValue({ profiles: [], active_profile: null });
    await initializeJoraAgentPresets();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });
});
