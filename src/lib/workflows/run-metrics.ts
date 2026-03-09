export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ModelPricing = {
  /** USD per 1K prompt tokens */
  promptUsdPer1k: number;
  /** USD per 1K completion tokens */
  completionUsdPer1k: number;
};

export type PricingTable = Record<string, ModelPricing>;

export type CostEstimate = {
  /** USD, best-effort estimate */
  costUsd: number;
  /** model key used for the estimate (when known) */
  model?: string;
};

// Conservative defaults; can be overridden via CK_TOKEN_PRICING_JSON.
// NOTE: These values drift over time; treat as estimates.
const DEFAULT_PRICING: PricingTable = {
  // OpenAI
  "gpt-4o": { promptUsdPer1k: 0.005, completionUsdPer1k: 0.015 },
  "gpt-4o-mini": { promptUsdPer1k: 0.00015, completionUsdPer1k: 0.0006 },
  // Anthropic (approx)
  "claude-3-5-sonnet": { promptUsdPer1k: 0.003, completionUsdPer1k: 0.015 },
  "claude-3-5-haiku": { promptUsdPer1k: 0.00025, completionUsdPer1k: 0.00125 },
  // Fallback
  default: { promptUsdPer1k: 0.001, completionUsdPer1k: 0.002 },
};

function isPricing(x: unknown): x is ModelPricing {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const r = x as Record<string, unknown>;
  return Number.isFinite(Number(r.promptUsdPer1k)) && Number.isFinite(Number(r.completionUsdPer1k));
}

export function loadPricingTable(): PricingTable {
  const raw = process.env.CK_TOKEN_PRICING_JSON;
  if (!raw) return DEFAULT_PRICING;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_PRICING;

    const table: PricingTable = { ...DEFAULT_PRICING };
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!k) continue;
      if (!isPricing(v)) continue;
      table[k] = {
        promptUsdPer1k: Number((v as ModelPricing).promptUsdPer1k),
        completionUsdPer1k: Number((v as ModelPricing).completionUsdPer1k),
      };
    }
    return table;
  } catch {
    return DEFAULT_PRICING;
  }
}

export function normalizeModelKey(model?: string): string | undefined {
  if (!model) return undefined;
  const m = model.trim();
  if (!m) return undefined;

  // Strip provider prefixes that sometimes appear (e.g. openai/gpt-4o)
  const last = m.split("/").pop();
  return (last || m).toLowerCase();
}

export function getTokenUsageFromRun(run: unknown): TokenUsage | undefined {
  try {
    const r = run as { nodes?: unknown };
    const nodes = Array.isArray(r.nodes) ? (r.nodes as unknown[]) : [];

    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let sawAny = false;

    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      const out = (n as { output?: unknown }).output;
      if (!out || typeof out !== "object" || Array.isArray(out)) continue;
      const outObj = out as Record<string, unknown>;

      const usageRaw = outObj.usage ?? outObj.tokenUsage ?? outObj.tokens;
      if (!usageRaw || typeof usageRaw !== "object" || Array.isArray(usageRaw)) continue;
      const usage = usageRaw as Record<string, unknown>;

      const p = Number(usage.prompt_tokens ?? usage.promptTokens ?? usage.prompt ?? NaN);
      const c = Number(usage.completion_tokens ?? usage.completionTokens ?? usage.completion ?? NaN);
      const t = Number(usage.total_tokens ?? usage.totalTokens ?? usage.total ?? NaN);

      if (Number.isFinite(p)) {
        promptTokens += p;
        sawAny = true;
      }
      if (Number.isFinite(c)) {
        completionTokens += c;
        sawAny = true;
      }
      if (Number.isFinite(t)) {
        totalTokens += t;
        sawAny = true;
      }
    }

    if (!sawAny) return undefined;
    if (!totalTokens && (promptTokens || completionTokens)) totalTokens = promptTokens + completionTokens;

    return {
      ...(promptTokens ? { promptTokens } : {}),
      ...(completionTokens ? { completionTokens } : {}),
      ...(totalTokens ? { totalTokens } : {}),
    };
  } catch {
    return undefined;
  }
}

export function getPrimaryModelFromRun(run: unknown): string | undefined {
  try {
    const r = run as { nodes?: unknown };
    const nodes = Array.isArray(r.nodes) ? (r.nodes as unknown[]) : [];

    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      const out = (n as { output?: unknown }).output;
      if (!out || typeof out !== "object" || Array.isArray(out)) continue;
      const outObj = out as Record<string, unknown>;

      const model = outObj.model ?? outObj.modelName ?? outObj.llmModel ?? outObj.providerModel;
      if (typeof model === "string") {
        const norm = normalizeModelKey(model);
        if (norm) return norm;
      }

      const meta = outObj.meta;
      if (meta && typeof meta === "object" && !Array.isArray(meta)) {
        const m2 = (meta as Record<string, unknown>).model;
        if (typeof m2 === "string") {
          const norm = normalizeModelKey(m2);
          if (norm) return norm;
        }
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function estimateCostUsd(opts: {
  tokenUsage?: TokenUsage;
  model?: string;
  pricingTable?: PricingTable;
}): CostEstimate | undefined {
  const usage = opts.tokenUsage;
  if (!usage) return undefined;

  const pricingTable = opts.pricingTable ?? loadPricingTable();
  const modelKey = normalizeModelKey(opts.model) || "default";
  const pricing = pricingTable[modelKey] ?? pricingTable.default;
  if (!pricing) return undefined;

  const prompt = Number(usage.promptTokens ?? 0);
  const completion = Number(usage.completionTokens ?? 0);
  const total = Number(usage.totalTokens ?? 0);

  // If we only have total, estimate using prompt rate (least bad) to avoid blank cost.
  const promptTokens = prompt || (!completion && total ? total : 0);
  const completionTokens = completion;

  const costUsd = (promptTokens / 1000) * pricing.promptUsdPer1k + (completionTokens / 1000) * pricing.completionUsdPer1k;

  if (!Number.isFinite(costUsd) || costUsd <= 0) return undefined;
  return { costUsd, ...(modelKey ? { model: modelKey } : {}) };
}
