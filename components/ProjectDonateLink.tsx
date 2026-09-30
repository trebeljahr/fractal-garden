"use client";

import type { ComponentPropsWithoutRef, SyntheticEvent } from "react";

type Props = ComponentPropsWithoutRef<"a"> & { href: string };

/** Keep the current page, including filters and hash, through donation checkout. */
export function ProjectDonateLink({ href, ...props }: Props) {
  const donationHref =
    process.env.NODE_ENV === "development"
      ? href.replace(/^https:\/\/ricos\.site(?=\/|$)/, "http://localhost:3713")
      : href;

  function rememberPage(event: SyntheticEvent<HTMLAnchorElement>) {
    const destination = new URL(donationHref);
    const current = new URL(window.location.href);
    // Local previews should stay local, even when serving a production build.
    if (["localhost", "127.0.0.1", "[::1]"].includes(current.hostname)) {
      destination.protocol = "http:";
      destination.host = "localhost:3713";
    }
    if (current.protocol === "https:" || current.protocol === "http:") {
      destination.searchParams.set("returnTo", current.href);
    }
    event.currentTarget.href = destination.href;
  }

  return (
    <a
      {...props}
      href={donationHref}
      onClick={rememberPage}
      onAuxClick={rememberPage}
      onPointerDown={rememberPage}
      onFocus={rememberPage}
      onContextMenu={rememberPage}
    />
  );
}
