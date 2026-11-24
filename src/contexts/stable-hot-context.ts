import { createContext, type Context } from "react";

/** Preserve context identity across Vite module replacements, not across roots. */
export function createHotStableContext<T>(
  defaultValue: T,
  hotData?: Record<string, unknown>,
): Context<T> {
  if (!hotData) return createContext(defaultValue);
  const existing = hotData.context as Context<T> | undefined;
  if (existing) return existing;
  const context = createContext(defaultValue);
  Object.assign(hotData, { context });
  return context;
}
