import { Children, isValidElement, type ReactNode, useEffect, useMemo, useState } from "react";
import DatGui, { DatFolder } from "react-dat-gui";
import styles from "../styles/ExplorerPanel.module.css";
import { type ControlRule, isRecord } from "../utils/explorerShare";
import { scrollToDescription } from "../utils/scrollToDescription";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerTools } from "./ExplorerTools";

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
  onRestore?: (newData: T) => void;
  places?: ReactNode;
  shareRules?: ControlRule[];
};

function controlRules(children: ReactNode, data: unknown): ControlRule[] {
  const rules: ControlRule[] = [];
  const walk = (nodes: ReactNode) =>
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const { path, min, max, options } = child.props;
      if (typeof path === "string") {
        const kind =
          child.type === PanelNumber
            ? "number"
            : child.type === PanelColor
              ? "color"
              : child.type === PanelBoolean
                ? "boolean"
                : child.type === PanelSelect
                  ? "select"
                  : null;
        if (kind) rules.push({ path, kind, min: min ?? undefined, max: max ?? undefined, options });
      }
      if (child.props.children) walk(child.props.children);
    });
  walk(children);
  // Keep colors from conditional controls too (for example both Penrose tile families).
  const colors = (value: unknown, prefix = "") => {
    if (!isRecord(value)) return;
    for (const [key, field] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (
        typeof field === "string" &&
        /^#[\da-f]{6}$/i.test(field) &&
        !rules.some((rule) => rule.path === path)
      ) {
        rules.push({ path, kind: "color" });
      } else if (isRecord(field)) colors(field, path);
    }
  };
  colors(data);
  return rules;
}

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
  onRestore = onUpdate,
  places,
  shareRules = [],
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
        combined.findIndex((candidate) => candidate.label === action.label) === index,
    );
  }, [actions]);

  const displayTitle = introTitle || pageTitle || defaults.introTitle;
  const folderTitle = (
    <div className={styles.folderTitle}>
      <span className={styles.folderHeading}>{controlsTitle ?? defaults.controlsTitle}</span>
      <span className={styles.folderHint}>{controlsHint ?? defaults.controlsHint}</span>
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
        {places}
        <ExplorerTools
          data={data}
          rules={[
            ...controlRules(children, data).filter(
              (rule) => !shareRules.some((override) => override.path === rule.path),
            ),
            ...shareRules,
          ]}
          onRestore={onRestore}
        />
      </div>

      <DatGui className="exploration-gui" data={data} labelWidth={160} onUpdate={onUpdate}>
        <DatFolder className="exploration-folder" closed={!defaultOpen} title={folderTitle}>
          {/* DatFolder clones every child, so drop the null ones conditional controls leave. */}
          {Children.toArray(children)}
        </DatFolder>
      </DatGui>
    </aside>
  );
}
