import styles from "../styles/SideDrawer.module.css";
import { RenderMarkdown } from "./Markdown";
import { RelatedFractals } from "./RelatedFractals";

interface Props {
  description: string;
}

export const SideDrawer = ({ description }: Props) => {
  return (
    <div className={styles.openedDrawer} id="fractal-description" data-fractal-description={true}>
      <div className={styles.drawerContent}>
        <RenderMarkdown content={description} />
        <RelatedFractals />
      </div>
    </div>
  );
};
