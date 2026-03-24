import { ReactNode, useEffect, useMemo, useState } from "react";
import DatGui, { DatFolder } from "react-dat-gui";
import styles from "../styles/ExplorerPanel.module.css";
import { scrollToDescription } from "../utils/scrollToDescription";

type Action = {
  label: string;
  onClick: () => void;
};

type PanelMode = "formula" | "pattern" | "scene";

type Props<T> = {
  actions?: Action[];
  children: ReactNode;
  controlsHint?: string;
  controlsTitle?: string;
  data: T;
  defaultOpen?: boolean;
  introTitle?: string;
  lines?: string[];
  mode?: PanelMode;
  onUpdate: (newData: T) => void;
};

const PANEL_COPY: Record<
  PanelMode,
  {
    controlsHint: string;
    controlsTitle: string;
    introTitle: string;
    lines: string[];
  }
> = {
  formula: {
    introTitle: "Explore The Set",
    lines: [
      "Open the studio to move through presets and nudge the parameters. Tiny changes can completely reshape the structure.",
    ],
    controlsTitle: "Parameter Studio",
    controlsHint: "Presets, color, and the numbers that shift the whole mood.",
  },
  pattern: {
    introTitle: "Explore The Pattern",
    lines: [
      "Open the studio to play with depth, color, and drawing style. Live updates make it easy to discover the surprising versions.",
    ],
    controlsTitle: "Pattern Studio",
    controlsHint: "Shape, palette, and growth controls for wandering a little.",
  },
  scene: {
    introTitle: "Explore The Scene",
    lines: [
      "Drag the form around, then open the studio for color, depth, and motion. The most interesting versions usually come from a couple of subtle tweaks.",
    ],
    controlsTitle: "Scene Studio",
    controlsHint: "View, lighting feel, and structure controls for a better look around.",
  },
};

export function ExplorerPanel<T>({
  actions = [],
  children,
  controlsHint,
  controlsTitle,
  data,
  defaultOpen = false,
  introTitle,
  lines,
  mode = "pattern",
  onUpdate,
}: Props<T>) {
  const defaults = PANEL_COPY[mode];
  const [pageTitle, setPageTitle] = useState("");

  useEffect(() => {
    setPageTitle(document.title);
  }, []);

  const panelActions = useMemo(() => {
    const combined = [
      ...actions,
      {
        label: "About this fractal",
        onClick: scrollToDescription,
      },
    ];

    return combined.filter(
      (action, index) =>
        combined.findIndex((candidate) => candidate.label === action.label) ===
        index
    );
  }, [actions]);

  const displayTitle = introTitle || pageTitle || defaults.introTitle;
  const folderTitle = (
    <div className={styles.folderTitle}>
      <span className={styles.folderHeading}>
        {controlsTitle ?? defaults.controlsTitle}
      </span>
      <span className={styles.folderHint}>
        {controlsHint ?? defaults.controlsHint}
      </span>
    </div>
  ) as unknown as string;

  return (
    <aside className={styles.panel}>
      <div className={styles.introCard}>
        <div className={styles.title}>{displayTitle}</div>
        <div className={styles.copy}>
          {(lines ?? defaults.lines).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {panelActions.length ? (
          <div className={styles.actions}>
            {panelActions.map((action) => (
              <button
                className={styles.action}
                key={action.label}
                onClick={action.onClick}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <DatGui
        className="exploration-gui"
        data={data}
        labelWidth={160}
        onUpdate={onUpdate}
      >
        <DatFolder className="exploration-folder" closed={!defaultOpen} title={folderTitle}>
          {children}
        </DatFolder>
      </DatGui>
    </aside>
  );
}
