import { expect, it } from "bun:test";
import { parseSidebarLayout } from "./sidebar-layout.ts";

it("keeps a row's custom values in order with their style, and leaves out herdr's built-in tokens", () => {
  const layout = parseSidebarLayout(`
[ui.sidebar.spaces]
rows = [
  ["state_icon", "workspace"],
  ["branch", "git_status"],
  [{ token = "$mr_failed", fg = "#f85149", bold = true }, { token = "$mr_opened", fg = "#3fb950" }, { token = "$repo", dim = false }],
  [{ token = "$mr_review", fg = "#58a6ff" }],
  ["$plain", "workspace"],
]
`);
  expect(layout.spaces).toEqual([
    [{ value: "mr_failed", fg: "#f85149", bold: true, rules: [] }, { value: "mr_opened", fg: "#3fb950", rules: [] }, { value: "repo", dim: false, rules: [] }],
    [{ value: "mr_review", fg: "#58a6ff", rules: [] }],
    [{ value: "plain", rules: [] }],
  ]);
  expect(layout.agents).toEqual([]);
  expect(layout.agents_by_agent).toEqual({});
});

it("takes only the colors herdr accepts", () => {
  const fgs = ["#abc", "#A1B2C3", "#abcd", "red", "#ggg", "url(x)", "#1234567"];
  const layout = parseSidebarLayout(`[ui.sidebar.spaces]\nrows = [[${fgs.map((fg, i) => `{ token = "$v${i}", fg = "${fg}" }`).join(", ")}]]\n`);
  expect(layout.spaces[0]!.map((value) => value.fg)).toEqual(["#abc", "#A1B2C3", undefined, undefined, undefined, undefined, undefined]);
});

it("reads agent rows and the per-agent replacements", () => {
  const layout = parseSidebarLayout(`
[ui.sidebar.agents]
rows = [["state_icon", "agent", "$model"], ["$summary"]]

[ui.sidebar.agents.rows_by_agent]
claude = [["state_icon", "agent"], ["terminal_title_stripped"]]
codex = [["$summary"]]
`);
  expect(layout.agents).toEqual([[{ value: "model", rules: [] }], [{ value: "summary", rules: [] }]]);
  // a replacement with no custom values replaces the rows with none
  expect(layout.agents_by_agent).toEqual({ claude: [], codex: [[{ value: "summary", rules: [] }]] });
});

it("keeps the rules with what they change, and drops the ones herdr would reject", () => {
  const layout = parseSidebarLayout(`
[ui.sidebar.spaces]
rows = [[{ token = "$ci", fg = "#f55", rules = [
  { equals = "passing", hide = true },
  { contains = "FAIL", ignore_case = true, fg = "#f00", bold = true },
  { gt = 80, dim = true },
  { lt = 1 },
  { equals = "x", gt = 1 },
  { fg = "#fff" },
] }]]
`);
  expect(layout.spaces).toEqual([[{ value: "ci", fg: "#f55", rules: [
    { equals: "passing", hide: true },
    { contains: "FAIL", ignore_case: true, fg: "#f00", bold: true, hide: false },
    { gt: 80, dim: true, hide: false },
    { lt: 1, hide: false },
  ] }]]);
});

it("is empty without a sidebar section, and for a config that does not parse", () => {
  const empty = { spaces: [], agents: [], agents_by_agent: {} };
  expect(parseSidebarLayout(`[keys]\nprefix = "ctrl+b"\n`)).toEqual(empty);
  expect(parseSidebarLayout("rows = [[")).toEqual(empty);
  expect(parseSidebarLayout("")).toEqual(empty);
});

it("takes only names herdr accepts, and at most 16 rows of 16", () => {
  const many = Array.from({ length: 20 }, (_, i) => `["$v${i}"]`).join(", ");
  const layout = parseSidebarLayout(`[ui.sidebar.spaces]\nrows = [${many}, ["$bad name", "$", "$ok"]]\n`);
  expect(layout.spaces.length).toBe(16);
  expect(parseSidebarLayout(`[ui.sidebar.spaces]\nrows = [["$bad name", "$", "$${"x".repeat(33)}", "$ok-1_2"]]\n`).spaces).toEqual([[{ value: "ok-1_2", rules: [] }]]);
});
