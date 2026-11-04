import panelStyles from "../styles/ExplorerPanel.module.css";
import styles from "../styles/FractalConstruction.module.css";
import type { ConstructionLead } from "../utils/constructionLead";
import type { ConstructionView } from "../utils/constructionView";

export function ConstructionLeadStrip({
  lead,
  view,
  level,
  onChange,
}: {
  lead: ConstructionLead;
  view: ConstructionView;
  level: number;
  onChange: (path: string, value: number | string) => void;
}) {
  const { control } = lead;
  const value = view[control.path];
  const progress =
    control.kind === "range"
      ? (((value as number) - control.min) / (control.max - control.min)) * 100
      : 0;
  return (
    <div className={styles.lead} data-construction-lead={control.path}>
      {control.kind === "range" ? (
        <label className={styles.leadControl}>
          <span>
            {control.label} {control.format(value as number)}
          </span>
          <input
            className={panelStyles.numberSlider}
            type="range"
            min={control.min}
            max={control.max}
            step={control.step}
            value={value as number}
            aria-label={control.label}
            onChange={(event) => onChange(control.path, Number(event.target.value))}
            style={{
              backgroundImage: `linear-gradient(90deg,var(--explorer-accent) ${progress}%,var(--explorer-field) ${progress}%)`,
            }}
          />
        </label>
      ) : (
        <fieldset className={styles.leadOptions} aria-label={control.label}>
          {control.options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={value === option.value}
              onClick={() => onChange(control.path, option.value)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      )}
      <dl className={styles.leadReadout} data-construction-readout>
        {lead.readout(view, level).map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd style={{ color: row.tint }}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
