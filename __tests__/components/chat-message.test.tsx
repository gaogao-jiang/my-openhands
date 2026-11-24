import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import util from "util";
import { ChatMessage } from "#/components/features/chat/chat-message";
import { RowExpansionContext } from "#/components/features/chat/row-expansion-context";
import { useMessageExpansionStore } from "#/stores/message-expansion-store";

describe("ChatMessage", () => {
  it.each(["user", "agent"] as const)(
    "uses themed tooltip colors for %s message actions",
    async (type) => {
      const user = userEvent.setup();
      render(<ChatMessage type={type} message="Hello" showActions />);
      await user.tab();
      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveClass("!bg-tertiary", "!text-foreground");
      expect(tooltip).not.toHaveClass(
        "!bg-contrast",
        "!text-contrast-foreground",
      );
    },
  );

  it("uses the same copy icon for user and assistant messages", () => {
    const { rerender } = render(<ChatMessage type="user" message="Hello" />);
    const userIcon = screen
      .getByTestId("copy-to-clipboard")
      .querySelector("svg");
    expect(userIcon).toBeInTheDocument();
    const iconMarkup = userIcon!.outerHTML;

    rerender(<ChatMessage type="agent" message="Hello" />);
    expect(
      screen.getByTestId("copy-to-clipboard").querySelector("svg")?.outerHTML,
    ).toBe(iconMarkup);
  });

  it.each([
    { isFinalReply: false, isStreaming: false },
    { isFinalReply: true, isStreaming: true },
  ])("omits the footer for unfinished replies: %j", async (state) => {
    const user = userEvent.setup();
    render(
      <ChatMessage
        type="agent"
        message="Checking the presentation layout"
        {...state}
        timestamp="2026-11-23T05:56:00Z"
        showActions
        feedbackKey="progress"
      />,
    );
    const message = screen.getByTestId("agent-message");
    await user.hover(message);
    await user.unhover(message);
    await user.tab();
    expect(message).toHaveTextContent("Checking the presentation layout");
    expect(
      screen.queryByTestId("assistant-message-actions"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("message-timestamp")).not.toBeInTheDocument();
    expect(within(message).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a streaming cursor only while an agent reply is being generated", () => {
    const { rerender } = render(
      <ChatMessage type="agent" message="正在生成" isStreaming />,
    );
    expect(screen.getByTestId("streaming-cursor")).toBeInTheDocument();

    rerender(<ChatMessage type="agent" message="已完成" isStreaming={false} />);
    expect(screen.queryByTestId("streaming-cursor")).not.toBeInTheDocument();
  });

  it("keeps agent actions in a reserved footer instead of overlaying the answer", async () => {
    render(
      <ChatMessage
        type="agent"
        showActions
        message="A long answer that must remain readable."
        timestamp={new Date().toISOString()}
        actions={[
          {
            icon: <span>Action</span>,
            tooltip: "Inspect answer",
            onClick: vi.fn(),
          },
        ]}
      />,
    );
    const message = screen.getByTestId("agent-message");
    fireEvent.mouseEnter(message);
    const more = screen.getByRole("button", { name: "COMMON$MORE_OPTIONS" });
    const toolbar = more.parentElement?.parentElement;
    expect(toolbar).toHaveClass("order-last", "min-h-7", "w-full");
    expect(toolbar).not.toHaveClass("absolute", "invisible");
    const timestamp = screen.getByTestId("message-timestamp");
    const copy = screen.getByTestId("copy-to-clipboard");
    const branch = more;
    expect(toolbar).toContainElement(copy);
    expect(toolbar).toContainElement(branch);
    expect(toolbar).toContainElement(timestamp);
    expect(
      copy.compareDocumentPosition(branch) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      branch.compareDocumentPosition(timestamp) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(timestamp).toHaveClass("static", "text-left", "text-muted");
    expect(copy).toBeVisible();
    expect(timestamp).toBeVisible();
    fireEvent.mouseLeave(message);
    expect(toolbar).not.toHaveClass("invisible", "hidden");
    expect(screen.getByTestId("copy-to-clipboard")).toBeVisible();
    expect(timestamp).toHaveClass("pointer-events-none", "opacity-0");
  });

  it.each(["user", "agent"] as const)(
    "shows the clock for %s only on hover",
    async (type) => {
      const user = userEvent.setup();
      const timestamp = "2026-04-16T19:32:29.828Z";
      const clockTime = new Date(timestamp).toLocaleTimeString("en", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Shanghai",
      });
      const exact = new Date(timestamp).toLocaleString("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Shanghai",
      });
      render(<ChatMessage type={type} message="Hello" timestamp={timestamp} />);
      const message = screen.getByTestId(`${type}-message`);
      expect(screen.getByTestId("message-timestamp")).toHaveClass(
        "pointer-events-none",
        "opacity-0",
      );
      await user.hover(message);
      const label = screen.getByRole("button", { name: exact });
      expect(label).toHaveTextContent(clockTime);
      await user.hover(label);
      expect(await screen.findByRole("tooltip")).toHaveTextContent(exact);
      await user.unhover(message);
      expect(screen.getByTestId("message-timestamp")).toHaveClass("opacity-0");
    },
  );

  it("reveals historical actions on hover and keyboard focus while keeping the newest actions visible", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ChatMessage type="agent" message="Earlier reply" showActions={false} />,
    );
    const message = screen.getByTestId("agent-message");
    const copy = screen.getByTestId("copy-to-clipboard");
    expect(screen.getByTestId("assistant-message-actions")).toHaveClass(
      "opacity-0",
      "pointer-events-none",
    );
    await user.hover(message);
    expect(screen.getByTestId("assistant-message-actions")).not.toHaveClass(
      "opacity-0",
    );
    await user.unhover(message);
    expect(screen.getByTestId("assistant-message-actions")).toHaveClass(
      "opacity-0",
      "pointer-events-none",
    );
    await user.tab();
    expect(copy).toHaveFocus();
    expect(screen.getByTestId("assistant-message-actions")).not.toHaveClass(
      "opacity-0",
    );
    await user.tab();
    expect(screen.getByTestId("assistant-message-actions")).toHaveClass(
      "opacity-0",
      "pointer-events-none",
    );
    rerender(<ChatMessage type="agent" message="Newest reply" showActions />);
    expect(screen.getByTestId("assistant-message-actions")).not.toHaveClass(
      "opacity-0",
    );
  });

  it("makes the exact timestamp available to keyboard focus", async () => {
    const timestamp = "2026-04-16T19:32:29.828Z";
    const expected = new Date(timestamp).toLocaleString("en", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    render(<ChatMessage type="agent" message="Hello" timestamp={timestamp} />);
    const button = screen.getByRole("button", { name: expected });
    const user = userEvent.setup();
    // Copy precedes the timestamp; unavailable actions are disabled.
    await user.tab();
    await user.tab();
    expect(button).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(expected);
  });

  it.each([undefined, "not-a-date"])(
    "does not fabricate a timestamp for %s",
    (timestamp) => {
      render(<ChatMessage type="user" message="Hello" timestamp={timestamp} />);
      expect(screen.queryByTestId("message-timestamp")).not.toBeInTheDocument();
    },
  );

  it.each(["sending", "error"] as const)(
    "keeps the timestamp out of %s feedback",
    (pendingStatus) => {
      render(
        <ChatMessage
          type="user"
          message="Hello"
          timestamp="2026-11-02T11:30:00Z"
          pendingStatus={pendingStatus}
        />,
      );
      fireEvent.mouseEnter(screen.getByTestId("user-message"));
      expect(screen.queryByTestId("message-timestamp")).not.toBeInTheDocument();
      expect(
        screen.getByTestId(
          pendingStatus === "error"
            ? "chat-message-error"
            : "chat-message-sending",
        ),
      ).toBeInTheDocument();
    },
  );

  it("does not update the parent while measuring user-message truncation", async () => {
    // Regression test for the React warning:
    //   "Cannot update a component (`ChatMessage`) while rendering a different
    //    component (`UserMessageBody`)"
    // The bug: UserMessageBody notified the parent (ChatMessage's
    // setIsTruncatable) from inside its own render-phase state updater, which
    // updates the parent while the child is rendering.
    //
    // Two conditions are needed to make the warning observable here — they are
    // present in a real browser but hidden by the default test setup:
    //   1. A ResizeObserver that actually fires its callback. The shared mock's
    //      `observe` is a no-op, so truncation is only ever measured once and
    //      React's eager-state bailout swallows the render-phase update.
    //   2. A measured height that changes between measurements. We model the
    //      realistic settling: the content overflows on first measure, then
    //      shrinks once `line-clamp` is applied. The second (render-phase)
    //      measurement therefore produces a real state transition, defeating
    //      the eager-state bailout so the buggy parent update actually runs.
    class FiringResizeObserver {
      private cb: ResizeObserverCallback;

      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }

      // The real ResizeObserver invokes the callback once shortly after observe.
      observe = () => this.cb([], this as unknown as ResizeObserver);

      unobserve = () => {};

      disconnect = () => {};
    }

    let measurements = 0;
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight",
    );
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        measurements += 1;
        // Overflow on the first measure (truncatable), shrink afterwards.
        return measurements <= 1 ? 1000 : 0;
      },
    });

    const previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver =
      FiringResizeObserver as unknown as typeof ResizeObserver;

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    // No newlines and below the length threshold, so truncation depends only
    // on the measured height rather than length / newline heuristics.
    const message = "word ".repeat(20).trim();

    try {
      render(<ChatMessage type="user" message={message} />);

      await waitFor(() => {
        expect(screen.getByTestId("user-message")).toBeInTheDocument();
      });

      // Guard against the test becoming vacuous: truncation must have been
      // measured more than once for the render-phase update to be reachable.
      expect(measurements).toBeGreaterThan(1);

      const renderPhaseWarning = consoleError.mock.calls.find((args) =>
        util
          .format(...(args as [unknown, ...unknown[]]))
          .includes(
            "Cannot update a component (`ChatMessage`) while rendering a different component (`UserMessageBody`)",
          ),
      );
      expect(renderPhaseWarning).toBeUndefined();
    } finally {
      consoleError.mockRestore();
      globalThis.ResizeObserver = previousResizeObserver;
      if (originalScrollHeight) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollHeight",
          originalScrollHeight,
        );
      } else {
        // @ts-expect-error -- remove our override to restore the jsdom default
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  });

  it("should render a user message", () => {
    render(<ChatMessage type="user" message="Hello, World!" />);
    expect(screen.getByTestId("user-message")).toBeInTheDocument();
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });

  it("does not leave a truncation entry behind when a streamed message changes", () => {
    // Inside the virtualized list the row's "view more" state is persisted by
    // row key. A streamed reply's text changes on every reveal tick, and the
    // reset must clear the entry rather than write `false` — otherwise every
    // streaming message leaves a meaningless `false` entry in the store.
    useMessageExpansionStore.setState({ expanded: {} });
    const rowKey = "single-row";
    const renderInRow = (message: string) => (
      <RowExpansionContext.Provider value={rowKey}>
        <ChatMessage type="agent" message={message} isStreaming />
      </RowExpansionContext.Provider>
    );
    const { rerender } = render(renderInRow("first"));

    rerender(renderInRow("first second"));

    expect(useMessageExpansionStore.getState().expanded).toEqual({});
  });

  it("blends wide-table fades into the user bubble, not the page", () => {
    render(<ChatMessage type="user" message="Hello" />);
    // The bubble sets the fade colour its Markdown tables inherit.
    expect(screen.getByTestId("user-message")).toHaveClass(
      "bg-tertiary",
      "scroll-fade-tertiary",
    );
  });

  it("leaves agent replies on the page fade colour", () => {
    render(<ChatMessage type="agent" message="Hello" />);
    expect(screen.getByTestId("agent-message")).not.toHaveClass(
      "scroll-fade-tertiary",
    );
  });

  it("should support code syntax highlighting", () => {
    const code = "```js\nconsole.log('Hello, World!')\n```";
    render(<ChatMessage type="user" message={code} />);

    // SyntaxHighlighter breaks the code blocks into "tokens"
    expect(screen.getByText("console")).toBeInTheDocument();
    expect(screen.getByText("log")).toBeInTheDocument();
    expect(screen.getByText("'Hello, World!'")).toBeInTheDocument();
  });

  it("places a muted time-copy-edit row below the user bubble", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <ChatMessage
        type="user"
        message="Hello, World!"
        timestamp="2026-11-20T05:59:00Z"
        onEdit={onEdit}
      />,
    );
    const message = screen.getByTestId("user-message");
    const toolbar = screen.getByTestId("user-message-actions");
    const timestamp = screen.getByTestId("message-timestamp");
    const copy = screen.getByTestId("copy-to-clipboard");
    const edit = screen.getByTestId("edit-user-message");

    expect(toolbar).toHaveClass("absolute", "top-full", "right-0", "gap-2");
    expect(toolbar).toHaveClass("opacity-0", "pointer-events-none");
    expect(timestamp).toHaveClass("static", "opacity-0");
    expect(copy).toBeVisible();
    expect(edit).toBeVisible();
    expect(copy).toHaveClass("bg-transparent", "border-0", "text-muted");
    expect(edit).toHaveClass("bg-transparent", "border-0", "text-muted");
    expect(
      timestamp.compareDocumentPosition(copy) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      copy.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.hover(message);
    expect(timestamp).toHaveClass("opacity-100");
    expect(toolbar).not.toHaveClass("opacity-0");
    await user.unhover(message);
    expect(toolbar).toHaveClass("opacity-0", "pointer-events-none");
    await user.hover(message);
    await user.click(edit);
    expect(onEdit).not.toHaveBeenCalled();
    const input = screen.getByRole("textbox", { name: "BUTTON$EDIT" });
    expect(input).toHaveValue("Hello, World!");
    await user.clear(input);
    await user.type(input, "Revised question");
    await user.click(
      screen.getByRole("button", {
        name: "CHAT_INTERFACE$EDIT_SEND",
      }),
    );
    expect(onEdit).toHaveBeenCalledWith("Revised question");
  });

  it("cancels an inline edit without changing the question", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ChatMessage type="user" message="Original" onEdit={onEdit} />);
    await user.hover(screen.getByTestId("user-message"));
    await user.click(screen.getByTestId("edit-user-message"));
    await user.type(screen.getByRole("textbox"), " changes");
    await user.click(screen.getByRole("button", { name: "BUTTON$CANCEL" }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("keeps failed edits open for retry", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockRejectedValue(new Error("failed"));
    render(<ChatMessage type="user" message="Original" onEdit={onEdit} />);
    await user.hover(screen.getByTestId("user-message"));
    await user.click(screen.getByTestId("edit-user-message"));
    await user.clear(screen.getByRole("textbox"));
    expect(
      screen.getByRole("button", {
        name: "CHAT_INTERFACE$EDIT_SEND",
      }),
    ).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "Revised");
    await user.click(
      screen.getByRole("button", {
        name: "CHAT_INTERFACE$EDIT_SEND",
      }),
    );
    expect(screen.getByRole("textbox")).toHaveValue("Revised");
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("disables editing while an edit is in flight", () => {
    render(
      <ChatMessage type="user" message="Hello" onEdit={vi.fn()} editDisabled />,
    );
    expect(screen.getByTestId("edit-user-message")).toBeDisabled();
  });

  it.each(["sending", "error"] as const)(
    "does not edit a %s user message",
    (pendingStatus) => {
      render(
        <ChatMessage
          type="user"
          message="Hello"
          onEdit={vi.fn()}
          pendingStatus={pendingStatus}
        />,
      );
      expect(screen.queryByTestId("edit-user-message")).not.toBeInTheDocument();
    },
  );

  it("should copy content to clipboard", async () => {
    const user = userEvent.setup();
    render(<ChatMessage type="user" message="Hello, World!" />);
    const copyToClipboardButton = screen.getByTestId("copy-to-clipboard");

    await user.click(copyToClipboardButton);

    await waitFor(() =>
      expect(navigator.clipboard.readText()).resolves.toBe("Hello, World!"),
    );
  });

  it("should render a component passed as a prop", () => {
    function Component() {
      return <div data-testid="custom-component">Custom Component</div>;
    }
    render(
      <ChatMessage type="user" message="Hello, World">
        <Component />
      </ChatMessage>,
    );
    expect(screen.getByTestId("custom-component")).toBeInTheDocument();
  });

  it("should apply correct styles to inline code", () => {
    render(
      <ChatMessage type="agent" message="Here is some `inline code` text" />,
    );
    const codeElement = screen.getByText("inline code");

    expect(codeElement.tagName.toLowerCase()).toBe("code");
    expect(codeElement.closest("article")).not.toBeNull();
  });

  it.each([undefined, "sending", "error"] as const)(
    "keeps long user messages expandable with status %s",
    async (pendingStatus) => {
      const longMessage = `${"Here's a long message. ".repeat(40)}`.trim();
      render(
        <ChatMessage
          type="user"
          message={longMessage}
          pendingStatus={pendingStatus}
        />,
      );

      expect(
        screen.getByText(longMessage).closest(".line-clamp-5"),
      ).not.toBeNull();
      expect(
        screen.getByTestId("chat-message-truncation-gradient"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("chat-message-view-more")).toHaveClass(
        "opacity-0",
      );

      fireEvent.mouseEnter(screen.getByTestId("user-message"));
      expect(screen.getByTestId("chat-message-view-more")).toHaveClass(
        "opacity-100",
      );

      fireEvent.click(screen.getByTestId("chat-message-expand"));
      expect(
        screen.queryByTestId("chat-message-truncation-gradient"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("chat-message-view-more"),
      ).not.toBeInTheDocument();
    },
  );

  it("shows a stop control for a sending user message and calls onStop when clicked", () => {
    const onStop = vi.fn();
    render(
      <ChatMessage
        type="user"
        message="Working on it"
        pendingStatus="sending"
        onStop={onStop}
      />,
    );

    expect(screen.getByTestId("chat-message-sending")).toBeInTheDocument();
    const stopButton = screen.getByTestId("chat-message-stop");

    // The stop control only becomes interactive once the bubble is hovered.
    fireEvent.mouseEnter(screen.getByTestId("user-message"));
    fireEvent.click(stopButton);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows retry and dismiss controls for a failed user message", async () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ChatMessage
        type="user"
        message="Failed to deliver"
        pendingStatus="error"
        onRetry={onRetry}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByTestId("chat-message-error")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("chat-message-retry"));
    fireEvent.click(screen.getByTestId("chat-message-dismiss"));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders a literal angle-bracket user message as visible text", () => {
    // Regression: user messages were rendered with raw-HTML parsing enabled,
    // so a message like "<something>" was parsed as an unknown HTML tag and
    // dropped by rehype-sanitize — leaving an empty bubble that looked like
    // nothing was sent. User input must render literally.
    const { container } = render(
      <ChatMessage type="user" message="<something>" />,
    );

    expect(screen.getByTestId("user-message")).toBeInTheDocument();
    // The angle-bracket text must survive verbatim...
    expect(container.textContent).toContain("<something>");
    // ...and must NOT have been parsed into an element.
    expect(container.querySelector("something")).toBeNull();
  });

  it("renders literal angle-bracket text in a sending user message", () => {
    const { container } = render(
      <ChatMessage type="user" message="<something>" pendingStatus="sending" />,
    );

    expect(container.textContent).toContain("<something>");
    expect(container.querySelector("something")).toBeNull();
  });

  it("still parses inline HTML for agent messages", () => {
    // The fix is scoped to user input: agent output keeps raw-HTML parsing so
    // allowed inline tags (badges, <mark>, <details>, …) continue to render.
    const { container } = render(
      <ChatMessage type="agent" message="Hello <mark>world</mark>" />,
    );

    expect(container.querySelector("mark")?.textContent).toBe("world");
  });
});
