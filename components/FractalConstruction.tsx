import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "../styles/FractalConstruction.module.css";
import { constructionFrame } from "../utils/constructionFrame";
import { useReducedMotion } from "../utils/hooks/useReducedMotion";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import type { RendererKind } from "../utils/render/registry";
import { LessonFrame, LessonSteps } from "./lessons/LessonFrame";

export type ConstructionSpec = {
  identity: string;
  kind: RendererKind;
  params: unknown;
  width: number;
  height: number;
  min: number;
  max: number;
  stepDelay?: number;
};

const ConstructionContext = createContext<ConstructionSpec | null>(null);
const RegistrationContext = createContext<Dispatch<SetStateAction<ConstructionSpec | null>>>(
  () => {},
);

export function FractalConstructionProvider({ children }: { children: ReactNode }) {
  const [construction, setConstruction] = useState<ConstructionSpec | null>(null);
  return (
    <RegistrationContext.Provider value={setConstruction}>
      <ConstructionContext.Provider value={construction}>{children}</ConstructionContext.Provider>
    </RegistrationContext.Provider>
  );
}

export function useConstructionRegistration(construction: ConstructionSpec | null) {
  const register = useContext(RegistrationContext);
  useEffect(() => {
    register(construction);
    return () => register(null);
  }, [register, construction]);
}

function ConstructionSurface({
  spec,
  level,
  onReady,
}: {
  spec: ConstructionSpec;
  level: number;
  onReady: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const params = useMemo(
    () => constructionFrame(spec.kind, spec.params, level, spec.width, spec.height),
    [spec.kind, spec.params, spec.width, spec.height, level],
  );
  const { containerRef } = useRenderSurface({
    kind: "construction",
    params: { kind: spec.kind, params, level, animate: !reducedMotion },
    width: 720,
    height: 480,
    shareView: false,
    onEvent: (event) => {
      if (event.type === "rendered") onReady();
    },
  });
  return <div ref={containerRef} className={styles.surface} />;
}

function ConstructionSequence({ spec }: { spec: ConstructionSpec }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const max = Math.max(0, spec.max - spec.min);
  const selected = Math.min(step, max);
  const level = spec.min + selected;

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (!entry.isIntersecting) setReady(false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <LessonFrame title="Watch the construction" kind="full-construction">
      <p>Step forward to watch cuts open and new growth take shape.</p>
      <div
        ref={frame}
        className={styles.frame}
        role="img"
        aria-label={`Fractal construction at level ${level}`}
        data-construction-level={level}
      >
        {visible && (
          <ConstructionSurface spec={spec} level={level} onReady={() => setReady(true)} />
        )}
      </div>
      <p aria-live="polite" aria-atomic="true">
        Construction level {level}
      </p>
      <LessonSteps
        label="Fractal construction"
        step={selected}
        max={max}
        onChange={setStep}
        disabled={!ready}
        duration={max * Math.max(1500, spec.stepDelay ?? 0)}
      />
    </LessonFrame>
  );
}

export function FractalConstruction() {
  const spec = useContext(ConstructionContext);
  return spec ? <ConstructionSequence key={spec.identity} spec={spec} /> : null;
}
