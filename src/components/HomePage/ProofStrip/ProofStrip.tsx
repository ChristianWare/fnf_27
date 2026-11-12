// The home page's video card: a muted background video that loops by
// itself, with a play/pause button in the bottom right corner, and the
// "About us" statement centered over it. Plays through the shared
// BackgroundVideo: a still image on phones, a small Cloudinary video on
// bigger screens. A dark overlay keeps the white text readable.

import BackgroundVideo from "@/components/shared/BackgroundVideo/BackgroundVideo";
import Reveal from "@/components/shared/Reveal/Reveal";
import PulseEyeBrow from "@/components/shared/PulseEyeBrow/PulseEyeBrow";
import styles from "./ProofStrip.module.css";

export default function ProofStrip() {
  return (
    <section
      className={styles.container}
      aria-labelledby='proof-strip-heading'
    >
      <Reveal />
      <BackgroundVideo
        video='proof'
        classes={{
          media: styles.media,
          video: styles.video,
          toggle: styles.toggle,
        }}
      />
      <div className={styles.overlay} aria-hidden='true' />

      <div className={styles.content}>
        <PulseEyeBrow text='About Us' color='white' />
        <h2
          id='proof-strip-heading'
          className={styles.heading}
          data-reveal
          data-reveal-style='fade'
        >
          Built by One Team <br /> for One Industry
        </h2>
        <p className={styles.copy} data-reveal>
          We&apos;re Fonts &amp; Footers, a Phoenix studio that builds for black
          car and limo operators and nobody else. We built the platform and
          refined it on real bookings, real drivers and real corporate clients
          until it ran a whole business. When you work with us, you work with
          the people who built it, not a ticket system.
        </p>
      </div>
    </section>
  );
}
