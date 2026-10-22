import { useEffect, useRef } from "react";
import { CAPTURE_VIEW, type CaptureRequest, decodeView } from "../explorerShare";

// Each renderer owns its view. Capture all the parts together only when the
// visitor asks for a link; nothing is written on every pan or slider change.
export function useExplorerPart(
  name: string,
  capture: () => unknown,
  restore: (value: unknown) => void,
  ready = true,
) {
  const handlers = useRef({ capture, restore });
  handlers.current = { capture, restore };
  useEffect(() => {
    if (!ready) return;
    const take = (event: Event) => {
      const { parts, pending } = (event as CustomEvent<CaptureRequest>).detail;
      const value = handlers.current.capture();
      if (value instanceof Promise)
        pending.push(
          value.then((result) => {
            if (result !== undefined) parts[name] = result;
          }),
        );
      else if (value !== undefined) parts[name] = value;
    };
    const apply = () => {
      try {
        const saved = decodeView(window.location.hash, window.location.pathname);
        if (saved && saved.parts[name] !== undefined) handlers.current.restore(saved.parts[name]);
      } catch {
        // The controls show a single inline error for an unreadable link.
        queueMicrotask(() => window.dispatchEvent(new Event("garden:invalid-view")));
      }
    };
    window.addEventListener(CAPTURE_VIEW, take);
    window.addEventListener("hashchange", apply);
    apply();
    return () => {
      window.removeEventListener(CAPTURE_VIEW, take);
      window.removeEventListener("hashchange", apply);
    };
  }, [name, ready]);
}
