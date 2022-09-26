import { useEffect, useState } from "react";
import styles from "../styles/SideDrawer.module.css";
import { RenderMarkdown } from "./Markdown";

interface Props {
  description: string;
}

export const SideDrawer = ({ description }: Props) => {
  return (
    <div className={styles.openedDrawer}>
      <div className={styles.drawerContent}>
        <RenderMarkdown content={description} />
      </div>
    </div>
  );
};
