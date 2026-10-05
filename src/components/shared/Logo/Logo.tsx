import styles from "./Logo.module.css";
import Image from "next/image";
import Link from "next/link";
import LogoImg from "../../../../public/logos/fnf_logo_black.png";

const Logo = () => {
  return (
    <Link href='/' className={styles.container}>
      <span className={styles.logoWrapper}>
        <Image
          src={LogoImg}
          alt='Fonts & Footers Logo'
          title='Fonts & Footers Logo'
          className={styles.logo}
        />
      </span>
      <span className={styles.text}>Fonts & Footers</span>
    </Link>
  );
};

export default Logo;
