import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../styles/VoxelFlight.module.css";
import { FlightTouchControls, type FlightTouchInput } from "./FlightTouchControls";

export function SpatialNavigation({ flying, input }: { flying: boolean; input: FlightTouchInput }) {
  const [needsReset, setNeedsReset] = useState(false);
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => {
    const target = document.querySelector("[data-fractal-studio]");
    setHost(target);
    setNeedsReset(
      !Array.from(target?.querySelectorAll("button") ?? []).some(
        (button) => button.textContent === "Reset view",
      ),
    );
  }, []);
  return (
    <>
      {host &&
        createPortal(
          <div className={styles.navigationGroup} data-spatial-navigation>
            {needsReset && (
              <button
                className={styles.navigation}
                type="button"
                onClick={() => window.dispatchEvent(new Event("garden:reset-pose"))}
              >
                Reset view
              </button>
            )}
          </div>,
          host,
        )}
      {flying && <FlightTouchControls input={input} />}
    </>
  );
}
