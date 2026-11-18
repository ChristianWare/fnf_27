// Talking to the demo platform (the fnf-demos app), which makes, extends
// and deletes previews. Server only: it carries DEMO_PLATFORM_SECRET.
//
//   DEMO_PLATFORM_URL     where fnf-demos runs, e.g. https://fnf-demos.vercel.app
//   DEMO_PLATFORM_SECRET  the same secret as in fnf-demos

import type { PlatformDemo } from "./preview";

export class PlatformError extends Error {}

const baseUrl = () => (process.env.DEMO_PLATFORM_URL ?? "").trim().replace(/\/+$/, "");
const secret = () => (process.env.DEMO_PLATFORM_SECRET ?? "").trim();

/** Both settings are in place. */
export const platformReady = () => Boolean(baseUrl() && secret().length >= 16);

export const NOT_SET_UP =
  "The demo platform isn't connected yet. Add DEMO_PLATFORM_URL and DEMO_PLATFORM_SECRET to this site's settings.";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!platformReady()) throw new PlatformError(NOT_SET_UP);
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/api/platform${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${secret()}` },
      cache: "no-store",
    });
  } catch {
    throw new PlatformError("Couldn't reach the demo platform. Try again in a minute.");
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new PlatformError(
      res.status === 401
        ? "The demo platform turned the request down. Check DEMO_PLATFORM_SECRET matches on both sites."
        : (body.error ?? `The demo platform answered ${res.status}.`),
    );
  }
  return body;
}

/** Every preview. With `since`, each one carries its events since then. */
export async function listPlatformDemos(since?: Date): Promise<PlatformDemo[]> {
  const query = since ? `?since=${encodeURIComponent(since.toISOString())}` : "";
  return (await call<{ demos: PlatformDemo[] }>(`/demos${query}`)).demos;
}

export async function getPlatformDemo(id: string): Promise<PlatformDemo> {
  return (await call<{ demo: PlatformDemo }>(`/demos/${encodeURIComponent(id)}`)).demo;
}

/** Multipart: ref, slug, business, marketId, contactName, email, phone,
 *  days, and optional "hero" and "about" files. */
export async function createPlatformDemo(form: FormData): Promise<PlatformDemo> {
  return (await call<{ demo: PlatformDemo }>("/demos", { method: "POST", body: form })).demo;
}

export async function extendPlatformDemo(id: string, days: number): Promise<PlatformDemo> {
  return (
    await call<{ demo: PlatformDemo }>(`/demos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    })
  ).demo;
}

export async function deletePlatformDemo(id: string): Promise<PlatformDemo> {
  return (await call<{ demo: PlatformDemo }>(`/demos/${encodeURIComponent(id)}`, { method: "DELETE" }))
    .demo;
}

/** A prospect's newest preview (the live one first), with what they did. */
export async function previewForProspect(prospectId: string): Promise<PlatformDemo | null> {
  const mine = (await listPlatformDemos()).filter((d) => d.ref === prospectId);
  const pick =
    mine.find((d) => d.status === "live" || d.status === "creating") ?? mine[0] ?? null;
  return pick ? getPlatformDemo(pick.id) : null;
}
