import { type ReactNode, useEffect, useMemo, useState } from "react";
import styles from "../styles/ViewportOverlay.module.css";
import { scrollToDescription } from "../utils/scrollToDescription";
import { ExplorerTools } from "./ExplorerTools";

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
  const [pageTitle, setPageTitle] = useState("");

  useEffect(() => {
    setPageTitle(document.title);

    const handleScroll = () => {
      setVisible(window.scrollY <= 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const overlayActions = useMemo(() => {
    const combined = [
      ...actions,
      {
        label: "About this fractal",
        onClick: scrollToDescription,
      },
    ];

    return combined.filter(
      (action, index) =>
        combined.findIndex((candidate) => candidate.label === action.label) === index,
    );
  }, [actions]);

  return (
    <div className={`${styles.overlay} ${visible ? "" : styles.hidden}`.trim()}>
      <div className={styles.title}>{title || pageTitle || "Fractal"}</div>
      <div className={styles.copy}>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className={styles.actions}>
        {overlayActions.map((action) => (
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
      {places}
      <ExplorerTools data={{}} rules={[]} onRestore={() => {}} />
    </div>
  );
};
