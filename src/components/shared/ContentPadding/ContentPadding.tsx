import styles from "./ContentPadding.module.css";

interface PaddingProps {
  children: React.ReactNode;
  paddingBottom?: string;
  borderDark?: boolean;
  borderDarkii?: boolean;
  lightGrayBorder?: boolean;
}

const ContentPadding = ({
  children,
  paddingBottom = "",
  borderDark = false,
  borderDarkii = false,
  lightGrayBorder = false,
}: PaddingProps) => {
  return (
    <div
      className={`${styles.container} ${styles[paddingBottom]} ${borderDark ? styles.borderDark : ""} ${borderDarkii ? styles.borderDarkii : ""}
        ${lightGrayBorder ? styles.lightGrayBorder : ""}
        `}
    >
      {children}
    </div>
  );
};
export default ContentPadding;
