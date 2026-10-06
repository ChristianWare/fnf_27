import styles from "./EyeBrow.module.css";

interface Props {
  text: string;
  /** "white" for dark sections. Black by default. */
  color?: string;
}

export default function EyeBrow({ text, color = "" }: Props) {
  return (
    <div className={`${styles.container} ${styles[color] ?? ""}`}>
      <div className={styles.dot} />
      <div className={styles.text}>{text}</div>
    </div>
  );
}
