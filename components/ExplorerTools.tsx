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
import { ExplorerContextMenu } from "./ExplorerContextMenu";

type Props<T> = {
  data: T;
  rules: ControlRule[];
  onRestore: (data: T) => void;
};

export function ExplorerTools<T>({ data, rules, onRestore }: Props<T>) {
  const [message, setMessage] = useState("");
  const [manualLink, setManualLink] = useState("");
  const [sharedLink, setSharedLink] = useState("");
  const [pngUrl, setPngUrl] = useState("");
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
      setSharedLink("");
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

  const copyLink = async () => {
    try {
      const parts: Record<string, unknown> = {};
      const pending: Promise<void>[] = [];
      window.dispatchEvent(new CustomEvent(CAPTURE_VIEW, { detail: { parts, pending } }));
      await Promise.all(pending);
      const url = `${window.location.origin}${window.location.pathname}${encodeView(window.location.pathname, parts)}`;
      setSharedLink(url);
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

  const savePng = () => {
    setSaving(true);
    setMessage("");
    // Redraw and capture in the same frame. WebGL clears its default drawing
    // buffer after presentation; preserving it permanently wastes GPU memory.
    requestAnimationFrame(() => {
      try {
        window.dispatchEvent(new Event("garden:before-export"));
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
        const url = canvas.toDataURL("image/png");
        if (url === "data:,") throw new Error("Empty drawing");
        setPngUrl(url);
        const link = document.createElement("a");
        link.download = `fractal-garden-${window.location.pathname.split("/").filter(Boolean).join("-")}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setMessage("PNG ready.");
      } catch {
        setMessage("The drawing is not ready to save. Try again in a moment.");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <ExplorerContextMenu onCopyLink={copyLink} onSavePng={savePng} saving={saving}>
      <div className={styles.tools}>
        <p className={styles.status} role="status">
          {message}
        </p>
        {sharedLink && !manualLink && (
          <a className={styles.savedLink} href={sharedLink}>
            Open saved view
          </a>
        )}
        {pngUrl && (
          <a
            className={styles.savedLink}
            href={pngUrl}
            download={`fractal-garden-${window.location.pathname.split("/").filter(Boolean).join("-")}.png`}
          >
            Download PNG
          </a>
        )}
        {manualLink && (
          <input
            aria-label="Link to this view"
            readOnly
            value={manualLink}
            onFocus={(event) => event.target.select()}
          />
        )}
      </div>
    </ExplorerContextMenu>
  );
}
