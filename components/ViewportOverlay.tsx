import styles from "../styles/ViewportOverlay.module.css";

type Action = {
  label: string;
  onClick: () => void;
};

type Props = {
  title: string;
  lines: string[];
  actions: Action[];
};

export const ViewportOverlay = ({ title, lines, actions }: Props) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.title}>{title}</div>
      <div className={styles.copy}>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className={styles.actions}>
        {actions.map((action) => (
          <button
            className={styles.button}
            key={action.label}
            onClick={action.onClick}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};
