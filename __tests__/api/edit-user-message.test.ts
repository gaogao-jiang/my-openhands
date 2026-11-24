import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetActiveStoreForTests,
  setRegisteredBackends,
  setActiveSelection,
} from "#/api/backend-registry/active-store";
import Service from "#/api/conversation-service/agent-server-conversation-service.api";

const api = vi.hoisted(() => ({
  getConversation: vi.fn(),
  getEvent: vi.fn(),
  navigateConversation: vi.fn(),
  sendEvent: vi.fn(),
  runConversation: vi.fn(),
  forkConversation: vi.fn(),
}));
vi.mock("@openhands/typescript-client/clients", async (importActual) => ({
  ...(await importActual<object>()),
  ConversationClient: vi.fn(function MockClient() {
    return api;
  }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  __resetActiveStoreForTests();
  api.getConversation.mockResolvedValue({
    id: "conv-1",
    leaf_event_id: "old-head",
    execution_status: "finished",
  });
  api.getEvent.mockResolvedValue({ parent_id: "parent" });
  api.navigateConversation.mockResolvedValue({});
  api.sendEvent.mockResolvedValue(undefined);
  api.runConversation.mockResolvedValue(undefined);
});
afterEach(() => __resetActiveStoreForTests());

describe("edit question in the same conversation", () => {
  it("navigates to the parent, saves replacement and runs without a fork", async () => {
    expect(await Service.editUserMessage("conv-1", "question", "Revised")).toBe(
      true,
    );
    expect(api.navigateConversation).toHaveBeenCalledWith("conv-1", {
      event_id: "parent",
    });
    expect(api.sendEvent).toHaveBeenCalledWith(
      "conv-1",
      { role: "user", content: [{ type: "text", text: "Revised" }] },
      { run: false },
    );
    expect(api.runConversation).toHaveBeenCalledWith("conv-1");
    expect(api.forkConversation).not.toHaveBeenCalled();
    expect(api.navigateConversation.mock.invocationCallOrder[0]).toBeLessThan(
      api.sendEvent.mock.invocationCallOrder[0],
    );
    expect(api.sendEvent.mock.invocationCallOrder[0]).toBeLessThan(
      api.runConversation.mock.invocationCallOrder[0],
    );
  });
  it("can edit the first question using an empty HEAD", async () => {
    api.getEvent.mockResolvedValue({ parent_id: null });
    await Service.editUserMessage("conv-1", "question", "Revised");
    expect(api.navigateConversation).toHaveBeenCalledWith("conv-1", {
      event_id: null,
    });
  });
  it("restores the old HEAD if saving fails and does not run", async () => {
    api.sendEvent.mockRejectedValue(new Error("save failed"));
    await expect(
      Service.editUserMessage("conv-1", "question", "Revised"),
    ).rejects.toThrow("save failed");
    expect(api.navigateConversation).toHaveBeenLastCalledWith("conv-1", {
      event_id: "old-head",
    });
    expect(api.runConversation).not.toHaveBeenCalled();
  });
  it("reports a saved question separately when restart fails", async () => {
    api.runConversation.mockRejectedValue(new Error("run failed"));
    expect(await Service.editUserMessage("conv-1", "question", "Revised")).toBe(
      false,
    );
    expect(api.sendEvent).toHaveBeenCalledTimes(1);
    expect(api.navigateConversation).toHaveBeenCalledTimes(1);
  });
  it.each(["running", "waiting_for_confirmation"])(
    "does not rewrite history while %s",
    async (execution_status) => {
      api.getConversation.mockResolvedValue({ execution_status });
      await expect(
        Service.editUserMessage("conv-1", "question", "Revised"),
      ).rejects.toThrow();
      expect(api.navigateConversation).not.toHaveBeenCalled();
    },
  );
  it("rejects blank input before moving history", async () => {
    await expect(
      Service.editUserMessage("conv-1", "question", "  "),
    ).rejects.toThrow();
    expect(api.navigateConversation).not.toHaveBeenCalled();
  });
  it("does not fall back to forking on old servers", async () => {
    api.navigateConversation.mockRejectedValue(new Error("404"));
    await expect(
      Service.editUserMessage("conv-1", "question", "Revised"),
    ).rejects.toThrow("404");
    expect(api.forkConversation).not.toHaveBeenCalled();
    expect(api.sendEvent).not.toHaveBeenCalled();
  });
  it("does not rewrite a cloud conversation", async () => {
    setRegisteredBackends([
      {
        id: "cloud",
        name: "Cloud",
        host: "https://example.com",
        kind: "cloud",
        apiKey: "",
      },
    ]);
    setActiveSelection({ backendId: "cloud" });
    await expect(
      Service.editUserMessage("conv-1", "question", "Revised"),
    ).rejects.toThrow();
    expect(api.navigateConversation).not.toHaveBeenCalled();
  });
});
