import { useSyncExternalStore } from "react";

import type { SidebarLayout } from "../../shared/protocol.ts";
import { fetchSidebarLayout } from "./api.ts";

/**
 * herdr's sidebar layout (GET /api/sidebar-layout), one copy for every roster. Read on first use and
 * again whenever the page comes back into view, after an edit to config.toml. A server too old to
 * answer, or one that fails, leaves the rows empty: herdr's default layout shows no custom values.
 */
const EMPTY: SidebarLayout = { spaces: [], agents: [], agents_by_agent: {} };
let layout = EMPTY;
const listeners = new Set<() => void>();
let reading = false;

function read(): void {
  if (reading) return;
  reading = true;
  fetchSidebarLayout()
    .then((answer) => { layout = answer; for (const listener of listeners) listener(); })
    .catch(() => { /* keep the rows already shown */ })
    .finally(() => { reading = false; });
}

function onVisible(): void {
  if (document.visibilityState === "visible") read();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    document.addEventListener("visibilitychange", onVisible);
    read();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) document.removeEventListener("visibilitychange", onVisible);
  };
}

export function useSidebarLayout(): SidebarLayout {
  return useSyncExternalStore(subscribe, () => layout, () => EMPTY);
}
