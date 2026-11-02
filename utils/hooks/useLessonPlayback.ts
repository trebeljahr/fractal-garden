import { useEffect, useRef, useState } from "react";

// Playback is always reader initiated. It keeps going while the reader scrolls,
// and stops when the tab hides or the reader changes a setting.
export function useLessonPlayback(
  value: number,
  max: number,
  onChange: (value: number) => void,
  delay = 700,
  increment = 1,
) {
  const [playing, setPlaying] = useState(false);
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    if (!playing) return;
    const visibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
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
