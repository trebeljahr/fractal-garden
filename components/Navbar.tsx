import styles from "../styles/Navbar.module.css";
import Link from "next/link";
import { useState } from "react";

export const NavElement = () => {
  const [link, setLink] = useState("/");

  return (
    <nav className={styles.navigationElement}>
      <Link as={link} href={link}>
        <a>
          <span className="icon-arrow-left"></span>
        </a>
      </Link>
      <Link as={link} href={link}>
        <a>
          <span className="icon-home3"></span>
        </a>
      </Link>
      <Link as={link} href={link}>
        <a>
          <span className="icon-arrow-right"></span>
        </a>
      </Link>
    </nav>
  );
};
