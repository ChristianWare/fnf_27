import styles from "./PulseEyeBrow.module.css";

interface Props {
  text: string;
  /** "white" for dark sections. Black by default. */
  color?: "black" | "white";
}

/**
 * Same layout as <EyeBrow />, but with no background and a pulsing
 * "live" dot to the left of the text.
 *
 * <PulseEyeBrow text='Now booking' />
 * <PulseEyeBrow text='Now booking' color='white' />
 */
export default function PulseEyeBrow({ text, color = "black" }: Props) {
  return (
    <div className={`${styles.container} ${styles[color]}`}>
      <span className={styles.dot} aria-hidden='true' />
      <div className={styles.text}>{text}</div>
    </div>
  );
}
