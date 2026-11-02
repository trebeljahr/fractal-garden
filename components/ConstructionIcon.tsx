export function ConstructionIcon({
  name,
}: {
  name: "previous" | "next" | "play" | "pause" | "reset" | "zoomIn" | "zoomOut";
}) {
  const paths = {
    previous: "m15 5-7 7 7 7",
    next: "m9 5 7 7-7 7",
    play: "m8 4 12 8-12 8Z",
    pause: "M8 5v14M16 5v14",
    reset: "M3 11a9 9 0 1 1 2 7M3 4v7h7",
    zoomIn: "M5 12h14M12 5v14",
    zoomOut: "M5 12h14",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
