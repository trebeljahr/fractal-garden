import { useEffect, useRef } from "react";
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
};

export function ExplorerViewControls({
  animation,
  clean,
  fullscreen,
  supported,
  error,
  onToggleUI,
  onToggleFullscreen,
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
      <button
        type="button"
        disabled={!animation}
        onClick={animation?.onToggle}
        aria-label={animation?.playing ? "Pause animation" : "Play animation"}
        title={
          animation
            ? animation.playing
              ? "Pause animation"
              : "Play animation"
            : "This fractal has no automatic animation"
        }
        aria-pressed={animation?.playing ?? false}
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
          {animation?.playing ? <path d="M8 5v14M16 5v14" /> : <path d="m8 4 12 8-12 8Z" />}
        </svg>
      </button>
      <button
        ref={clean ? restoreButton : hideButton}
        type="button"
        onClick={onToggleUI}
        aria-label={clean ? "Show UI" : "Hide UI"}
        title={clean ? "Show UI (Escape)" : "Hide UI (Escape to restore)"}
      >
        <VisibilityIcon hidden={!clean} />
      </button>
      <button
        type="button"
        disabled={!supported}
        onClick={onToggleFullscreen}
        aria-label={fullscreenLabel}
        title={fullscreenLabel}
        aria-pressed={fullscreen}
      >
        <FullscreenIcon active={fullscreen} />
      </button>
      {error && (
        <p className={styles.error} role="status">
          {error}
        </p>
      )}
    </div>
  );
  return clean ? createPortal(controls, document.body) : controls;
}
