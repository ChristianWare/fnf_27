// POST /api/unsubscribe?u=…&k=…&s=…: one-click unsubscribe, for the
// "Unsubscribe" button inboxes show next to the sender (RFC 8058).

import { checkLink, unsubscribe } from "@/lib/server/unsubscribe";

export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const u = params.get("u") ?? undefined;
  const k = params.get("k") ?? undefined;
  if (!checkLink(u, k, params.get("s") ?? undefined)) {
    return new Response("Invalid link", { status: 400 });
  }
  await unsubscribe(u!, k!);
  return new Response("Unsubscribed", { status: 200 });
}
