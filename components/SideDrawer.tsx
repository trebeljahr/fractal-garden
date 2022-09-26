import { useEffect, useState } from "react";
import styles from "../styles/SideDrawer.module.css";
import { RenderMarkdown } from "./Markdown";

interface Props {
  description: string;
}

export const SideDrawer = ({ description }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeDrawer = () => {
    setIsOpen(false);
  };

  const openDrawer = () => {
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <button className={styles.openDrawerBtn} onClick={openDrawer}>
        Open
      </button>
    );
  }

  return <OpenedDrawer description={description} closeDrawer={closeDrawer} />;
};

interface OpenDrawerProps extends Props {
  closeDrawer(): void;
}

const OpenedDrawer = ({ description, closeDrawer }: OpenDrawerProps) => {
  return (
    <div className={styles.openedDrawer}>
      <RenderMarkdown content={description} />
      <button className={styles.closeDrawerBtn} onClick={closeDrawer}>
        X
      </button>
    </div>
  );
};
