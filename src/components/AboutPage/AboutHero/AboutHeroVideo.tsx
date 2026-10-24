// The About hero's background video (top of the page), through the
// shared BackgroundVideo: a still on phones, a small video on bigger screens.

import BackgroundVideo from "@/components/shared/BackgroundVideo/BackgroundVideo";
import styles from "./AboutHero.module.css";

export default function AboutHeroVideo() {
  return (
    <BackgroundVideo
      video='about'
      classes={{
        media: styles.media,
        video: styles.video,
        toggle: styles.toggle,
      }}
      priority
    />
  );
}
