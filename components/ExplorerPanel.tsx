import { Children, isValidElement, type ReactNode, useRef, useState } from "react";
import DatGui, { DatFolder } from "react-dat-gui";
import styles from "../styles/ExplorerPanel.module.css";
import { type ControlRule, isRecord } from "../utils/explorerShare";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerTools } from "./ExplorerTools";
import { FractalHeader } from "./FractalHeader";

type Action = {
  label: string;
  onClick: () => void;
};

type PanelMode = "formula" | "pattern" | "scene";

type Props<T> = {
  actions?: Action[];
  children: ReactNode;
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

const CONTROLS_TITLE = "Fractal Studio Controls";

const PANEL_COPY: Record<PanelMode, { lines: string[] }> = {
  formula: { lines: [] },
  pattern: { lines: [] },
  scene: { lines: ["Drag to rotate. Scroll to zoom."] },
};

export function ExplorerPanel<T>({
  actions = [],
  children,
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
  const animationBeforePause = useRef<Record<string, boolean> | null>(null);
  const rules = [
    ...controlRules(children, data).filter(
      (rule) => !shareRules.some((override) => override.path === rule.path),
    ),
    ...shareRules,
  ];
  const animationKeys = rules
    .filter(
      (rule) =>
        rule.kind === "boolean" &&
        ["animateIterations", "autoRotate", "animateTrail", "animateAngle", "paused"].includes(
          rule.path,
        ),
    )
    .map((rule) => rule.path);
  const animationData: Record<string, unknown> = isRecord(data) ? data : {};
  const playing = animationKeys.some((key) =>
    key === "paused" ? !animationData[key] : animationData[key],
  );
  const animation = animationKeys.length
    ? {
        playing,
        onToggle: () => {
          const next: Record<string, boolean> = {};
          if (playing) {
            animationBeforePause.current = {};
            for (const key of animationKeys) {
              animationBeforePause.current[key] = Boolean(animationData[key]);
              next[key] = key === "paused";
            }
          } else {
            for (const key of animationKeys) {
              next[key] = animationBeforePause.current?.[key] ?? key !== "paused";
            }
            animationBeforePause.current = null;
          }
          onUpdate({ ...data, ...next });
        },
      }
    : undefined;
  const defaults = PANEL_COPY[mode];
  const [viewControlsHost, setViewControlsHost] = useState<HTMLDivElement | null>(null);

  const folderTitle = (
    <div className={styles.folderTitle}>
      <span className={styles.folderHeading}>{CONTROLS_TITLE}</span>
    </div>
  ) as unknown as string;

  return (
    <>
      <FractalHeader title={introTitle} lines={lines ?? defaults.lines} places={places} />
      <div className={styles.panel} data-fractal-chrome>
        {actions.length ? (
          <aside className={styles.introCard} aria-label="Fractal actions">
            <div className={styles.actions}>
              {actions.map((action) => (
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
          </aside>
        ) : null}
        <ExplorerTools
          data={data}
          viewControlsHost={viewControlsHost}
          rules={rules}
          animation={animation}
          onRestore={onRestore}
        />

        <div className={styles.studioGroup}>
          <div ref={setViewControlsHost} className={styles.viewControlsHost} />
          <aside className={styles.studio} aria-label={CONTROLS_TITLE}>
            <DatGui className="exploration-gui" data={data} labelWidth={160} onUpdate={onUpdate}>
              <DatFolder className="exploration-folder" closed={!defaultOpen} title={folderTitle}>
                {/* DatFolder clones every child, so drop the null ones conditional controls leave. */}
                {Children.toArray(children)}
              </DatFolder>
            </DatGui>
          </aside>
        </div>
      </div>
    </>
  );
}
