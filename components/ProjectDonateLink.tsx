"use client";

import type { ComponentPropsWithoutRef, SyntheticEvent } from "react";

type Props = ComponentPropsWithoutRef<"a"> & { href: string };

/** Keep the current page, including filters and hash, through donation checkout. */
export function ProjectDonateLink({ href, ...props }: Props) {
  function rememberPage(event: SyntheticEvent<HTMLAnchorElement>) {
    const destination = new URL(href);
    const current = new URL(window.location.href);
    if (current.protocol === "https:" || current.protocol === "http:") {
      destination.searchParams.set("returnTo", current.href);
    }
    event.currentTarget.href = destination.href;
  }

  return (
    <a
      {...props}
      href={href}
      onClick={rememberPage}
      onAuxClick={rememberPage}
      onPointerDown={rememberPage}
      onFocus={rememberPage}
      onContextMenu={rememberPage}
    />
  );
}
