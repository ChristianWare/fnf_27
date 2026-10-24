// The section's background video, through the shared BackgroundVideo:
// a still image on phones, a small Cloudinary video on bigger screens.

import BackgroundVideo from "@/components/shared/BackgroundVideo/BackgroundVideo";
import styles from "./WhichOne.module.css";

export default function WhichOneVideo() {
  return (
    <BackgroundVideo
      video='whichOne'
      classes={{
        media: styles.media,
        video: styles.video,
        toggle: styles.toggle,
      }}
    />
  );
}
