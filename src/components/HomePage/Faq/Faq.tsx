"use client";

import { useState } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Faq.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";

export type FaqItem = { id: number; question: string; answer: string };

// The home page's questions. Other pages pass their own with the faqs prop.
const homeFaqs: FaqItem[] = [
  {
    id: 1,
    question: "Do I own my customers?",
    answer:
      "Yes. Your customer list, booking history and payments run through your own accounts, under your name. Your clients never see the Fonts & Footers name, and you can export your data anytime.",
  },
  {
    id: 2,
    question: "Can I keep my domain and phone number?",
    answer:
      "Yes. Your domain stays registered to you and your phone number doesn't change. We point your domain at the new site, so nothing changes about how clients reach you.",
  },
  {
    id: 3,
    question: "Do you work outside Phoenix?",
    answer:
      "Yes. Fonts & Footers is based in Phoenix and works with operators across the US. The leads tool searches your market, wherever you operate, and every site is built around the searches riders make in your area.",
  },
  {
    id: 4,
    question:
      "I already use Limo Anywhere or Moovs. Can I still work with you?",
    answer:
      "Yes, in one of two ways. Keep your current software and add a custom website with Website Only at $199/mo. Or move your bookings to the Full Platform at $499/mo, which includes the website and the leads tool. Either way, the free leads tool works alongside whatever you use now.",
  },
  {
    id: 5,
    question: "Is there a contract?",
    answer:
      "No long-term contract. Plans are month to month, and you can cancel anytime.",
  },
  {
    id: 6,
    question: "What happens after the 30 days?",
    answer:
      "You choose. Keep your leads with the Full Platform, where the leads tool is included, or keep the tool on its own for $125/mo. If you do neither, the free period simply ends. There's no card on file, so you're never charged by surprise.",
  },
];

export default function Faq({
  faqs = homeFaqs,
  eyebrow = "Common questions",
  heading = "Questions operators ask first.",
}: {
  faqs?: FaqItem[];
  eyebrow?: string;
  heading?: string;
}) {
  // One answer open at a time; the first starts open.
  const [openId, setOpenId] = useState<number | null>(faqs[0]?.id ?? null);

  // The same questions as structured data, so search engines can read them.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <section className={styles.container}>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <EyeBrow text={eyebrow} />
            <h2 className={styles.heading}>{heading}</h2>
            <div className={styles.btnContainer}>
              <Button
                href='/contact'
                btnType='black'
                text='Ask a question'
                arrow
              />
            </div>
          </div>

          <div className={styles.right}>
            {faqs.map((faq) => {
              const open = openId === faq.id;
              return (
                <div className={styles.item} key={faq.id}>
                  <h3 className={styles.itemHeading}>
                    <button
                      type='button'
                      id={`faq-question-${faq.id}`}
                      className={`${styles.question} h6`}
                      aria-expanded={open}
                      aria-controls={`faq-answer-${faq.id}`}
                      onClick={() => setOpenId(open ? null : faq.id)}
                    >
                      {faq.question}
                      <span
                        className={`${styles.plus} ${open ? styles.plusOpen : ""}`}
                        aria-hidden='true'
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-answer-${faq.id}`}
                    role='region'
                    aria-labelledby={`faq-question-${faq.id}`}
                    className={`${styles.answerWrap} ${open ? styles.answerOpen : ""}`}
                  >
                    <div className={styles.answerInner}>
                      <p className={styles.answer}>{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
