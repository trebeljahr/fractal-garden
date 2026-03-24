import * as React from "react";

declare module "react-dat-gui" {
  interface DatGuiProps {
    labelWidth?: number | string;
  }

  interface DatFolderProps {
    className?: string;
    style?: React.CSSProperties;
    title: React.ReactNode;
  }

  interface DatSelectProps {
    optionLabels?: string[];
  }
}
