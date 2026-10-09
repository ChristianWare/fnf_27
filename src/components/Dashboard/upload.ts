"use client";

// Sends a file straight from the browser to Cloudinary, with a ticket the
// server signed for one folder. The file never passes through our server.

import type { UploadTicket } from "@/lib/server/cloudinary";

export type Uploaded = {
  url: string;
  publicId: string;
  name: string;
  size: number;
  mime: string;
};

export async function upload(
  ticket: UploadTicket,
  file: File,
): Promise<Uploaded> {
  const form = new FormData();
  form.append("file", file);
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
    size: json.bytes ?? file.size,
    mime: file.type || `${json.resource_type ?? "raw"}/${json.format ?? ""}`,
  };
}
