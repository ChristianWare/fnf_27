import styles from './EyeBrow.module.css'

interface Props {
    text: string
}

export default function EyeBrow({ text }: Props) {
  return (
    <div className={styles.container}>
        <div className={styles.dot} />
        <div className={styles.text}>{text}</div>
    </div>
  )
}
