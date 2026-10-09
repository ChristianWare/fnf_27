"use server";

import { checkLink, unsubscribe } from "@/lib/server/unsubscribe";

export type UnsubscribeState = { done?: boolean; error?: string };

export async function confirmUnsubscribe(
  _previous: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const u = String(formData.get("u") ?? "");
  const k = String(formData.get("k") ?? "");
  const s = String(formData.get("s") ?? "");
  if (!checkLink(u, k, s)) return { error: "That link doesn't work anymore." };
  await unsubscribe(u, k);
  return { done: true };
}
