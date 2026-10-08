/**
 * The line herdr's own sidebar shows for a workspace from the metadata a script reports to it
 * (`workspace.report_metadata`: an MR's state and number, a review asked for), or "" when there is
 * none. Sorted by name: herdr sends the values in no fixed order, and the row would reorder itself
 * between snapshots. The values carry Nerd Font glyphs.
 */
export function workspaceMetadataLine(tokens: Record<string, unknown> | undefined): string {
  return Object.entries(tokens ?? {})
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, value]) => value)
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .join("  ");
}
