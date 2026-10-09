// Links to Google photos of places, through our own address so the key
// stays on the server. Each link is signed, so only links we made work
// (nobody can run up the photo bill). Server only.

import { sign, signatureOk } from "@/lib/server/ids";
import { url } from "@/lib/server/config";

/** The sizes we ask Google for. */
export const PHOTO_WIDTHS = [160, 640, 1200] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

const value = (placeId: string, width: number) => `photo.${placeId}.${width}`;

/** "/api/leads/photo?…", or the full address for emails. */
export function photoUrl(placeId: string, width: PhotoWidth, absolute = false) {
  const path = `/api/leads/photo?id=${encodeURIComponent(placeId)}&w=${width}&s=${sign(value(placeId, width))}`;
  return absolute ? url(path) : path;
}

export function photoLinkOk(placeId: string, width: number, signature: string) {
  return (
    (PHOTO_WIDTHS as readonly number[]).includes(width) &&
    signatureOk(value(placeId, width), signature)
  );
}
