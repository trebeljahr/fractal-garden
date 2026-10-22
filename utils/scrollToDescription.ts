export function scrollToDescription() {
  const element = document.getElementById("fractal-description");
  if (!element) return;

  element.focus({ preventScroll: true });
  element.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}
