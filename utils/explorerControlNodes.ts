import { Children, Fragment, isValidElement, type ReactNode } from "react";

// DatGui injects values into direct children; fragments must not hide controls.
export function explorerControlNodes(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? explorerControlNodes(child.props.children)
      : [child],
  );
}
