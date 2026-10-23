import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "../styles/ExplorerViewControls.module.css";

function VisibilityIcon({ hidden = false }: { hidden?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {hidden && <path d="m3 3 18 18" />}
    </svg>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={active ? "M3 8h5V3m8 0v5h5M3 16h5v5m8 0v-5h5" : "M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5"}
      />
    </svg>
  );
}

type Props = {
  animation?: { playing: boolean; onToggle: () => void };
  clean: boolean;
  fullscreen: boolean;
  supported: boolean;
  error: string;
  onToggleUI: () => void;
  onToggleFullscreen: () => void;
  onCopyLink: () => void;
  onSavePng: () => void;
  saving?: boolean;
  feedback?: ReactNode;
};

export function ExplorerViewControls({
  animation,
  clean,
  fullscreen,
  supported,
  error,
  onToggleUI,
  onToggleFullscreen,
  onCopyLink,
  onSavePng,
  saving,
  feedback,
}: Props) {
  const wasClean = useRef(false);
  const hideButton = useRef<HTMLButtonElement>(null);
  const restoreButton = useRef<HTMLButtonElement>(null);
  const fullscreenLabel = fullscreen ? "Exit fullscreen" : "Enter fullscreen";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (clean) restoreButton.current?.focus({ preventScroll: true });
      else if (wasClean.current) hideButton.current?.focus({ preventScroll: true });
      wasClean.current = clean;
    });
    return () => cancelAnimationFrame(frame);
  }, [clean]);

  const controls = (
    <div className={clean ? styles.restore : styles.controls}>
      {!clean && (
        <>
          <button
            type="button"
            className={styles.capture}
            onClick={onCopyLink}
            title="Copy a link to this view"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m10 13 4-4m-6 2-2 2a3.5 3.5 0 0 0 5 5l3-3m-4-8 3-3a3.5 3.5 0 0 1 5 5l-2 2" />
            </svg>
            <span>Copy link</span>
          </button>
          <button
            type="button"
            className={styles.capture}
            onClick={onSavePng}
            disabled={saving}
            title="Save this view as a PNG image"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />
            </svg>
            <span>{saving ? "Saving…" : "Save image"}</span>
          </button>
        </>
      )}
      {animation && !clean && (
        <button
          type="button"
          onClick={animation.onToggle}
          aria-label={animation.playing ? "Pause animation" : "Play animation"}
          title={animation.playing ? "Pause animation" : "Play animation"}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            {animation.playing ? <path d="M8 5v14M16 5v14" /> : <path d="m8 4 12 8-12 8Z" />}
          </svg>
        </button>
      )}
      <button
        ref={clean ? restoreButton : hideButton}
        type="button"
        onClick={onToggleUI}
        aria-label={clean ? "Show UI" : "Hide UI"}
        title={clean ? "Show UI (Escape)" : "Hide UI (Escape to restore)"}
      >
        <VisibilityIcon hidden={!clean} />
      </button>
      {!clean && (
        <button
          type="button"
          disabled={!supported}
          onClick={onToggleFullscreen}
          aria-label={fullscreenLabel}
          title={fullscreenLabel}
        >
          <FullscreenIcon active={fullscreen} />
        </button>
      )}
      {error && !clean && (
        <p className={styles.error} role="status">
          {error}
        </p>
      )}
      {feedback && !clean && <div className={styles.feedback}>{feedback}</div>}
    </div>
  );
  return clean ? createPortal(controls, document.body) : controls;
}
