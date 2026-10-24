// The home page's video card: a muted background video that loops by
// itself, with a play/pause button in the bottom right corner. Plays
// through the shared BackgroundVideo: a still image on phones, a small
// Cloudinary video on bigger screens.

import BackgroundVideo from "@/components/shared/BackgroundVideo/BackgroundVideo";
import styles from "./ProofStrip.module.css";

export default function ProofStrip() {
  return (
    <section className={styles.container} aria-label='Our work on the road'>
      <BackgroundVideo
        video='proof'
        classes={{
          media: styles.media,
          video: styles.video,
          toggle: styles.toggle,
        }}
      />
      <div className={styles.overlay} />
    </section>
  );
}
