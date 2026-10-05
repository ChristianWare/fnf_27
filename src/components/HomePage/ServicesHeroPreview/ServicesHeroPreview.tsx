import styles from "./ServicesHeroPreview.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/leads.jpg";
import Img2 from "../../../../public/images/audit.jpg";
import Img3 from "../../../../public/images/website.jpg";

const data = [
  {
    id: 1,
    src: Img1,
  },
  {
    id: 2,
    src: Img2,
  },
  {
    id: 3,
    src: Img3,
  },
];

export default function ServicesHeroPreview() {
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <div className={styles.mapDataContainer}>
          {data.map((x) => (
            <div className={styles.imgContainer} key={x.id}>
              <Image src={x.src} alt='' title='' className={styles.img} fill />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.heading}>What we offer</div>
        <p className={styles.copy}>
          We build websites, booking software and leads tools. for black car &
          limo operators.
        </p>
      </div>
    </div>
  );
}
