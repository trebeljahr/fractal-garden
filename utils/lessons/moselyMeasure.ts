import { type ConstructionLead, formatShare } from "../constructionLead";

export type MoselyVariant = "lighter" | "heavier";

export const moselyCubes = (variant: MoselyVariant, level: number) =>
  (variant === "heavier" ? 19 : 18) ** level;

/** The volume left, as a share of the first cube's. */
export const moselyVolume = (variant: MoselyVariant, level: number) =>
  moselyCubes(variant, level) / 27 ** level;

/** The exposed surface area, for a first cube one unit wide. */
export const moselySurface = (variant: MoselyVariant, level: number) =>
  variant === "heavier"
    ? (12 * 19 ** level + 30 * 5 ** level) / (7 * 9 ** level)
    : (30 * 18 ** level + 48 * 5 ** level) / (13 * 9 ** level);

export const MOSELY_LEAD: ConstructionLead = {
  control: {
    kind: "options",
    path: "variant",
    label: "Snowflake type",
    options: [
      { value: "lighter", label: "Center removed" },
      { value: "heavier", label: "Center kept" },
    ],
  },
  readout: (view, level) => {
    const variant = view.variant as MoselyVariant;
    return [
      { label: "Cubes", value: moselyCubes(variant, level).toLocaleString("en-US") },
      { label: "Volume", value: formatShare(moselyVolume(variant, level)) },
      { label: "Surface area", value: moselySurface(variant, level).toFixed(2) },
    ];
  },
};
