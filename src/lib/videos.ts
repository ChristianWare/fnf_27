// The site's background videos, in one place. Each plays from Cloudinary
// once its public ID is filled in below (the part of the Cloudinary URL
// after /upload/v…/, without the .mp4), and from the old file in
// /public/videos until then.
//
// Cloudinary sends each browser the smallest file it can play: WebM where
// it's supported, H.264 MP4 everywhere else, with the sound removed and
// trimmed to start at `start`. Phones get the still poster instead of the
// video. The posters are in /public/images/posters.

export const CLOUDINARY_CLOUD = "dkxlrhwjd";

export type VideoKey = "proof" | "cta" | "about" | "platformWhy" | "whichOne";

export type SiteVideo = {
  /** The Cloudinary public ID, e.g. "heroV_oiyd4q". Empty: the local file. */
  cloudinary: string;
  /** The file in /public, used until it's on Cloudinary. */
  local: string;
  /** The still shown on phones, and before the video plays. */
  poster: string;
  /** Seconds into the clip to start (and loop back to). */
  start: number;
};

export const VIDEOS: Record<VideoKey, SiteVideo> = {
  // Home page: ProofStrip
  proof: {
    cloudinary: "heroV_oiyd4q",
    local: "/videos/heroV.mp4",
    poster: "/images/posters/proof.jpg",
    start: 0,
  },
  // Home page: FinalCta
  cta: {
    cloudinary: "",
    local: "/videos/heroiii.mp4",
    poster: "/images/posters/cta.jpg",
    start: 6,
  },
  // About page: AboutHero
  about: {
    cloudinary: "",
    local: "/videos/about.mp4",
    poster: "/images/posters/about.jpg",
    start: 2,
  },
  // Booking software page: PlatformWhy
  platformWhy: {
    cloudinary: "",
    local: "/videos/phx.mp4",
    poster: "/images/posters/platform-why.jpg",
    start: 0,
  },
  // Services page: WhichOne
  whichOne: {
    cloudinary: "",
    local: "/videos/101.mp4",
    poster: "/images/posters/which-one.jpg",
    start: 0,
  },
};

const base = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload`;

/** Where the browser gets the video: Cloudinary's two formats, or the file. */
export function videoSources(v: SiteVideo) {
  if (!v.cloudinary) return [{ src: v.local, type: "video/mp4" }];
  // No sound, at most 1920 wide, trimmed to the start, the quality chosen
  // for the picture. The file extension picks the format.
  const t = [
    "ac_none",
    "c_limit,w_1920",
    ...(v.start > 0 ? [`so_${v.start}`] : []),
    "q_auto",
  ].join(",");
  return [
    { src: `${base}/${t},vc_vp9/${v.cloudinary}.webm`, type: "video/webm" },
    { src: `${base}/${t},vc_h264/${v.cloudinary}.mp4`, type: "video/mp4" },
  ];
}

/** Seconds to skip in the browser: Cloudinary has already trimmed it. */
export const skipTo = (v: SiteVideo) => (v.cloudinary ? 0 : v.start);
