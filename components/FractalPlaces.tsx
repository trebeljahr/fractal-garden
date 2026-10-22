import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "../styles/FractalPlaces.module.css";
import { type FractalPlace, matchesPlace } from "../utils/fractalPlaces";

export type { FractalPlace } from "../utils/fractalPlaces";

export function FractalPlaces<T extends FractalPlace>({
  views,
  viewport,
  onSelect,
  matchesParameters = () => true,
  matchesViewport,
  initialZoomSize,
}: {
  views: T[];
  viewport?: Pick<FractalPlace, "center" | "zoomSize">;
  onSelect: (view: T) => void;
  matchesParameters?: (view: T) => boolean;
  initialZoomSize?: number;
  matchesViewport?: (view: T) => boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) {
        menu.current?.removeAttribute("open");
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.removeAttribute("open");
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, []);

  const activePlace = views.find(
    (view) =>
      (matchesViewport ? matchesViewport(view) : viewport && matchesPlace(view, viewport)) &&
      matchesParameters(view),
  );
  const groups = Array.from(new Set(views.map((view) => view.group)));

  return (
    <details ref={menu} className={styles.places}>
      <summary>
        Places to explore
        {activePlace && <small className={styles.currentPlace}>{activePlace.label}</small>}
      </summary>
      <div className={styles.destinations}>
        {groups.map((group) => (
          <div key={group ?? "places"}>
            {group && <h3 className={styles.groupTitle}>{group}</h3>}
            <ul>
              {views
                .filter((view) => view.group === group)
                .map((view) => (
                  <li key={view.label}>
                    <button
                      type="button"
                      aria-pressed={view === activePlace}
                      onClick={(event) => {
                        onSelect(view);
                        event.currentTarget.closest("details")?.removeAttribute("open");
                      }}
                    >
                      {view.preview && (
                        <Image
                          src={view.preview}
                          alt=""
                          width={80}
                          height={50}
                          className={styles.preview}
                        />
                      )}
                      <span className={styles.placeText}>
                        <span className={styles.placeLabel}>
                          {view.label}
                          {view === activePlace && (
                            <small className={styles.currentPlace}>Current view</small>
                          )}
                        </span>
                        {view.detail && <small>{view.detail}</small>}
                        {initialZoomSize && (
                          <small className={styles.zoom}>
                            {new Intl.NumberFormat("en", { maximumSignificantDigits: 3 }).format(
                              initialZoomSize / view.zoomSize,
                            )}
                            × zoom
                          </small>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
