import { CSSProperties, ComponentProps, useEffect, useId, useRef, useState } from "react";
import { DatBoolean, DatSelect } from "react-dat-gui";
import styles from "../styles/ExplorerPanel.module.css";

const { ChromePicker } = require("react-color");

const LABEL_OVERRIDES: Record<string, string> = {
  angle: "Angle",
  animateAngle: "Animate angle",
  animateIterations: "Animate growth",
  autoRotate: "Auto rotate",
  background: "Backdrop",
  branches: "Branches",
  cImag: "C imaginary",
  cReal: "C real",
  cameraDistance: "Camera distance",
  color: "Color",
  columns: "Columns",
  detail: "Detail",
  exposure: "Exposure",
  fernToUse: "Fern style",
  fillCircles: "Fill circles",
  fillColor: "Fill color",
  fillPolygons: "Fill polygons",
  fillSquares: "Fill squares",
  fillTriangles: "Fill triangles",
  holeColor: "Hole color",
  includeCenter: "Center copy",
  iterations: "Iterations",
  lengthFactor: "Branch shrink",
  lineWidth: "Line width",
  maxIterations: "Depth",
  minOrbitLength: "Minimum trail",
  offsetX: "Pan X",
  offsetY: "Pan Y",
  option: "Inspiration",
  plotIterations: "Plotted steps",
  pointAlpha: "Density",
  pointSize: "Point size",
  preset: "Preset",
  ratio: "Child scale",
  rootWidth: "Trunk width",
  rotationX: "Tilt",
  rotationY: "Turn",
  samplesPerFrame: "Samples per frame",
  settleIterations: "Settle steps",
  showFaces: "Solid faces",
  showOuterCircle: "Outer circle",
  showWireframe: "Wireframe",
  sides: "Sides",
  strokeCircles: "Outline circles",
  strokeColor: "Line color",
  strokePolygons: "Outline polygons",
  strokeSquares: "Outline squares",
  variant: "Variant",
  widthFactor: "Branch taper",
};

function normalizeLabelValue(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[._/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatWord(word: string) {
  if (/^[A-Z]$/.test(word)) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function humanizePath(path: string) {
  const leaf = path.split(".").pop() || path;
  if (LABEL_OVERRIDES[leaf]) {
    return LABEL_OVERRIDES[leaf];
  }

  return normalizeLabelValue(leaf)
    .split(" ")
    .map(formatWord)
    .join(" ");
}

function humanizeOption(option: string) {
  return normalizeLabelValue(option)
    .split(" ")
    .map(formatWord)
    .join(" ");
}

type BooleanProps = ComponentProps<typeof DatBoolean>;
type SelectProps = ComponentProps<typeof DatSelect>;
type ControlValue = Record<string, unknown>;

type SharedControlProps = {
  className?: string;
  data?: ControlValue;
  label?: string;
  labelWidth?: number | string;
  path: string;
  style?: CSSProperties;
  _onUpdateValue?: (path: string, value: unknown) => void;
};

type ColorProps = SharedControlProps;

type NumberProps = SharedControlProps & {
  disableSlider?: boolean | null;
  max?: number | null;
  min?: number | null;
  step?: number | null;
};

type ColorResult = {
  hex: string;
};

const LIGHT_SWATCH_TEXT = "rgba(245, 241, 209, 0.96)";
const DARK_SWATCH_TEXT = "rgba(19, 26, 31, 0.88)";

const CHROME_PICKER_STYLES = {
  default: {
    picker: {
      width: "100%",
      background: "transparent",
      boxShadow: "none",
      borderRadius: "0",
      boxSizing: "border-box" as const,
      fontFamily: '"Montserrat", sans-serif',
    },
    saturation: {
      borderRadius: "16px",
      overflow: "hidden",
      paddingBottom: "63%",
    },
    body: {
      padding: "0.95rem 0 0",
    },
    controls: {
      display: "flex",
      alignItems: "center",
      gap: "0.9rem",
    },
    color: {
      width: "2.5rem",
    },
    swatch: {
      width: "2.5rem",
      height: "2.5rem",
      borderRadius: "999px",
      marginTop: "0",
      overflow: "hidden",
    },
    hue: {
      height: "14px",
      borderRadius: "999px",
      marginBottom: "0",
    },
  },
  disableAlpha: {
    color: {
      width: "2.5rem",
    },
    swatch: {
      width: "2.5rem",
      height: "2.5rem",
      marginTop: "0",
    },
    hue: {
      marginBottom: "0",
    },
  },
};

function joinClassNames(...classNames: Array<string | null | undefined | false>) {
  return classNames.filter(Boolean).join(" ");
}

function getValueFromPath(data: ControlValue | undefined, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as ControlValue)[key];
  }, data);
}

function getLabelWidthStyle(labelWidth?: number | string) {
  return { width: labelWidth };
}

function getControlWidthStyle(labelWidth?: number | string) {
  if (labelWidth === undefined) {
    return undefined;
  }

  const width =
    typeof labelWidth === "number"
      ? `calc(100% - ${labelWidth}px)`
      : `calc(100% - ${labelWidth})`;

  return { width };
}

function getDecimalPlaces(step?: number | null) {
  if (!step || !Number.isFinite(step)) {
    return 0;
  }

  const normalized = step.toString().toLowerCase();
  if (normalized.includes("e-")) {
    return Number(normalized.split("e-")[1] || 0);
  }

  return normalized.includes(".") ? normalized.split(".")[1].length : 0;
}

function clampValue(value: number, min?: number | null, max?: number | null) {
  if (typeof min === "number" && value < min) {
    return min;
  }

  if (typeof max === "number" && value > max) {
    return max;
  }

  return value;
}

function constrainNumber(
  value: number,
  min?: number | null,
  max?: number | null,
  step?: number | null
) {
  let next = clampValue(value, min, max);

  if (typeof step === "number" && Number.isFinite(step) && step > 0) {
    const base = typeof min === "number" ? min : 0;
    const steps = Math.round((next - base) / step);
    next = base + steps * step;
  }

  next = clampValue(next, min, max);

  const decimalPlaces = getDecimalPlaces(step);
  return Number(next.toFixed(decimalPlaces));
}

function formatNumberValue(value: number, step?: number | null) {
  const decimalPlaces = getDecimalPlaces(step);
  return decimalPlaces > 0 ? value.toFixed(decimalPlaces) : String(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasFiniteRange(min?: number | null, max?: number | null) {
  return (
    typeof min === "number" &&
    typeof max === "number" &&
    Number.isFinite(min) &&
    Number.isFinite(max)
  );
}

function normalizeHexColor(value: string) {
  const candidate = value.trim().replace(/^#/, "");

  if (/^[\da-fA-F]{3}$/.test(candidate)) {
    return `#${candidate
      .split("")
      .map((digit) => `${digit}${digit}`)
      .join("")
      .toUpperCase()}`;
  }

  if (/^[\da-fA-F]{6}$/.test(candidate)) {
    return `#${candidate.toUpperCase()}`;
  }

  return null;
}

function parseHexChannel(channel: string) {
  return Number.parseInt(channel, 16);
}

function getContrastingSwatchText(hexColor: string) {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) {
    return LIGHT_SWATCH_TEXT;
  }

  const red = parseHexChannel(normalized.slice(1, 3)) / 255;
  const green = parseHexChannel(normalized.slice(3, 5)) / 255;
  const blue = parseHexChannel(normalized.slice(5, 7)) / 255;
  const channels = [red, green, blue].map((channel) =>
    channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  );
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;

  return luminance > 0.58 ? DARK_SWATCH_TEXT : LIGHT_SWATCH_TEXT;
}

export const PanelColor = ({
  className,
  data,
  label,
  labelWidth,
  path,
  style,
  _onUpdateValue,
}: ColorProps) => {
  const pickerId = useId();
  const containerRef = useRef<HTMLLIElement | null>(null);
  const rawValue = getValueFromPath(data, path);
  const normalizedValue =
    typeof rawValue === "string" ? normalizeHexColor(rawValue) : null;
  const value = normalizedValue ?? "#000000";
  const [draftValue, setDraftValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const labelText = label ?? humanizePath(path);
  const swatchTextColor = getContrastingSwatchText(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const updateColor = (nextColor: string) => {
    const normalized = normalizeHexColor(nextColor);
    if (!normalized) {
      return false;
    }

    _onUpdateValue?.(path, normalized);
    return true;
  };

  return (
    <li
      className={joinClassNames("cr", "color", className)}
      ref={containerRef}
      style={style}
    >
      <div className={styles.customControl}>
        <span className="label-text" style={getLabelWidthStyle(labelWidth)}>
          {labelText}
        </span>
        <div
          className={styles.colorControl}
          style={getControlWidthStyle(labelWidth)}
        >
          <button
            aria-controls={pickerId}
            aria-expanded={isOpen}
            className={styles.colorButton}
            onClick={() => setIsOpen((open) => !open)}
            style={{
              backgroundColor: value,
              color: swatchTextColor,
            }}
            type="button"
          >
            <span className={styles.colorButtonLabel}>{value}</span>
            <span className={styles.colorButtonChip} />
          </button>
          {isOpen ? (
            <div className={styles.customColorPopover} id={pickerId}>
              <div className={styles.customColorPicker}>
                <ChromePicker
                  color={value}
                  defaultView="hex"
                  disableAlpha
                  onChange={(color: ColorResult) => {
                    updateColor(color.hex);
                  }}
                  styles={CHROME_PICKER_STYLES}
                  width="100%"
                />
              </div>
              <label className={styles.colorField}>
                <span className={styles.colorFieldLabel}>Hex value</span>
                <input
                  autoCapitalize="off"
                  autoCorrect="off"
                  className={styles.colorTextInput}
                  onBlur={() => {
                    if (!updateColor(draftValue)) {
                      setDraftValue(value);
                    }
                  }}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setDraftValue(nextValue);

                    updateColor(nextValue);
                  }}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      if (!updateColor(draftValue)) {
                        setDraftValue(value);
                      }
                      setIsOpen(false);
                    }
                  }}
                  spellCheck={false}
                  type="text"
                  value={draftValue}
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
};

export const PanelBoolean = ({ label, path, ...props }: BooleanProps) => (
  <DatBoolean label={label ?? humanizePath(path)} path={path} {...props} />
);

export const PanelNumber = ({
  className,
  data,
  disableSlider,
  label,
  labelWidth,
  max,
  min,
  path,
  step,
  style,
  _onUpdateValue,
}: NumberProps) => {
  const rawValue = getValueFromPath(data, path);
  const initialValue = isFiniteNumber(rawValue)
    ? rawValue
    : Number(rawValue ?? 0) || 0;
  const value = constrainNumber(initialValue, min, max, step);
  const [draftValue, setDraftValue] = useState(formatNumberValue(value, step));
  const labelText = label ?? humanizePath(path);
  const hasSlider =
    disableSlider !== true &&
    hasFiniteRange(min, max);
  const sliderMin = hasSlider ? (min as number) : 0;
  const sliderMax = hasSlider ? (max as number) : 0;
  const sliderPercent =
    hasSlider && sliderMax !== sliderMin
      ? (((value - sliderMin) / (sliderMax - sliderMin)) * 100).toFixed(2)
      : "0.00";
  const numericStep =
    typeof step === "number" && Number.isFinite(step) && step > 0 ? step : 1;

  useEffect(() => {
    setDraftValue(formatNumberValue(value, step));
  }, [step, value]);

  const updateValue = (nextValue: number) => {
    _onUpdateValue?.(path, constrainNumber(nextValue, min, max, step));
  };

  const commitDraftValue = () => {
    const parsed = Number(draftValue);
    if (Number.isFinite(parsed)) {
      updateValue(parsed);
      return;
    }

    setDraftValue(formatNumberValue(value, step));
  };

  return (
    <li
      className={joinClassNames("cr", "number", className)}
      style={style}
    >
      <div className={styles.customControl}>
        <span className="label-text" style={getLabelWidthStyle(labelWidth)}>
          {labelText}
        </span>
        <div
          className={joinClassNames(
            styles.numberControls,
            !hasSlider && styles.numberControlsCompact
          )}
          style={getControlWidthStyle(labelWidth)}
        >
          {hasSlider ? (
            <input
              className={styles.numberSlider}
              max={sliderMax}
              min={sliderMin}
              onChange={(event) => updateValue(Number(event.target.value))}
              step={numericStep}
              style={{
                background: `linear-gradient(90deg, rgba(245, 204, 117, 0.86) 0%, rgba(245, 170, 111, 0.88) ${sliderPercent}%, rgba(4, 8, 10, 0.66) ${sliderPercent}%, rgba(4, 8, 10, 0.66) 100%)`,
              }}
              type="range"
              value={value}
            />
          ) : null}

          <div className={styles.numberField}>
            <input
              className={styles.numberInput}
              inputMode={numericStep < 1 ? "decimal" : "numeric"}
              onBlur={commitDraftValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDraftValue(nextValue);

                if (
                  nextValue === "" ||
                  nextValue === "-" ||
                  nextValue === "." ||
                  nextValue === "-."
                ) {
                  return;
                }

                const parsed = Number(nextValue);
                if (Number.isFinite(parsed)) {
                  updateValue(parsed);
                }
              }}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitDraftValue();
                }
              }}
              spellCheck={false}
              type="text"
              value={draftValue}
            />
            <div className={styles.numberNudges}>
              <button
                aria-label={`Increase ${labelText}`}
                className={styles.nudgeButton}
                onClick={() => updateValue(value + numericStep)}
                type="button"
              >
                <span className={styles.nudgeArrowUp} />
              </button>
              <button
                aria-label={`Decrease ${labelText}`}
                className={styles.nudgeButton}
                onClick={() => updateValue(value - numericStep)}
                type="button"
              >
                <span className={styles.nudgeArrowDown} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export const PanelSelect = ({
  label,
  optionLabels,
  options,
  path,
  ...props
}: SelectProps) => (
  <DatSelect
    label={label ?? humanizePath(path)}
    optionLabels={
      optionLabels ?? options?.map((option) => humanizeOption(String(option)))
    }
    options={options}
    path={path}
    {...props}
  />
);
