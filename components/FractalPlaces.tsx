import styles from "../styles/FractalPlaces.module.css";

export type FractalPlace = {
  label: string;
  detail?: string;
  center: [number, number];
  zoomSize: number;
  iterations?: number;
};

export function FractalPlaces<T extends FractalPlace>({
  views,
  viewport,
  onSelect,
}: {
  views: T[];
  viewport: Pick<FractalPlace, "center" | "zoomSize">;
  onSelect: (view: T) => void;
}) {
  const activePlace = views.find((view) => {
    const tolerance = view.zoomSize * 1e-8;
    return (
      Math.abs(view.center[0] - viewport.center[0]) <= tolerance &&
      Math.abs(view.center[1] - viewport.center[1]) <= tolerance &&
      Math.abs(view.zoomSize - viewport.zoomSize) <= tolerance
    );
  });

  return (
    <details className={styles.places}>
      <summary>
        Places to explore
        {activePlace && <small className={styles.currentPlace}>{activePlace.label}</small>}
      </summary>
      <ul>
        {views.map((view) => (
          <li key={view.label}>
            <button
              type="button"
              aria-pressed={view === activePlace}
              onClick={(event) => {
                onSelect(view);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              <span className={styles.placeLabel}>
                {view.label}
                {view === activePlace && (
                  <small className={styles.currentPlace}>Current view</small>
                )}
              </span>
              {view.detail && <small>{view.detail}</small>}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
