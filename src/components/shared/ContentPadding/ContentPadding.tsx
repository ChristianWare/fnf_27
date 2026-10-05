import styles from "./ContentPadding.module.css";

interface PaddingProps {
  children: React.ReactNode;
  paddingBottom?: string;
  paddingNSNone?: string;
}

const ContentPadding = ({
  children,
  paddingBottom = "",
  paddingNSNone = "",
}: PaddingProps) => {
  return (
    <div
      className={`${styles.container} ${styles[paddingBottom]} ${styles[paddingNSNone]} $
        `}
    >
      {children}
    </div>
  );
};
export default ContentPadding;
