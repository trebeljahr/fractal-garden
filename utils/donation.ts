export const DONATE_URL = "https://ricos.site/donate?from=fractal-garden";

// Set when a donor comes back from ricos.site/donate. Nothing reads it yet;
// a later inline ask stays quiet for 90 days after it.
export const SUPPORTED_AT_KEY = "donation-supported-at";

const SUPPORTED_PARAM = "supported";

function withoutSupportedParam(href: string) {
  const url = new URL(href, window.location.origin);
  url.searchParams.delete(SUPPORTED_PARAM);
  return url.pathname + url.search + url.hash;
}

// ricos.site/donate links back to /?supported=1 after a payment. Remember when,
// then drop only that parameter from the address bar, keeping the rest and the hash.
export function consumeSupportedParam() {
  const params = new URLSearchParams(window.location.search);
  if (params.get(SUPPORTED_PARAM) !== "1") return;

  try {
    localStorage.setItem(SUPPORTED_AT_KEY, String(Date.now()));
  } catch {
    // Storage blocked (private mode, disabled site data): nothing to remember.
  }

  // Next.js restores routes from history.state on Back/Forward, so clean its
  // copies of the URL too, or the parameter comes back.
  const state = window.history.state;
  const nextState =
    state?.__N && typeof state.url === "string" && typeof state.as === "string"
      ? { ...state, url: withoutSupportedParam(state.url), as: withoutSupportedParam(state.as) }
      : state;
  window.history.replaceState(nextState, "", withoutSupportedParam(window.location.href));
}
