export function scrollToDescription() {
  const element = document.getElementById("fractal-description");
  if (!element) return;

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
