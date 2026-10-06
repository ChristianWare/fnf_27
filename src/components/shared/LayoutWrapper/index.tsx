import ContentPadding from "../ContentPadding/ContentPadding";
import styles from "./LayoutWrapper.module.css";

interface Props {
  children: React.ReactNode;
  paddingNSNone?: string;
  pRightSmall?: string;
}

const LayoutWrapper = ({
  children,
  paddingNSNone = "",
  pRightSmall = "",
}: Props) => {
  return (
    <div className={`${styles.layout} ${styles[pRightSmall]}`}>
      <ContentPadding paddingNSNone={paddingNSNone}>{children}</ContentPadding>
    </div>
  );
};
export default LayoutWrapper;
