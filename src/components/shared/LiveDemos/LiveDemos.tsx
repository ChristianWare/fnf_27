// "See it working": the real sites on the platform, side by side. Nier is
// a live client; Mesa Midnight is a concept with a test-mode booking flow
// anyone can try; Valley Vintage is still being built.

import Image, { type StaticImageData } from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import styles from "./LiveDemos.module.css";
import NierImg from "../../../../public/images/clients/nier/nier1.png";
import MesaImg from "../../../../public/images/clients/mesa_midnight/mm1.png";
import VintageImg from "../../../../public/images/clients/vintage/vintage.png";

type Demo = {
  name: string;
  /** Small label over the photo. */
  label: string;
  what: string;
  src: StaticImageData;
  alt: string;
  site?: string;
  /** The booking flow to try. */
  book?: string;
  /** The case study or concept page. */
  page: string;
  comingSoon?: boolean;
};

const demos: Demo[] = [
  {
    name: "Nier Transportation",
    label: "Live client · Phoenix",
    what: "A 20-year Phoenix black car company running its bookings, dispatch and payments on the Full Platform.",
    src: NierImg,
    alt: "The Nier Transportation home page",
    site: "https://www.niertransportation.com",
    page: "/projects/nier-transportation",
  },
  {
    name: "Mesa Midnight",
    label: "Live demo · test mode",
    what: "A full concept site you can book a test ride on. Nothing is charged; use Stripe's test card.",
    src: MesaImg,
    alt: "The Mesa Midnight home page",
    site: "https://www.mesamidnighttransport.com",
    book: "https://www.mesamidnighttransport.com/book",
    page: "/projects/mesa-midnight",
  },
  {
    name: "Valley Vintage Carriage Co.",
    label: "Coming soon",
    what: "Vintage wedding cars on the same platform, with date-first booking and deposits.",
    src: VintageImg,
    alt: "The Valley Vintage Carriage Co. home page design",
    page: "/projects/valley-vintage-carriage-co",
    comingSoon: true,
  },
];

export default function LiveDemos() {
  return (
    <section className={styles.container} aria-labelledby='live-demos'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='See it working' />
            <h2
              id='live-demos'
              className={`${styles.heading} h3`}
              data-reveal
              data-reveal-style='fade'
            >
              Don&apos;t take our word for it. Book a test ride.
            </h2>
            <p className={styles.copy} data-reveal>
              Every site here runs on the same platform. Visit them, and try
              the booking flow on Mesa Midnight from your phone.
            </p>
          </div>

          <ul className={styles.grid}>
            {demos.map((demo) => (
              <li className={styles.card} key={demo.name} data-reveal='each'>
                <div className={styles.media}>
                  <Image
                    src={demo.src}
                    alt={demo.alt}
                    fill
                    sizes='(max-width: 968px) 100vw, 33vw'
                    className={styles.img}
                  />
                  <span
                    className={`${styles.label} ${
                      demo.comingSoon ? styles.labelSoon : ""
                    }`}
                  >
                    {demo.label}
                  </span>
                </div>
                <div className={styles.body}>
                  <h3 className={styles.name}>{demo.name}</h3>
                  <p className={styles.what}>{demo.what}</p>
                  <div className={styles.buttons}>
                    {demo.book && (
                      <Button
                        href={demo.book}
                        target='_blank'
                        btnType='black'
                        text='Book a test ride'
                      />
                    )}
                    {demo.site && !demo.book && (
                      <Button
                        href={demo.site}
                        target='_blank'
                        btnType='black'
                        text='Visit the site'
                      />
                    )}
                    <Button
                      href={demo.page}
                      btnType='gray'
                      text={demo.comingSoon ? "See the concept" : "Read more"}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </LayoutWrapper>
    </section>
  );
}
