// The section's background video, through the shared BackgroundVideo:
// a still image on phones, a small Cloudinary video on bigger screens.

import BackgroundVideo from "@/components/shared/BackgroundVideo/BackgroundVideo";
import styles from "./PlatformWhy.module.css";

export default function PlatformWhyVideo() {
  return (
    <BackgroundVideo
      video='platformWhy'
      classes={{
        media: styles.media,
        video: styles.video,
        toggle: styles.toggle,
      }}
    />
  );
}
