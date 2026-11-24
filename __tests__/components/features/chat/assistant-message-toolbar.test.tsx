import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantMessageToolbar } from "#/components/features/chat/assistant-message-toolbar";
import { useMessageFeedbackStore } from "#/stores/message-feedback-store";
import { I18nKey } from "#/i18n/declaration";
import { displayErrorToast } from "#/utils/custom-toast-handlers";

vi.mock("#/utils/custom-toast-handlers", () => ({
  displayErrorToast: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "zh-CN" },
  }),
}));

const speak = vi.fn();
const cancel = vi.fn();
const props = {
  message: "Hello from the assistant",
  feedbackKey: "backend/conversation/message",
  isCopy: false,
  onCopy: vi.fn(),
};

describe("AssistantMessageToolbar", () => {
  beforeEach(() => {
    useMessageFeedbackStore.setState({ ratings: {} });
    vi.stubGlobal("speechSynthesis", { speak, cancel });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string;
        lang = "";
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    speak.mockClear();
    cancel.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("copies the answer and exposes branching through the more menu", async () => {
    const user = userEvent.setup();
    const branch = vi.fn();
    render(
      <AssistantMessageToolbar
        {...props}
        actions={[{ icon: <span />, tooltip: "Branch here", onClick: branch }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: I18nKey.BUTTON$COPY }));
    expect(props.onCopy).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("menuitem", { name: "Branch here" }),
    ).not.toBeInTheDocument();
    const more = screen.getByRole("button", {
      name: I18nKey.COMMON$MORE_OPTIONS,
    });
    more.focus();
    await user.keyboard("{Enter}");
    const branchItem = await screen.findByRole("menuitem", {
      name: "Branch here",
    });
    expect(
      screen.queryByRole("menuitem", { name: I18nKey.BUTTON$COPY }),
    ).not.toBeInTheDocument();
    await user.click(branchItem);
    expect(branch).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() => expect(more).toHaveFocus());
  });

  it("dismisses the more menu with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(
      <AssistantMessageToolbar
        {...props}
        actions={[{ icon: <span />, tooltip: "Branch here", onClick: vi.fn() }]}
      />,
    );
    const more = screen.getByRole("button", {
      name: I18nKey.COMMON$MORE_OPTIONS,
    });
    await user.click(more);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() => expect(more).toHaveFocus());
  });

  it("toggles the more menu when its trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <AssistantMessageToolbar
        {...props}
        actions={[{ icon: <span />, tooltip: "Branch here", onClick: vi.fn() }]}
      />,
    );
    const more = screen.getByRole("button", {
      name: I18nKey.COMMON$MORE_OPTIONS,
    });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Branch here" })).toBeVisible();
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() => expect(more).not.toHaveAttribute("data-focus-visible"));
  });

  it("does not render an inactive more button without actions", () => {
    render(<AssistantMessageToolbar {...props} />);

    expect(
      screen.queryByRole("button", {
        name: I18nKey.COMMON$MORE_OPTIONS,
      }),
    ).not.toBeInTheDocument();
  });

  it("retains a visible focus indicator for keyboard navigation", async () => {
    const user = userEvent.setup();
    render(
      <AssistantMessageToolbar
        {...props}
        actions={[{ icon: <span />, tooltip: "Branch here", onClick: vi.fn() }]}
      />,
    );
    const more = screen.getByRole("button", {
      name: I18nKey.COMMON$MORE_OPTIONS,
    });
    while (document.activeElement !== more) await user.tab();
    expect(more).toHaveAttribute("data-focus-visible");
  });

  it("saves, replaces and clears local feedback across remounts without affecting another message", async () => {
    const user = userEvent.setup();
    const getFeedbackPaths = () =>
      [I18nKey.CHAT_INTERFACE$HELPFUL, I18nKey.CHAT_INTERFACE$NOT_HELPFUL].map(
        (name) =>
          screen.getByRole("button", { name }).querySelector("svg")!.innerHTML,
      );
    const view = render(<AssistantMessageToolbar {...props} />);
    const outlinePaths = getFeedbackPaths();
    await user.click(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$HELPFUL }),
    );
    const helpfulPaths = getFeedbackPaths();
    expect(helpfulPaths[0]).not.toBe(outlinePaths[0]);
    expect(helpfulPaths[1]).toBe(outlinePaths[1]);
    expect(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$HELPFUL }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$NOT_HELPFUL }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(useMessageFeedbackStore.getState().ratings[props.feedbackKey]).toBe(
      "helpful",
    );
    view.unmount();
    const savedFeedback = localStorage.getItem("message-feedback")!;
    useMessageFeedbackStore.setState({ ratings: {} });
    localStorage.setItem("message-feedback", savedFeedback);
    await useMessageFeedbackStore.persist.rehydrate();
    render(<AssistantMessageToolbar {...props} />);
    expect(getFeedbackPaths()).toEqual(helpfulPaths);
    expect(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$HELPFUL }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$NOT_HELPFUL }),
    );
    expect(getFeedbackPaths()[0]).toBe(outlinePaths[0]);
    expect(getFeedbackPaths()[1]).not.toBe(outlinePaths[1]);
    expect(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$HELPFUL }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$NOT_HELPFUL }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(useMessageFeedbackStore.getState().ratings[props.feedbackKey]).toBe(
      "not-helpful",
    );
    await user.click(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$NOT_HELPFUL }),
    );
    expect(getFeedbackPaths()).toEqual(outlinePaths);
    expect(
      useMessageFeedbackStore.getState().ratings[props.feedbackKey],
    ).toBeUndefined();
    useMessageFeedbackStore.getState().setRating("another-message", "helpful");
    expect(
      useMessageFeedbackStore.getState().ratings[props.feedbackKey],
    ).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem("message-feedback")!).state.ratings[
        "another-message"
      ],
    ).toBe("helpful");
  });

  it("reads the answer, replaces playback in another row, and stops on completion or unmount", async () => {
    const user = userEvent.setup();
    const view = render(
      <>
        <AssistantMessageToolbar {...props} />
        <AssistantMessageToolbar
          {...props}
          feedbackKey="second"
          message="Second reply"
        />
      </>,
    );
    await user.click(
      screen.getAllByRole("button", {
        name: I18nKey.CHAT_INTERFACE$READ_ALOUD,
      })[0],
    );
    const first = speak.mock.calls[0][0];
    expect(first).toMatchObject({ text: props.message, lang: "zh-CN" });
    await user.click(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$READ_ALOUD }),
    );
    expect(cancel).toHaveBeenCalledOnce();
    act(() => first.onend());
    expect(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$STOP_READING }),
    ).toBeInTheDocument();
    act(() => speak.mock.calls[1][0].onend());
    expect(
      screen.queryByRole("button", {
        name: I18nKey.CHAT_INTERFACE$STOP_READING,
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", {
        name: I18nKey.CHAT_INTERFACE$READ_ALOUD,
      })[0],
    );
    await user.click(
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$STOP_READING }),
    );
    expect(cancel).toHaveBeenCalledTimes(2);
    await user.click(
      screen.getAllByRole("button", {
        name: I18nKey.CHAT_INTERFACE$READ_ALOUD,
      })[0],
    );
    view.unmount();
    expect(cancel).toHaveBeenCalledTimes(3);
  });

  it("disables reading on unsupported browsers and unfinished replies", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    const view = render(<AssistantMessageToolbar {...props} />);
    expect(
      screen.getByRole("button", {
        name: I18nKey.CHAT_INTERFACE$READ_ALOUD_UNAVAILABLE,
      }),
    ).toBeDisabled();
    view.rerender(<AssistantMessageToolbar {...props} isStreaming />);
    expect(
      screen.getByRole("button", {
        name: I18nKey.CHAT_INTERFACE$HELPFUL,
      }),
    ).toBeDisabled();
  });

  it("closes a menu with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(
      <div data-agent-server-ui>
        <AssistantMessageToolbar
          {...props}
          actions={[
            { icon: <span />, tooltip: "Branch here", onClick: vi.fn() },
          ]}
        />
      </div>,
    );
    const more = screen.getByRole("button", {
      name: I18nKey.COMMON$MORE_OPTIONS,
    });
    await user.click(more);
    expect(
      (await screen.findByRole("menu")).closest("[data-agent-server-ui]"),
    ).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() => expect(more).toHaveFocus());
  });

  it("reports speech errors and allows another attempt", async () => {
    const user = userEvent.setup();
    render(<AssistantMessageToolbar {...props} />);
    const read = () =>
      screen.getByRole("button", { name: I18nKey.CHAT_INTERFACE$READ_ALOUD });
    await user.click(read());
    act(() => speak.mock.calls[0][0].onerror({ error: "synthesis-failed" }));
    expect(displayErrorToast).toHaveBeenCalledWith(
      I18nKey.CHAT_INTERFACE$READ_ALOUD_FAILED,
    );
    expect(read()).toBeEnabled();
    speak.mockImplementationOnce(() => {
      throw new Error("Speech engine unavailable");
    });
    await user.click(read());
    expect(read()).toBeEnabled();
  });
});
