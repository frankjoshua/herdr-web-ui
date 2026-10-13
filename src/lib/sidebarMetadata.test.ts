import { expect, it } from "bun:test";
import type { SidebarValue, SidebarValueRule } from "../../shared/protocol.ts";
import { metadataLines } from "./sidebarMetadata.ts";

const value = (name: string, rules: SidebarValueRule[] = []): SidebarValue => ({ value: name, rules });

it("draws each row's reported values in the layout's order, joined as herdr joins them", () => {
  const rows = [[value("mr_failed"), value("mr_opened"), value("repo")], [value("mr_review")]];
  expect(metadataLines(rows, { mr_review: "sam", repo: "phy", mr_failed: "2376 ✗" })).toEqual(["2376 ✗ · phy", "sam"]);
});

it("shows only the values the layout names, and no line for a row with none reported", () => {
  const rows = [[value("state")], [value("progress")]];
  expect(metadataLines(rows, { headline: "wire the auth middleware", progress: "3/7" })).toEqual(["3/7"]);
  expect(metadataLines([], { headline: "anything" })).toEqual([]);
  expect(metadataLines(rows, undefined)).toEqual([]);
  expect(metadataLines(rows, { state: "  ", progress: 7 })).toEqual([]);
});

it("hides a value by the first rule that matches it, and a matching rule without hide keeps it", () => {
  const ci = [[value("ci", [{ equals: "passing", hide: true }])]];
  expect(metadataLines(ci, { ci: "passing" })).toEqual([]);
  expect(metadataLines(ci, { ci: "failing" })).toEqual(["failing"]);
  const ordered = [[value("ci", [{ starts_with: "pass", hide: false }, { contains: "ss", hide: true }])]];
  expect(metadataLines(ordered, { ci: "passing" })).toEqual(["passing"]);
  expect(metadataLines(ordered, { ci: "mess" })).toEqual([]);
});

it("matches text case-sensitively unless ignore_case, which folds ASCII only", () => {
  expect(metadataLines([[value("v", [{ equals: "Local", hide: true }])]], { v: "local" })).toEqual(["local"]);
  expect(metadataLines([[value("v", [{ equals: "Local", ignore_case: true, hide: true }])]], { v: "LOCAL" })).toEqual([]);
  expect(metadataLines([[value("v", [{ equals: "É", ignore_case: true, hide: true }])]], { v: "é" })).toEqual(["é"]);
});

it("compares numbers only when the whole value is one, strictly", () => {
  const load = [[value("load", [{ gt: 80, hide: true }, { lt: 10, hide: true }])]];
  expect(metadataLines(load, { load: "90" })).toEqual([]);
  expect(metadataLines(load, { load: "80" })).toEqual(["80"]);
  expect(metadataLines(load, { load: "8.5e1" })).toEqual([]);
  expect(metadataLines(load, { load: "5" })).toEqual([]);
  for (const kept of ["90%", " 90", "NaN", "Infinity", "0x60"]) expect(metadataLines(load, { load: kept })).toEqual([kept]);
});
