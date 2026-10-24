// The call-to-action's background video, through the shared BackgroundVideo:
// a still image on phones, a small Cloudinary video on bigger screens.

import BackgroundVideo from "@/components/shared/BackgroundVideo/BackgroundVideo";
import styles from "./FinalCta.module.css";

export default function CtaVideo() {
  return (
    <BackgroundVideo
      video='cta'
      classes={{
        media: styles.media,
        video: styles.video,
        toggle: styles.toggle,
      }}
      toggleInside
    />
  );
}
