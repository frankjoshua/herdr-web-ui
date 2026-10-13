import type { SidebarValue, SidebarValueRule } from "../../shared/protocol.ts";

/** herdr's separator between the values of one row */
const SEPARATOR = " · ";
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

/**
 * The lines herdr's sidebar draws for reported metadata under a layout's rows: each row's values in
 * its order, joined as herdr joins them. A value not reported, or removed by the first rule that
 * matches it, leaves with its separator, and a row with none left draws no line.
 */
export function metadataLines(rows: readonly (readonly SidebarValue[])[], tokens: Readonly<Record<string, unknown>> | undefined): string[] {
  if (tokens === undefined) return [];
  const lines: string[] = [];
  for (const row of rows) {
    const shown = row.flatMap(({ value, rules }) => {
      const reported = tokens[value];
      if (typeof reported !== "string" || reported.trim() === "") return [];
      return rules.find((rule) => matches(rule, reported))?.hide === true ? [] : [reported];
    });
    if (shown.length > 0) lines.push(shown.join(SEPARATOR));
  }
  return lines;
}
