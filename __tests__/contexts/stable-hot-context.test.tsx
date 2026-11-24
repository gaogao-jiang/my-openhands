import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createHotStableContext } from "#/contexts/stable-hot-context";

describe("hot-stable context", () => {
  it("shares the provider across module replacements", () => {
    const hotData = {};
    const original = createHotStableContext<string | null>(null, hotData);
    const updated = createHotStableContext<string | null>(null, hotData);
    expect(updated).toBe(original);
    function Consumer() {
      return <span>{React.useContext(updated)}</span>;
    }
    render(
      <original.Provider value="backend">
        <Consumer />
      </original.Provider>,
    );
    expect(screen.getByText("backend")).toBeInTheDocument();
  });

  it("does not share contexts across unrelated hot modules or without HMR", () => {
    expect(createHotStableContext(null, {})).not.toBe(
      createHotStableContext(null, {}),
    );
    expect(createHotStableContext(null)).not.toBe(createHotStableContext(null));
  });
});
