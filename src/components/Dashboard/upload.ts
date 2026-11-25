"use client";

// Sends a file straight from the browser to Cloudinary, with a ticket the
// server signed for one folder. The file never passes through our server.
// It can also be an image on the web, by its address: Cloudinary fetches
// it, so the site it's on doesn't have to allow it.

import type { UploadTicket } from "@/lib/server/cloudinary";

export type Uploaded = {
  url: string;
  publicId: string;
  name: string;
  size: number;
  mime: string;
};

/** An image on the web (or a data: URL), to upload by its address. */
export type RemoteFile = { url: string; name: string };

export async function upload(
  ticket: UploadTicket,
  file: File | RemoteFile,
): Promise<Uploaded> {
  const remote = !(file instanceof File);
  const form = new FormData();
  form.append("file", remote ? file.url : file);
  form.append("api_key", ticket.apiKey);
  form.append("timestamp", String(ticket.timestamp));
  form.append("signature", ticket.signature);
  form.append("folder", ticket.folder);
  const res = await fetch(ticket.url, { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    format?: string;
    resource_type?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.secure_url || !json.public_id) {
    throw new Error(json.error?.message ?? `Couldn't upload ${file.name}.`);
  }
  return {
    url: json.secure_url,
    publicId: json.public_id,
    name: file.name,
    size: json.bytes ?? (remote ? 0 : file.size),
    mime:
      (!remote && file.type) ||
      `${json.resource_type ?? "raw"}/${json.format ?? ""}`,
  };
}
