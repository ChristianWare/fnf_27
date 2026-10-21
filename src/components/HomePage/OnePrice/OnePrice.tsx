// The Full Platform in one look: three tools, one flat price. Sits right
// under the proof video, so the bundle is clear before anything else.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import styles from "./OnePrice.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/blog/blog13.png";
import Img2 from "../../../../public/images/blog/blog15.png";
import Img3 from "../../../../public/images/blog/blog14.png";

const tools = [
  {
    id: 1,
    name: "Website",
    job: "Gets you found",
    text: "A custom site with a page for every airport, route and city you serve, built for the searches riders make.",
    src: Img1,
  },
  {
    id: 2,
    name: "Booking & dispatch",
    job: "Runs the rides",
    text: "Riders book and pay on your site, you assign drivers, and every trip is tracked. No per-booking fees.",
    src: Img2,
  },
  {
    id: 3,
    name: "Leads tool",
    job: "Finds the accounts",
    text: "Hotels, venues, corporate offices and events near you, scored every morning with the person to contact.",
    src: Img3,
  },
];

export default function OnePrice() {
  return (
    <section className={styles.container} aria-labelledby='one-price'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='The Full Platform' />
            <h2
              id='one-price'
              className={`${styles.heading} h3`}
              data-reveal
              data-reveal-style='fade'
            >
              One price, three tools. Most operators pay for these separately,
              if they have them at all.
            </h2>
          </div>

          <ol className={styles.tools}>
            {tools.map((tool) => (
              <li className={styles.tool} key={tool.id} data-reveal='each'>
                <div className={styles.imgContainr}>
                  <Image
                    src={tool.src}
                    alt=''
                    title=''
                    fill
                    className={styles.img}
                  />
                </div>
                <span className={styles.mono}>
                  {/* <span className={styles.number}>0{tool.id}</span> -  */}

                  {tool.job}
                </span>
                <h3 className={`${styles.name} h5`}>{tool.name}</h3>
                <p className={styles.text}>{tool.text}</p>
              </li>
            ))}
          </ol>

          <div className={styles.bar} data-reveal>
            <p className={styles.price}>
              <strong>$499/mo</strong> · $500 setup · all three included ·
              unlimited drivers and vehicles · month to month, cancel anytime
            </p>
            <div className={styles.buttons}>
              <Button
                href='/services/booking-software'
                btnType='white'
                text='See the Full Platform'
                arrow
              />
              <Button
                href='https://www.mesamidnighttransport.com/book'
                target='_blank'
                btnType='green'
                text='Try a live demo'
                arrow
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
