import ContentPadding from "../ContentPadding/ContentPadding";
import styles from "./LayoutWrapper.module.css";

interface Props {
  children: React.ReactNode;
  paddingNSNone?: string;
}

const LayoutWrapper = ({ children, paddingNSNone = "" }: Props) => {
  return (
    <div className={styles.layout}>
      <ContentPadding paddingNSNone={paddingNSNone}>{children}</ContentPadding>
    </div>
  );
};
export default LayoutWrapper;
