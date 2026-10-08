import type { SidebarStyle, SidebarValue, SidebarValueRule } from "../../shared/protocol.ts";

/** One value drawn on a metadata line, with the style the layout and its first matching rule give it. */
export interface MetadataValue extends SidebarStyle {
  readonly text: string;
}

/** a whole finite number as herdr's `gt`/`lt` read one: decimals and exponents, no spaces or units */
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

const asciiLower = (text: string): string => text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());

function matches(rule: SidebarValueRule, value: string): boolean {
  if (rule.gt !== undefined || rule.lt !== undefined) {
    if (!NUMBER.test(value)) return false;
    const number = Number(value);
    return rule.gt !== undefined ? number > rule.gt : number < rule.lt!;
  }
  const fold = rule.ignore_case === true ? asciiLower : (text: string) => text;
  const subject = fold(value);
  if (rule.equals !== undefined) return subject === fold(rule.equals);
  if (rule.contains !== undefined) return subject.includes(fold(rule.contains));
  return rule.starts_with !== undefined && subject.startsWith(fold(rule.starts_with));
}

/** The style fields set, the rule's over the value's: a field neither sets stays absent. */
function styled(text: string, own: SidebarStyle, rule: SidebarValueRule | undefined): MetadataValue {
  const fg = rule?.fg ?? own.fg, bold = rule?.bold ?? own.bold, dim = rule?.dim ?? own.dim;
  return { text, ...(fg !== undefined ? { fg } : {}), ...(bold !== undefined ? { bold } : {}), ...(dim !== undefined ? { dim } : {}) };
}

/**
 * The lines herdr's sidebar draws for reported metadata under a layout's rows: each row's values in
 * its order, each styled by its own `fg`/`bold`/`dim` and the first rule that matches it. A value
 * not reported, or hidden by that rule, leaves the row (herdr drops its separator too), and a row
 * with none left draws no line.
 */
export function metadataLines(rows: readonly (readonly SidebarValue[])[], tokens: Readonly<Record<string, unknown>> | undefined): MetadataValue[][] {
  if (tokens === undefined) return [];
  const lines: MetadataValue[][] = [];
  for (const row of rows) {
    const shown = row.flatMap((entry) => {
      const reported = tokens[entry.value];
      if (typeof reported !== "string" || reported.trim() === "") return [];
      const rule = entry.rules.find((candidate) => matches(candidate, reported));
      return rule?.hide === true ? [] : [styled(reported, entry, rule)];
    });
    if (shown.length > 0) lines.push(shown);
  }
  return lines;
}
