/**
 * The custom metadata rows of herdr's sidebar config (`[ui.sidebar.spaces]`, `[ui.sidebar.agents]`
 * and its `rows_by_agent`), for the browser to lay out reported values as herdr does: only the
 * `$name` values the user put in a row appear, in that row and order, and a matching `hide` rule
 * removes one. herdr's API does not expose this config, so it is read from herdr's config.toml.
 *
 * The connection server's config serves every PC's rows: herdr's own client also draws a remote
 * machine's sidebar with its local config.
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { SidebarLayout, SidebarValue, SidebarValueRule } from "../shared/protocol.ts";
import { jsonResponse } from "./http.ts";

/** herdr's config file: HERDR_CONFIG_PATH, else ~/.config/herdr (XDG_CONFIG_HOME) or %APPDATA%\herdr. */
export function herdrConfigPath(): string {
  const override = process.env["HERDR_CONFIG_PATH"];
  if (override) return override;
  if (process.platform === "win32") return join(process.env["APPDATA"] || join(homedir(), "AppData", "Roaming"), "herdr", "config.toml");
  return join(process.env["XDG_CONFIG_HOME"] || join(homedir(), ".config"), "herdr", "config.toml");
}

const EMPTY: SidebarLayout = { spaces: [], agents: [], agents_by_agent: {} };
/** a metadata name herdr accepts (`--token NAME=VALUE`) */
const VALUE_NAME = /^\$([A-Za-z0-9_-]{1,32})$/;
/** herdr's limits: 16 rows, 16 entries in a row, 16 rules on an entry */
const MAX = 16;

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** One rule, or null for one herdr would reject (no condition, or more than one). */
function ruleOf(raw: unknown): SidebarValueRule | null {
  const rule = record(raw);
  if (rule === null) return null;
  const text = (["equals", "contains", "starts_with"] as const).filter((key) => typeof rule[key] === "string");
  const number = (["gt", "lt"] as const).filter((key) => typeof rule[key] === "number" && Number.isFinite(rule[key]));
  if (text.length + number.length !== 1) return null;
  const hide = rule["hide"] === true;
  if (text.length === 1) return { [text[0]!]: rule[text[0]!] as string, ...(rule["ignore_case"] === true ? { ignore_case: true } : {}), hide };
  return { [number[0]!]: rule[number[0]!] as number, hide };
}

/** A layout's `$name` entries, row by row; built-in tokens are dropped, and rows left with none. */
function rowsOf(raw: unknown): SidebarValue[][] {
  if (!Array.isArray(raw)) return [];
  const rows: SidebarValue[][] = [];
  for (const row of raw.slice(0, MAX)) {
    if (!Array.isArray(row)) continue;
    const values: SidebarValue[] = [];
    for (const entry of row.slice(0, MAX)) {
      const table = record(entry);
      const token = typeof entry === "string" ? entry : typeof table?.["token"] === "string" ? table["token"] : null;
      const name = token === null ? null : VALUE_NAME.exec(token)?.[1];
      if (!name) continue;
      const rules = Array.isArray(table?.["rules"]) ? (table["rules"] as unknown[]).slice(0, MAX).map(ruleOf).filter((rule): rule is SidebarValueRule => rule !== null) : [];
      values.push({ value: name, rules });
    }
    if (values.length > 0) rows.push(values);
  }
  return rows;
}

/** The layout in a config.toml's text; empty rows for a config without them or one that does not parse. */
export function parseSidebarLayout(text: string): SidebarLayout {
  let config: unknown;
  try { config = Bun.TOML.parse(text); } catch { return EMPTY; }
  const sidebar = record(record(record(config)?.["ui"])?.["sidebar"]);
  const agents = record(sidebar?.["agents"]);
  const byAgent = record(agents?.["rows_by_agent"]) ?? {};
  return {
    spaces: rowsOf(record(sidebar?.["spaces"])?.["rows"]),
    agents: rowsOf(agents?.["rows"]),
    agents_by_agent: Object.fromEntries(Object.entries(byAgent).map(([agent, rows]) => [agent, rowsOf(rows)])),
  };
}

/** GET /api/sidebar-layout. A missing or unreadable config is herdr's default: no custom rows. */
export async function handleSidebarLayoutRequest(request: Request, configPath: string): Promise<Response> {
  if (request.method !== "GET") return jsonResponse({ error: { code: "method_not_allowed", message: "Use GET /api/sidebar-layout" } }, 405, { allow: "GET" });
  const text = await readFile(configPath, "utf8").catch(() => null);
  return jsonResponse(text === null ? EMPTY : parseSidebarLayout(text), 200, { "cache-control": "no-store" });
}
