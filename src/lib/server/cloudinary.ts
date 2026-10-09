// Uploads go straight from the browser to Cloudinary, signed here so only
// our pages can upload, and only into the folder we name. Server only.

import { createHash } from "node:crypto";

const cloud = () => process.env.CLOUDINARY_CLOUD_NAME ?? "";

export const uploadsReady = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

const signParams = (params: Record<string, string | number>) => {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + (process.env.CLOUDINARY_API_SECRET ?? ""))
    .digest("hex");
};

export type UploadTicket = {
  url: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

/** What the browser needs to upload one or more files into `folder`. */
export function uploadTicket(folder: string): UploadTicket {
  const timestamp = Math.round(Date.now() / 1000);
  return {
    url: `https://api.cloudinary.com/v1_1/${cloud()}/auto/upload`,
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    timestamp,
    signature: signParams({ folder, timestamp }),
    folder,
  };
}

/** True for a file we signed into this folder. */
export function isOurUpload(fileUrl: string, publicId: string, folder: string) {
  return (
    fileUrl.startsWith(`https://res.cloudinary.com/${cloud()}/`) &&
    publicId.startsWith(`${folder}/`)
  );
}

/** Deletes a file. Best effort: a leftover file costs nothing much. */
export async function destroyUpload(publicId: string, mime?: string | null) {
  if (!uploadsReady() || !publicId) return;
  const types = mime?.startsWith("video/")
    ? ["video"]
    : mime?.startsWith("image/") || mime === "application/pdf"
      ? ["image", "raw"]
      : ["raw", "image"];
  for (const type of types) {
    const timestamp = Math.round(Date.now() / 1000);
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: process.env.CLOUDINARY_API_KEY ?? "",
      signature: signParams({ public_id: publicId, timestamp }),
    });
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud()}/${type}/destroy`,
        { method: "POST", body },
      );
      const json = (await res.json().catch(() => ({}))) as { result?: string };
      if (json.result === "ok") return;
    } catch {
      return;
    }
  }
}
