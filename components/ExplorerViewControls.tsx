import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../styles/ExplorerViewControls.module.css";

export function ExplorerViewControls() {
  const [clean, setClean] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const wasClean = useRef(false);
  const hideButton = useRef<HTMLButtonElement>(null);
  const restoreButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSupported(document.fullscreenEnabled);
    const syncFullscreen = () => {
      const active = !!document.fullscreenElement;
      setFullscreen(active);
      document.body.toggleAttribute("data-fractal-fullscreen", active);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setClean(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("keydown", onKey);
      document.body.removeAttribute("data-fractal-clean");
      document.body.removeAttribute("data-fractal-fullscreen");
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    document.body.toggleAttribute("data-fractal-clean", clean);
    if (clean) restoreButton.current?.focus({ preventScroll: true });
    else if (wasClean.current) hideButton.current?.focus({ preventScroll: true });
    wasClean.current = clean;
  }, [clean]);

  const toggleFullscreen = async () => {
    setError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        window.scrollTo(0, 0);
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setError("Fullscreen is unavailable in this browser.");
    }
  };

  const restore = () => {
    setClean(false);
    // The panel becomes visible after React and the body attribute update.
    requestAnimationFrame(() => hideButton.current?.focus({ preventScroll: true }));
  };

  return (
    <>
      <div className={styles.controls}>
        <button
          ref={hideButton}
          type="button"
          onClick={() => {
            window.scrollTo(0, 0);
            setClean(true);
          }}
          title="Hide panels and navigation. Press Escape or use Show UI to restore them."
        >
          Hide UI
        </button>
        {supported && (
          <button type="button" onClick={toggleFullscreen} aria-pressed={fullscreen}>
            {fullscreen ? "Exit fullscreen" : "Full screen"}
          </button>
        )}
      </div>
      {error && (
        <p className={styles.error} role="status">
          {error}
        </p>
      )}
      {clean &&
        createPortal(
          <div className={styles.restore}>
            <button ref={restoreButton} type="button" onClick={restore} title="Show UI (Escape)">
              <span aria-hidden="true">⌃</span> Show UI
            </button>
            {supported && (
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? "Exit fullscreen" : "Full screen"}
                title={fullscreen ? "Exit fullscreen" : "Full screen"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d={
                      fullscreen
                        ? "M1 5h4V1m6 0v4h4M1 11h4v4m6 0v-4h4"
                        : "M1 6V1h5m4 0h5v5M1 10v5h5m4 0h5v-5"
                    }
                  />
                </svg>
              </button>
            )}
            {error && <span role="status">{error}</span>}
          </div>,
          document.body,
        )}
    </>
  );
}
