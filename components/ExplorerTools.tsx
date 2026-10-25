import { useEffect, useState } from "react";
import styles from "../styles/ExplorerTools.module.css";
import {
  CAPTURE_VIEW,
  type ControlRule,
  decodeView,
  encodeView,
  restoreConfig,
  snapshotConfig,
} from "../utils/explorerShare";
import { useExplorerPart } from "../utils/hooks/useExplorerPart";
import { downloadPng, exportCanvasPng } from "../utils/pngExport";
import { ExplorerContextMenu } from "./ExplorerContextMenu";

type Props<T> = {
  data: T;
  viewControlsHost?: HTMLElement | null;
  rules: ControlRule[];
  onRestore: (data: T) => void;
};

export function ExplorerTools<T>({ data, rules, onRestore, viewControlsHost }: Props<T>) {
  const [message, setMessage] = useState("");
  const [manualLink, setManualLink] = useState("");
  const [saving, setSaving] = useState(false);
  useExplorerPart(
    "config",
    () => snapshotConfig(data, rules),
    (saved) => onRestore(restoreConfig(data, saved, rules)),
  );

  useEffect(() => {
    const invalid = () =>
      setMessage("This view link could not be restored. You can still explore here.");
    const check = () => {
      setMessage("");
      setManualLink("");
      try {
        decodeView(window.location.hash, window.location.pathname);
      } catch {
        invalid();
      }
    };
    window.addEventListener("garden:invalid-view", invalid);
    window.addEventListener("hashchange", check);
    check();
    return () => {
      window.removeEventListener("garden:invalid-view", invalid);
      window.removeEventListener("hashchange", check);
    };
  }, []);

  useEffect(() => {
    if (message !== "Link copied." && message !== "PNG ready.") return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const copyLink = async () => {
    try {
      const parts: Record<string, unknown> = {};
      const pending: Promise<void>[] = [];
      window.dispatchEvent(new CustomEvent(CAPTURE_VIEW, { detail: { parts, pending } }));
      await Promise.all(pending);
      const url = `${window.location.origin}${window.location.pathname}${encodeView(window.location.pathname, parts)}`;
      try {
        await navigator.clipboard.writeText(url);
        setManualLink("");
        setMessage("Link copied.");
      } catch {
        setManualLink(url);
        setMessage("Select and copy this link.");
      }
    } catch {
      setMessage("This view could not be shared. Try resetting the view.");
    }
  };

  const savePng = async () => {
    if (saving) return;
    const filename = `fractal-garden-${window.location.pathname.split("/").filter(Boolean).join("-")}.png`;
    setSaving(true);
    setMessage("");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>("main canvas"));
      const canvas = canvases.reverse().find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return (
          candidate.width > 0 &&
          candidate.height > 0 &&
          rect.width > 0 &&
          getComputedStyle(candidate).visibility !== "hidden" &&
          !candidate.closest("[data-fractal-description]") &&
          !candidate.closest('[data-export-hidden="true"]')
        );
      });
      if (!canvas) throw new Error("Drawing not ready");
      const blob = await exportCanvasPng(canvas);
      downloadPng(blob, filename);
      setMessage("PNG ready.");
    } catch {
      setMessage("The drawing is not ready to save. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ExplorerContextMenu
      onCopyLink={copyLink}
      onSavePng={savePng}
      saving={saving}
      viewControlsHost={viewControlsHost}
    >
      {(message || manualLink) && (
        <div className={styles.tools}>
          <p className={styles.status} role="status">
            {message}
          </p>
          {manualLink && (
            <input
              aria-label="Link to this view"
              readOnly
              value={manualLink}
              onFocus={(event) => event.target.select()}
            />
          )}
        </div>
      )}
    </ExplorerContextMenu>
  );
}
