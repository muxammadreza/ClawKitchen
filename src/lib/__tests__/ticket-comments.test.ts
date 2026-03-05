import { describe, expect, it } from "vitest";
import { formatTicketCommentMarkdown, parseTicketComments } from "../ticket-comments";

describe("ticket-comments", () => {
  it("returns empty list when no ## Comments section exists", () => {
    const md = "# 0001\n\n## Context\nhello\n";
    expect(parseTicketComments(md)).toEqual([]);
  });

  it("parses comments until next ## heading", () => {
    const md = [
      "# 0001",
      "",
      "## Comments",
      "- **2026-03-05 12:00 UTC** — Seven: First line",
      "  second line",
      "",
      "- **2026-03-05 12:01 UTC** — RJ:",
      "  multi",
      "  line",
      "",
      "## Next",
      "ignored",
      "",
    ].join("\n");

    expect(parseTicketComments(md)).toEqual([
      {
        timestamp: "2026-03-05 12:00 UTC",
        author: "Seven",
        body: "First line\nsecond line",
      },
      {
        timestamp: "2026-03-05 12:01 UTC",
        author: "RJ",
        body: "multi\nline",
      },
    ]);
  });

  it("formats markdown in the expected append-safe block shape", () => {
    const md = formatTicketCommentMarkdown({
      timestamp: "2026-03-05 12:00 UTC",
      author: "Seven",
      body: "hello\nworld",
    });

    expect(md).toContain("- **2026-03-05 12:00 UTC** — Seven:");
    expect(md).toContain("  hello\n  world");
    // Should start with a newline so appending after a section header is clean.
    expect(md.startsWith("\n- **")).toBe(true);
  });

  it("defaults author to unknown", () => {
    const md = formatTicketCommentMarkdown({
      timestamp: "2026-03-05 12:00 UTC",
      author: "",
      body: "hello",
    });

    expect(md).toContain("— unknown:");
  });
});
