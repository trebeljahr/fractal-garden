import { useEffect, useRef, useState } from "react";

// Playback is always reader initiated. Stop when the lesson leaves the screen,
// the tab hides, or the reader changes a setting.
export function useLessonPlayback(
  value: number,
  max: number,
  onChange: (value: number) => void,
  delay = 700,
  increment = 1,
) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLFieldSetElement>(null);
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    if (!playing) return;
    const element = ref.current;
    const stop = () => setPlaying(false);
    const visibility = () => {
      if (document.hidden) stop();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    if (element) observer.observe(element);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playing]);
  useEffect(() => {
    if (!playing) return;
    if (value >= max) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => change.current(Math.min(max, value + increment)), delay);
    return () => window.clearTimeout(timer);
  }, [playing, value, max, delay, increment]);
  return {
    ref,
    playing,
    toggle: () => {
      if (!playing && value >= max) change.current(0);
      setPlaying(!playing);
    },
    play: () => {
      change.current(0);
      setPlaying(true);
    },
    change: (next: number) => {
      setPlaying(false);
      onChange(next);
    },
  };
}
