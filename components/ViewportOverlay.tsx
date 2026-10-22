import { type ReactNode, useEffect, useState } from "react";
import styles from "../styles/ViewportOverlay.module.css";
import { ExplorerTools } from "./ExplorerTools";
import { FractalHeader } from "./FractalHeader";

type Action = {
  label: string;
  onClick: () => void;
};

type Props = {
  title?: string;
  lines: string[];
  actions?: Action[];
  places?: ReactNode;
};

export const ViewportOverlay = ({ title, lines, actions = [], places }: Props) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY <= 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <FractalHeader title={title} lines={lines} places={places} />
      <div
        className={`${styles.overlay} ${visible ? "" : styles.hidden}`.trim()}
        data-fractal-chrome
      >
        {actions.length > 0 && (
          <div className={styles.actions}>
            {actions.map((action) => (
              <button
                className={styles.button}
                key={action.label}
                onClick={action.onClick}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        <ExplorerTools data={{}} rules={[]} onRestore={() => {}} />
      </div>
    </>
  );
};
