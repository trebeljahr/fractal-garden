import Image from "next/image";
import { type ReactNode, useEffect, useRef } from "react";
import styles from "../styles/FractalPlaces.module.css";
import { type FractalPlace, formatZoom, matchesPlace } from "../utils/fractalPlaces";

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
  const activePlace = views.find(
    (view) =>
      (matchesViewport ? matchesViewport(view) : viewport && matchesPlace(view, viewport)) &&
      matchesParameters(view),
  );
  return (
    <PlacesMenu
      views={views}
      activePlace={activePlace}
      onSelect={onSelect}
      annotation={
        initialZoomSize ? (view) => <ZoomLabel zoom={initialZoomSize / view.zoomSize} /> : undefined
      }
    />
  );
}

function ZoomLabel({ zoom }: { zoom: number }) {
  const label = formatZoom(zoom);
  return (
    <small className={styles.zoom}>
      {"digits" in label ? (
        `${label.digits}× zoom`
      ) : (
        <>
          {label.mantissa && `${label.mantissa} × `}10<sup>{label.exponent}</sup> zoom
        </>
      )}
    </small>
  );
}

export function PlacesMenu<T extends Pick<FractalPlace, "label" | "detail" | "group" | "preview">>({
  views,
  activePlace,
  onSelect,
  annotation,
}: {
  views: T[];
  activePlace?: T;
  onSelect: (view: T) => void;
  annotation?: (view: T) => ReactNode;
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

  const groups = Array.from(new Set(views.map((view) => view.group)));

  return (
    <details ref={menu} className={styles.places} data-fractal-places>
      <summary>Places to explore</summary>
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
                        {annotation?.(view)}
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
