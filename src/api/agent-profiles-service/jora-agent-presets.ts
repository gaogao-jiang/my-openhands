import {
  AgentProfilesClient,
  ProfilesClient,
  ServerClient,
  SettingsClient,
  ToolClient,
} from "@openhands/typescript-client/clients";
import type { AgentProfileSaveInput } from "@openhands/typescript-client";
import type { Backend } from "#/api/backend-registry/types";
import {
  getActiveBackend,
  isNoBackend,
} from "#/api/backend-registry/active-store";
import { getAgentServerClientOptions } from "#/api/agent-server-client-options";
import { CATALOG_SKILL_NAMES } from "#/utils/skill-enablement";
import { JORA_EXPERT_NAMES } from "#/utils/agent-profile-display-name";

const PRESET_SETTINGS_KEY = "jora_agent_presets";
const PROFILE_PERSONA_CAPABILITY = "profile_persona_v1";
const pending = new Map<string, Promise<boolean>>();

const PRESETS = [
  {
    name: "Jora-Developer",
    tools: ["terminal", "file_editor", "glob", "grep", "task_tracker"],
    skills: ["qa-changes", "security"],
    persona: `You are Jora Developer, an implementation specialist. Understand the task, relevant code and repository instructions before editing. Make the smallest changes needed, add focused behavioral tests as required by the project, and run appropriate checks. Avoid unrelated refactoring. Report the changes, actual validation results and unresolved issues. Never describe a check you did not run as passing. Work only within the user's authorized scope and the runtime's permissions. Do not claim that you can automatically invoke other experts.`,
  },
  {
    name: "Jora-Reviewer",
    tools: ["terminal", "glob", "grep"],
    skills: ["code-review", "security"],
    persona: `You are Jora Reviewer, an independent code review specialist. Review by default; do not fix files. Establish the exact diff, commit range and relevant context before drawing conclusions. Focus on correctness, regressions, security, compatibility and missing tests. For each actionable finding, provide severity, file location, triggering conditions, concrete impact and supporting evidence. Separate confirmed problems from questions needing verification. Do not invent findings to meet a quota. If no problems are found, state the inspected scope and verification limits. If asked to fix code, explain that implementation needs a suitably authorized agent or configuration; do not silently expand your permissions. Do not claim a read-only sandbox: tool selection and these instructions are not a filesystem security boundary.`,
  },
  {
    name: "Jora-Documenter",
    tools: ["file_editor", "glob", "grep"],
    skills: ["technical-writing", "evidence-based-citations"],
    persona: `You are Jora Documenter, a documentation specialist. Ground documentation in the current source, configuration and actual verification evidence. Follow the repository's documentation structure and language conventions. Distinguish implemented behavior, proposed designs and unverified assumptions. Never invent endpoints, parameters, features or test results. By default, edit only documentation relevant to the request, leaving application code alone. Report the documents changed, their sources and remaining uncertainties. Document-only editing is a workflow instruction, not a runtime-enforced directory restriction. Do not claim automatic delegation or permissions the runtime does not enforce.`,
  },
] as const satisfies readonly {
  name: keyof typeof JORA_EXPERT_NAMES;
  tools: readonly string[];
  skills: readonly string[];
  persona: string;
}[];

/**
 * Owns only misc_settings.jora_agent_presets.handled and newly created profiles.
 * Existing names and completed roles are never written again, including after deletion.
 * Clients are bound before awaiting, so switching backends cannot redirect a write.
 */
export function initializeJoraAgentPresets(
  backend: Backend = getActiveBackend().backend,
): Promise<boolean> {
  if (backend.kind !== "local" || isNoBackend(backend))
    return Promise.resolve(false);
  const options = getAgentServerClientOptions({
    host: backend.host,
    apiKey: backend.apiKey,
  });
  const key = `${backend.host}:${backend.id}:${backend.connectionRevision ?? 0}`;
  const running = pending.get(key);
  if (running) return running;

  const initialize = async () => {
    const settings = new SettingsClient(options);
    const response = await settings.getSettings();
    const state = response.misc_settings?.[PRESET_SETTINGS_KEY] as
      { handled?: Record<string, boolean> } | undefined;
    const handled = { ...state?.handled };
    if (PRESETS.every((preset) => handled[preset.name] === true)) return false;

    // Persona is optional in the wider app. Do not offer these presets where it is ignored.
    const info = (await new ServerClient(options).getServerInfo()) as {
      capabilities?: string[];
    };
    if (!info.capabilities?.includes(PROFILE_PERSONA_CAPABILITY)) return false;
    const agents = new AgentProfilesClient(options);
    // Listing agents also lets the server backfill legacy LLM profiles before reading them.
    await agents.listAgentProfiles();
    const llms = await new ProfilesClient(options).listProfiles();
    const llm =
      llms.profiles.find((profile) => profile.name === llms.active_profile) ??
      llms.profiles[0];
    if (!llm?.name || !llm.model?.trim()) return false;
    const { tools } = await new ToolClient(options).getToolCatalog();
    const usable = new Set(
      tools.filter((tool) => tool.usable).map((tool) => tool.name),
    );
    if (
      !usable.has("glob") ||
      !usable.has("grep") ||
      !usable.has("file_editor") ||
      !usable.has("terminal")
    )
      return false;

    for (const preset of PRESETS) {
      if (handled[preset.name] === true) continue;
      // Refresh before each upsert: never overwrite a profile observed under this name.
      const existing = await agents.listAgentProfiles();
      if (
        !existing.profiles.some(
          (profile) =>
            profile.name === preset.name ||
            profile.name === JORA_EXPERT_NAMES[preset.name],
        )
      ) {
        const profile: AgentProfileSaveInput = {
          agent_kind: "openhands",
          llm_profile_ref: llm.name,
          persona: preset.persona,
          tools: preset.tools
            .filter((name) => usable.has(name))
            .map((name) => ({ name, params: {} })),
          public_skills: preset.skills.filter((name) =>
            CATALOG_SKILL_NAMES.includes(name),
          ),
          mcp_server_refs: [],
          secret_refs: [],
          integration_refs: [],
          enable_classify_and_switch_llm_tool: false,
        };
        await agents.saveAgentProfile(preset.name, profile);
      }
      handled[preset.name] = true;
      await settings.updateSettings({
        misc_settings_diff: { [PRESET_SETTINGS_KEY]: { handled } },
      });
    }
    return true;
  };
  // Web Locks serialize same-origin tabs; the map also deduplicates embedded consumers.
  const task = (
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(
          `${PRESET_SETTINGS_KEY}:${backend.host}`,
          initialize,
        )
      : initialize()
  ).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
