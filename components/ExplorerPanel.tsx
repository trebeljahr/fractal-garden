import { Children, cloneElement, isValidElement, type ReactNode, useState } from "react";
import DatGui, { DatFolder } from "react-dat-gui";
import styles from "../styles/ExplorerPanel.module.css";
import { explorerControlNodes } from "../utils/explorerControlNodes";
import { type ControlRule, isRecord } from "../utils/explorerShare";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerTools } from "./ExplorerTools";
import { type ConstructionControls, useConstructionControls } from "./FractalConstruction";
import { FractalHeader } from "./FractalHeader";

type Action = {
  label: string;
  onClick: () => void;
};

type PanelMode = "formula" | "pattern" | "scene";

type Props<T> = {
  actions?: Action[];
  children: ReactNode;
  explorationControls?: ReactNode;
  /** Resolve conditional fields against the construction view’s own settings. */
  constructionControls?: ConstructionControls;
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
  explorationControls,
  constructionControls,
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
  const registeredConstruction = useConstructionControls(constructionControls ?? children);
  const hasConstruction = constructionControls !== undefined || registeredConstruction;
  const mainControls = hasConstruction ? explorationControls : children;
  const rules = [
    ...controlRules(children, data).filter(
      (rule) => !shareRules.some((override) => override.path === rule.path),
    ),
    ...shareRules,
  ];
  const defaults = PANEL_COPY[mode];
  const [viewControlsHost, setViewControlsHost] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <FractalHeader
        title={introTitle}
        lines={lines ?? defaults.lines}
        controls={
          <div className={`${styles.panel} ${styles.headerControls}`}>
            <div className={styles.studioGroup} data-fractal-studio>
              <div ref={setViewControlsHost} className={styles.viewControlsHost} />
              {places && <div className={styles.placesHost}>{places}</div>}
              {mainControls && (
                <FractalStudioControls
                  data={data}
                  defaultOpen={defaultOpen}
                  onUpdate={onUpdate}
                  title={hasConstruction ? "Exploration controls" : CONTROLS_TITLE}
                >
                  {mainControls}
                </FractalStudioControls>
              )}
            </div>
          </div>
        }
      />
      <div className={styles.panel} data-fractal-chrome>
        {actions.length ? (
          <aside className={styles.introCard} aria-label="Fractal actions" data-fractal-actions>
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
          onRestore={onRestore}
        />
      </div>
    </>
  );
}

/** DatGui binds direct children; use the shared flattening and give nested fields unique keys. */
function studioControls(children: ReactNode): ReactNode[] {
  return explorerControlNodes(children).map((child) =>
    isValidElement(child) ? cloneElement(child, { key: child.props.path ?? child.key }) : child,
  );
}

/** Studio fields without page-level sharing or header registration. */
export function FractalStudioControls<T>({
  data,
  children,
  defaultOpen = false,
  onUpdate,
  title = CONTROLS_TITLE,
}: Pick<Props<T>, "data" | "children" | "defaultOpen" | "onUpdate"> & { title?: string }) {
  const folderTitle = (
    <div className={styles.folderTitle}>
      <span className={styles.folderHeading}>{title}</span>
    </div>
  ) as unknown as string;
  return (
    <aside className={styles.studio} aria-label={title}>
      <DatGui className="exploration-gui" data={data} labelWidth={160} onUpdate={onUpdate}>
        <DatFolder className="exploration-folder" closed={!defaultOpen} title={folderTitle}>
          {studioControls(children)}
        </DatFolder>
      </DatGui>
    </aside>
  );
}
