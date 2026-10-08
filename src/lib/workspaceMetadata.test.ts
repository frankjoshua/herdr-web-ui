import { expect, it } from "bun:test";
import { workspaceMetadataLine } from "./workspaceMetadata.ts";

it("orders a workspace's values by name, whatever order herdr sent them in", () => {
  const failed = "\u{f04c2} 2376 \u{f0159}", review = "\u{f06d0} sam";
  expect(workspaceMetadataLine({ mr_review: review, mr_failed: failed })).toBe(`${failed}  ${review}`);
  expect(workspaceMetadataLine({ mr_failed: failed, mr_review: review })).toBe(`${failed}  ${review}`);
  // by code point, not the browser's locale: `_` sorts after capitals and before lower case
  expect(workspaceMetadataLine({ b: "2", B: "1", a_b: "3", ab: "4" })).toBe("1  3  4  2");
});

it("leaves out values that draw nothing, and is empty without any", () => {
  expect(workspaceMetadataLine({ mr_opened: "\u{f04c2} 2462", cleared: null, blank: "  ", count: 3 })).toBe("\u{f04c2} 2462");
  expect(workspaceMetadataLine({})).toBe("");
  expect(workspaceMetadataLine(undefined)).toBe("");
});
