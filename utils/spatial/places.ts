export type SpatialPlace = {
  label: string;
  detail?: string;
  view?: {
    rotationX?: number;
    rotationY?: number;
    /** Eye distance as a fraction of the opening distance. */
    distanceScale?: number;
  };
};

export const DEFAULT_SPATIAL_PLACE: SpatialPlace = {
  label: "Default view",
  detail: "Return to the starting view.",
};

export const SPATIAL_PLACES = {
  quadraticKoch3d: [
    { label: "Raised cubes", view: { rotationX: 0, rotationY: 0, distanceScale: 0.65 } },
    { label: "Along the ridges", view: { rotationX: 12, rotationY: 55, distanceScale: 0.7 } },
  ],
  jerusalem: [
    { label: "Cross-shaped gaps", view: { rotationX: 0, rotationY: 0, distanceScale: 0.7 } },
    { label: "Corner view", view: { rotationX: 35, rotationY: 45, distanceScale: 0.75 } },
  ],
  kochSurface: [
    { label: "Face view", view: { rotationX: 90, rotationY: 0, distanceScale: 0.8 } },
    { label: "Raised peaks", view: { rotationX: 55, rotationY: 30, distanceScale: 0.75 } },
  ],
  flake: [
    { label: "Closer view", view: { distanceScale: 0.65 } },
    { label: "Side view", view: { rotationX: 0, rotationY: 90, distanceScale: 0.8 } },
  ],
  romanesco: [
    { label: "Spirals from above", view: { rotationX: 90, rotationY: 0, distanceScale: 0.8 } },
    { label: "Smaller florets", view: { rotationX: 50, rotationY: 28, distanceScale: 0.65 } },
  ],
  hilbert3d: [
    { label: "Square layers", view: { rotationX: 0, rotationY: 0, distanceScale: 0.75 } },
    { label: "Corner turns", view: { rotationX: 20, rotationY: 45, distanceScale: 0.65 } },
  ],
  mandelbulb: [
    { label: "Surface folds", view: { distanceScale: 0.5 } },
    { label: "Top view", view: { rotationX: 90, rotationY: 0, distanceScale: 0.65 } },
  ],
  lorenz: [
    { label: "Two loops", view: { rotationX: 0, rotationY: 0, distanceScale: 0.85 } },
    { label: "Side view", view: { rotationX: 0, rotationY: 90, distanceScale: 0.85 } },
  ],
  rossler: [
    { label: "Spiral face", view: { rotationX: 90, rotationY: 0, distanceScale: 0.85 } },
    { label: "Side view", view: { rotationX: 0, rotationY: 90, distanceScale: 0.85 } },
  ],
} satisfies Record<string, SpatialPlace[]>;
