import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("quadratic-snowflake.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const QuadraticSnowflake = ({ description }: Props) => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Quadratic Snowflake" />
      <SideDrawer description={description} />

      <NavElement />
    </main>
  );
};

export default QuadraticSnowflake;
