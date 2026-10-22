import styles from "../styles/FractalPlaces.module.css";

export type FractalPlace = {
  label: string;
  detail?: string;
  center: [number, number];
  zoomSize: number;
  iterations?: number;
};

export function FractalPlaces<T extends { label: string; detail?: string }>({
  views,
  onSelect,
}: {
  views: T[];
  onSelect: (view: T) => void;
}) {
  return (
    <details className={styles.places}>
      <summary>Places to explore</summary>
      <ul>
        {views.map((view) => (
          <li key={view.label}>
            <button
              type="button"
              onClick={(event) => {
                onSelect(view);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              <span>{view.label}</span>
              {view.detail && <small>{view.detail}</small>}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
