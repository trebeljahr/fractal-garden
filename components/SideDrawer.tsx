import styles from "../styles/SideDrawer.module.css";
import { scrollToDescription } from "../utils/scrollToDescription";
import { RenderMarkdown } from "./Markdown";
import { RelatedFractals } from "./RelatedFractals";

interface Props {
  description: string;
}

export const SideDrawer = ({ description }: Props) => {
  return (
    <section
      className={styles.descriptionSection}
      aria-label="About this fractal"
      data-fractal-description-section
    >
      <button
        className={styles.learnMore}
        aria-label="Learn more about this fractal"
        type="button"
        onClick={scrollToDescription}
      >
        <span>
          Learn more<span className={styles.learnMoreDetail}> about this fractal</span>
        </span>
        <span className={styles.caret} aria-hidden="true" />
      </button>
      <div
        tabIndex={-1}
        className={styles.openedDrawer}
        id="fractal-description"
        data-fractal-description={true}
      >
        <div className={styles.drawerContent}>
          <RenderMarkdown content={description} />
          <RelatedFractals />
        </div>
      </div>
    </section>
  );
};
