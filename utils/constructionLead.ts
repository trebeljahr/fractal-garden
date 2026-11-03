export type LeadControl =
  | {
      kind: "range";
      path: string;
      label: string;
      min: number;
      max: number;
      step: number;
      format: (value: number) => string;
    }
  | {
      kind: "options";
      path: string;
      label: string;
      options: { value: string; label: string }[];
    };

/**
 * The one control an article leans on, with what it changes. The construction player shows these
 * in the figure instead of in its collapsed panel.
 */
export type ConstructionLead = {
  /** Settings only the figure has. The explorer above it never sees them. */
  initial?: Record<string, unknown>;
  control: LeadControl;
  readout: (view: Record<string, unknown>, level: number) => { label: string; value: string }[];
};

/** A share as a percentage, keeping the digits that matter once it gets small. */
export function formatShare(share: number) {
  const percent = 100 * share;
  return percent >= 1 ? `${percent.toFixed(1)}%` : `${Number(percent.toPrecision(2))}%`;
}
