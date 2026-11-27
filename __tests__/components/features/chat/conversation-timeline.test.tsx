import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversationTimeline } from "#/components/features/chat/conversation-timeline";
import { I18nKey } from "#/i18n/declaration";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("ConversationTimeline", () => {
  it("shows one marker per visible row and identifies the current row", () => {
    render(
      <ConversationTimeline
        rowKeys={["row-a", "row-b", "row-c"]}
        currentRowKey="row-b"
        placement={{ top: 12, height: 100 }}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("navigation", {
        name: I18nKey.CHAT_INTERFACE$CONVERSATION_TIMELINE,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("conversation-timeline-marker")).toHaveLength(
      3,
    );
    expect(
      screen.getAllByTestId("conversation-timeline-marker")[0],
    ).not.toHaveClass("flex-1");
    expect(
      screen
        .getAllByRole("button", {
          name: I18nKey.CHAT_INTERFACE$TIMELINE_ITEM,
        })
        .find((button) => button.getAttribute("aria-current") === "location"),
    ).toBeInTheDocument();
  });

  it("darkens every visible question without lengthening selected or focused markers", () => {
    const props = {
      rowKeys: ["a", "b", "c"],
      currentRowKey: "a",
      placement: { top: 0, height: 700 },
      onSelect: vi.fn(),
    };
    const { rerender } = render(
      <ConversationTimeline {...props} visibleRowKeys={["a", "b"]} />,
    );
    const markers = screen
      .getAllByRole("button")
      .map((button) => button.firstElementChild);
    expect(markers[0]).toHaveClass("bg-contrast/55", "w-[7px]");
    expect(markers[1]).toHaveClass("bg-contrast/55", "w-[7px]");
    expect(markers[2]).toHaveClass("bg-border", "w-[7px]");
    for (const marker of markers) {
      expect(marker).toHaveClass("group-hover:w-6");
      expect(marker).not.toHaveClass("group-focus-visible:w-6", "w-5");
    }
    rerender(<ConversationTimeline {...props} visibleRowKeys={["c"]} />);
    expect(markers[0]).toHaveClass("bg-border");
    expect(markers[1]).toHaveClass("bg-border");
    expect(markers[2]).toHaveClass("bg-contrast/55");
  });

  it("centers the compact marker group vertically within the available chat height", () => {
    render(
      <ConversationTimeline
        rowKeys={["row-a", "row-b", "row-c"]}
        currentRowKey="row-a"
        placement={{ top: 12, height: 700 }}
        onSelect={vi.fn()}
      />,
    );

    const rail = screen.getByRole("navigation");
    const markerGroup = screen.getAllByRole("button")[0].parentElement;
    expect(rail).toHaveClass("items-center");
    expect(markerGroup).toHaveClass("max-h-full", "overflow-y-auto");
    expect(markerGroup).not.toHaveClass("h-full", "flex-1");
  });

  it("selects the row represented by a marker", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ConversationTimeline
        rowKeys={["row-a", "row-b", "row-c"]}
        currentRowKey="row-a"
        placement={{ top: 12, height: 100 }}
        onSelect={onSelect}
      />,
    );

    await user.click(
      screen.getAllByRole("button", {
        name: I18nKey.CHAT_INTERFACE$TIMELINE_ITEM,
      })[2],
    );

    expect(onSelect).toHaveBeenCalledWith("row-c");
  });

  it("previews a row on hover and keyboard focus without navigating", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ConversationTimeline
        rowKeys={["row-a", "row-b"]}
        previews={{ "row-a": "整理模型配置\n展示模型名称、用途和连接状态。" }}
        currentRowKey="row-a"
        placement={{ top: 12, height: 700 }}
        onSelect={onSelect}
      />,
    );
    const marker = screen.getAllByRole("button")[0];
    await user.hover(marker);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "整理模型配置",
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "展示模型名称、用途和连接状态。",
    );
    expect(onSelect).not.toHaveBeenCalled();
    await user.unhover(marker);
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "整理模型配置",
    );
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("button")[1]).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith("row-b");
  });

  it("includes the first message even before another message arrives", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ConversationTimeline
        rowKeys={["first"]}
        currentRowKey="first"
        placement={{ top: 0, height: 300 }}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("first");
  });

  it("does not render a rail when there are no messages", () => {
    const { container } = render(
      <ConversationTimeline
        rowKeys={[]}
        currentRowKey={null}
        placement={{ top: 12, height: 100 }}
        onSelect={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
