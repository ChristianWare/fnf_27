"use client";

// Nier Transportation, the operator the platform was built with. The same
// layout as the case study on the home page.

import { useState } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WebsitesCaseStudy.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import Location from "@/components/shared/icons/Location/Location";
import Cursor from "@/components/shared/icons/Cursor/Cursor";
import FeesIcon from "@/components/shared/icons/FeesIcon/FeesIcon";
import Plane from "@/components/shared/icons/Plane/Plane";
import NierHomePage from "../../../../public/images/nierHomePage.png";
import Reveal from "@/components/shared/Reveal/Reveal";

const facts = [
  { id: 1, text: "40 city pages", Icon: Location },
  { id: 2, text: "3 airport pages", Icon: Plane },
  { id: 3, text: "Online booking 24/7", Icon: Cursor },
  { id: 4, text: "$0 per-booking fees", Icon: FeesIcon },
];

export default function WebsitesCaseStudy() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className={styles.container} aria-labelledby='websites-case-study'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.leftTop}>
              <EyeBrow text='Real results' />
              <h2
                id='websites-case-study'
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                Built for a Working Operator
              </h2>
              <p className={styles.copy} data-reveal>
                Nier Transportation in Phoenix runs its whole business on a site
                we built: 40 city pages, online booking 24/7, and $0 per-booking
                fees.
              </p>
              <figure className={styles.quote} data-reveal>
                <blockquote className={styles.quoteText}>
                  &ldquo;It paid for itself in the first month.&rdquo;
                </blockquote>
                <figcaption className={styles.quoteBy}>
                  Barry LaNier, Owner, Nier Transportation
                </figcaption>
              </figure>
              <div className={styles.btnContainer} data-reveal>
                <Button
                  href='/projects/nier-transportation'
                  btnType='black'
                  text='Read the Nier case study'
                  arrow
                />
                <Button
                  href='/projects'
                  btnType='blackUnderline'
                  text='See the concept sites'
                  arrow
                />
              </div>
            </div>

            <ul className={styles.facts} data-reveal>
              {facts.map(({ id, text, Icon }) => (
                <li className={styles.fact} key={id}>
                  <Icon className={styles.factIcon} aria-hidden='true' />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.right} data-reveal>
            <button
              type='button'
              className={styles.imgContainer}
              onClick={() => setModalOpen(true)}
              aria-label='Expand the Nier Transportation home page'
            >
              <Image
                src={NierHomePage}
                alt='Nier Transportation home page'
                fill
                sizes='(max-width: 968px) 100vw, 55vw'
                className={styles.img}
              />
              <span className={styles.expand}>Click to expand</span>
            </button>
          </div>
        </div>
      </LayoutWrapper>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <Image
          src={NierHomePage}
          alt='Nier Transportation home page, full preview'
          className={styles.modalImage}
        />
      </Modal>
    </section>
  );
}
