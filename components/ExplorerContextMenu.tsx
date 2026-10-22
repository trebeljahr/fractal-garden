import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "../styles/ExplorerContextMenu.module.css";

type Props = {
  onCopyLink: () => void;
  onSavePng: () => void;
  saving?: boolean;
  children?: ReactNode;
  onUIVisibilityChange?: (visible: boolean) => void;
};

type IconName = "link" | "download" | "fullscreen" | "restore" | "eye" | "check" | "more";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    link: <path d="m10 13 4-4m-6 2-2 2a3.5 3.5 0 0 0 5 5l3-3m-4-8 3-3a3.5 3.5 0 0 1 5 5l-2 2" />,
    download: <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />,
    fullscreen: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    restore: <path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5" />,
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function ExplorerContextMenu({
  onCopyLink,
  onSavePng,
  saving,
  children,
  onUIVisibilityChange,
}: Props) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [clean, setClean] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const id = useId();

  const close = useCallback((restoreFocus = true) => {
    setPosition(null);
    if (restoreFocus) {
      const target = returnFocus.current;
      (target?.isConnected && target !== document.body && !target.closest("[data-fractal-chrome]")
        ? target
        : trigger.current
      )?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setSupported(!!document.fullscreenEnabled);
    const syncFullscreen = () => {
      const active = !!document.fullscreenElement;
      setFullscreen(active);
      document.body.toggleAttribute("data-fractal-fullscreen", active);
    };
    const open = (event: MouseEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest("main canvas, [data-fractal-stage]") ||
        target.closest("[data-fractal-description]")
      )
        return;
      event.preventDefault();
      returnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setError("");
      setPosition({ x: event.clientX, y: event.clientY });
    };
    const restore = (event: KeyboardEvent) => {
      if (event.key === "Escape") setClean(false);
    };
    document.addEventListener("contextmenu", open);
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("keydown", restore);
    syncFullscreen();
    return () => {
      document.removeEventListener("contextmenu", open);
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("keydown", restore);
      document.body.removeAttribute("data-fractal-clean");
      document.body.removeAttribute("data-fractal-fullscreen");
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    document.body.toggleAttribute("data-fractal-clean", clean);
    onUIVisibilityChange?.(!clean);
  }, [clean, onUIVisibilityChange]);

  useLayoutEffect(() => {
    if (!position || !menu.current) return;
    const element = menu.current;
    const place = () => {
      const rect = element.getBoundingClientRect();
      element.style.left = `${Math.max(8, Math.min(position.x, window.innerWidth - rect.width - 8))}px`;
      element.style.top = `${Math.max(8, Math.min(position.y, window.innerHeight - rect.height - 8))}px`;
    };
    place();
    element.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => observer.disconnect();
  }, [position]);

  useEffect(() => {
    if (!position) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menu.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        close(false);
    };
    const hide = () => close(false);
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, [position, close]);

  const toggleFullscreen = async () => {
    setError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        window.scrollTo(0, 0);
        await document.documentElement.requestFullscreen();
      }
      close();
    } catch {
      setError("Fullscreen is unavailable in this browser.");
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label="Explorer options"
        title="Explorer options (right-click the drawing)"
        aria-haspopup="menu"
        aria-expanded={!!position}
        aria-controls={position ? id : undefined}
        onClick={() => {
          if (position) close();
          else {
            const rect = trigger.current!.getBoundingClientRect();
            returnFocus.current = trigger.current;
            setError("");
            setPosition({ x: rect.right, y: rect.top - 8 });
          }
        }}
      >
        <Icon name="more" />
      </button>
      {position && (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label="Explorer options"
          className={styles.menu}
          style={{ left: position.x, top: position.y }}
          onKeyDown={(event) => {
            const items = Array.from(
              menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
            );
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            if (
              ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) &&
              !(event.target instanceof HTMLInputElement)
            ) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
              items[next]?.focus();
            } else if (event.key === "Escape" || event.key === "Tab") {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
              }
              close();
            }
          }}
        >
          <button type="button" role="menuitem" onClick={onCopyLink}>
            <Icon name="link" />
            <span>Copy link</span>
          </button>
          <button type="button" role="menuitem" onClick={onSavePng} disabled={saving}>
            <Icon name="download" />
            <span>{saving ? "Saving…" : "Save PNG"}</span>
          </button>
          <hr className={styles.separator} />
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={fullscreen}
            disabled={!supported}
            onClick={toggleFullscreen}
          >
            <Icon name={fullscreen ? "restore" : "fullscreen"} />
            <span>Full screen</span>
            {fullscreen && <Icon name="check" />}
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={!clean}
            onClick={() => {
              if (!clean) window.scrollTo(0, 0);
              setClean(!clean);
              close();
            }}
          >
            <Icon name="eye" />
            <span>Show UI controls</span>
            {!clean && <Icon name="check" />}
          </button>
          {error && (
            <p className={styles.error} role="status">
              {error}
            </p>
          )}
          {children}
        </div>
      )}
    </>,
    document.body,
  );
}
