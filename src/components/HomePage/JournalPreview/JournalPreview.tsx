import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./JournalPreview.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Chris from "../../../../public/images/chris.png";
import Img1 from "../../../../public/images/WhyWeExist.jpg";
import Img2 from "../../../../public/images/call.jpg";
import Img3 from "../../../../public/images/range.jpg";

// Placeholder articles. Swap these for the three latest Journal posts once
// the Journal is live (titles are from the site plan's first posts).
const posts = [
  {
    id: 1,
    category: "Software & booking",
    date: "06 Oct 2026",
    title: "Limo Anywhere alternatives: an honest comparison",
    href: "/journal/limo-anywhere-alternatives",
    src: Img1,
    alt: "An operator reviewing a booking calendar on a desktop computer",
  },
  {
    id: 2,
    category: "Winning accounts",
    date: "29 Sep 2026",
    title: "How to get corporate clients for a limo company",
    href: "/journal/how-to-get-corporate-clients-limo-company",
    src: Img2,
    alt: "A coordinator on the phone taking notes at her desk",
  },
  {
    id: 3,
    category: "Getting found",
    date: "22 Sep 2026",
    title: "SEO for limo companies: what actually moves rankings",
    href: "/journal/seo-for-limo-companies",
    src: Img3,
    alt: "A black SUV driving on the highway",
  },
];

export default function JournalPreview() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <EyeBrow text='Journal' />
            <h2 className={styles.heading}>Guides for operators.</h2>
            <p className={styles.copy}>
              Straight answers on booking software, getting found and winning
              accounts.
            </p>
            <div className={styles.btnContainer}>
              <Button
                href='/journal'
                btnType='black'
                text='Read the Journal'
                arrow
              />
            </div>
          </div>

          <div className={styles.right}>
            {posts.map((post) => (
              <Link href={post.href} className={styles.card} key={post.id}>
                <div className={styles.cardLeft}>
                  <div className={styles.cardTop}>
                    <div className={styles.meta}>
                      <span className={styles.category}>{post.category}</span>
                      <span className={styles.date}>{post.date}</span>
                    </div>
                    <h3 className={`${styles.title} subHeading`}>
                      {post.title}
                    </h3>
                  </div>
                  <div className={styles.author}>
                    <span className={styles.avatar}>
                      <Image
                        src={Chris}
                        alt=''
                        fill
                        sizes='36px'
                        className={styles.avatarImg}
                      />
                    </span>
                    <span className={styles.authorText}>
                      <span className={styles.authorName}>Chris Ware</span>
                      <span className={styles.authorRole}>Author</span>
                    </span>
                  </div>
                </div>
                <div className={styles.imgContainer}>
                  <Image
                    src={post.src}
                    alt={post.alt}
                    fill
                    sizes='(max-width: 568px) 100vw, 300px'
                    className={styles.img}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
