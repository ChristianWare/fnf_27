import styles from "./Logo.module.css";
import Image from "next/image";
import Link from "next/link";
import LogoImg from "../../../../public/logos/fnf_logo_black.png";

interface Props {
  noText?: boolean;
  blur?: string;
  logoLarge?: string;
}

const Logo = ({ noText, blur = "", logoLarge = "" }: Props) => {
  return (
    <Link href='/' className={styles.container}>
      <span className={`${styles.logoWrapper} ${styles[blur]}`}>
        <Image
          src={LogoImg}
          alt='Fonts & Footers Logo'
          title='Fonts & Footers Logo'
          className={`${styles.logo} ${styles[logoLarge]}`}
        />
      </span>
      {!noText && <span className={styles.text}>Fonts & Footers</span>}
    </Link>
  );
};

export default Logo;
