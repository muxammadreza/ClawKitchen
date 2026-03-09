import { describe, expect, it } from "vitest";

import {
  estimateCostUsd,
  getPrimaryModelFromRun,
  getTokenUsageFromRun,
  normalizeModelKey,
} from "@/lib/workflows/run-metrics";

describe("run-metrics", () => {
  it("normalizes model keys", () => {
    expect(normalizeModelKey("openai/gpt-4o")).toBe("gpt-4o");
    expect(normalizeModelKey("  GPT-4O-mini  ")).toBe("gpt-4o-mini");
  });

  it("extracts token usage from common shapes", () => {
    const run = {
      nodes: [
        { output: { usage: { prompt_tokens: 10, completion_tokens: 20 } } },
        { output: { tokenUsage: { promptTokens: 5, completionTokens: 6 } } },
      ],
    };

    expect(getTokenUsageFromRun(run)).toEqual({
      promptTokens: 15,
      completionTokens: 26,
      totalTokens: 41,
    });
  });

  it("extracts primary model from node outputs", () => {
    const run = {
      nodes: [
        { output: { usage: { prompt_tokens: 1 }, model: "openai/gpt-4o" } },
        { output: { usage: { prompt_tokens: 1 }, model: "gpt-4o-mini" } },
      ],
    };

    expect(getPrimaryModelFromRun(run)).toBe("gpt-4o");
  });

  it("estimates cost from prompt+completion using a provided pricing table", () => {
    const est = estimateCostUsd({
      model: "gpt-4o-mini",
      tokenUsage: { promptTokens: 1000, completionTokens: 2000 },
      pricingTable: {
        "gpt-4o-mini": { promptUsdPer1k: 1, completionUsdPer1k: 10 },
        default: { promptUsdPer1k: 0, completionUsdPer1k: 0 },
      },
    });

    expect(est?.costUsd).toBe(21);
  });
});
