import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ProjectsHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import Barry from "../../../../public/images/barry.png";
import NierLogo from "../../../../public/images/nierLogo.png";
// Placeholder photos. Swap in real Nier fleet photos when you have them.
import PhotoSmall from "../../../../public/images/cadiv.png";
import PhotoWide from "../../../../public/images/cadiMotion.png";

export default function ProjectsHero() {
  return (
    <section className={styles.container}>
      <Reveal onLoad step={150} />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='Our work' />
              <h1
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                Projects
              </h1>
              <p className={styles.copy} data-reveal>
                Real work for black car operators, plus two concept sites that
                show our range. The real project comes first, and every concept
                is labeled.
              </p>
            </div>

            {/* The client behind the work, where the reference has a
                client count and rating. */}
            <div className={styles.client} data-reveal>
              <span className={styles.avatars} aria-hidden='true'>
                <span className={styles.avatar}>
                  <Image
                    src={Barry}
                    alt=''
                    fill
                    sizes='44px'
                    className={styles.avatarImg}
                  />
                </span>
                <span className={`${styles.avatar} ${styles.avatarLogo}`}>
                  <Image
                    src={NierLogo}
                    alt=''
                    fill
                    sizes='44px'
                    className={styles.avatarLogoImg}
                  />
                </span>
              </span>
              <span className={styles.clientText}>
                Built with Nier Transportation
                <br />
                Phoenix · In business since 2004
              </span>
            </div>
          </div>

          <div className={styles.media}>
            <div className={`${styles.photo} ${styles.photoSmall}`} data-reveal>
              <Image
                src={PhotoSmall}
                alt='A black SUV parked below a sand dune'
                fill
                sizes='(max-width: 768px) 100vw, 38vw'
                loading='eager'
                className={styles.img}
              />
            </div>

            <div className={`${styles.photo} ${styles.photoWide}`} data-reveal>
              <div className={styles.frame}>
                <Image
                  src={PhotoWide}
                  alt='A black SUV driving down a city street'
                  fill
                  sizes='(max-width: 768px) 100vw, 62vw'
                  loading='eager'
                  fetchPriority='high'
                  className={styles.img}
                />
              </div>

              {/* Frosted glass over the photo. At 768px and below it sits
                  under the photo instead, so it doesn't cover the vehicle. */}
              <figure className={styles.quote}>
                <blockquote className={styles.quoteText}>
                  &ldquo;Fonts &amp; Footers built us a direct booking platform
                  that looks better than anything our competitors are running,
                  and our clients actually use it. It paid for itself in the
                  first month.&rdquo;
                </blockquote>
                <figcaption className={styles.quoteBy}>
                  <span className={styles.quoteAvatar}>
                    <Image
                      src={Barry}
                      alt=''
                      fill
                      sizes='36px'
                      className={styles.avatarImg}
                    />
                  </span>
                  <span className={styles.quoteWho}>
                    <span className={styles.quoteName}>Barry LaNier</span>
                    <span className={styles.quoteRole}>
                      Owner, Nier Transportation
                    </span>
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
