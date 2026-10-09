// GET /api/leads/photo?id=<place>[&n=<photo>]&w=<width>&s=<signature>: one
// of Google's photos of a place (the first, or the nth), for the Leads
// Tool's lists, lead pages and morning emails.
// Only links we signed work, so nobody else can run up the photo bill, and
// there's a ceiling on photos a day whoever asks. Browsers and Vercel keep
// each one for a day.

import { after } from "next/server";
import { and, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { dayKey } from "@/lib/dashboard/format";
import { googleReady, photoImage, placePhotos } from "@/lib/leads/apis/google";
import { photoLinkOk } from "@/lib/leads/photos";
import { flushUsage } from "@/lib/leads/usage";

/** At most this many photos from Google a day: about $35 at list price. */
const PHOTOS_A_DAY = 5000;

const nothing = (seconds: number) =>
  new Response(null, {
    status: 404,
    headers: {
      "Cache-Control": `public, max-age=${seconds}, s-maxage=${seconds}`,
    },
  });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  const id = params.get("id") ?? "";
  const w = params.get("w") ?? "";
  const n = params.get("n");
  const width = Number(w);
  const index = n === null ? 0 : Number(n);
  // Only links spelled the way we make them: anything added to one, or
  // spelled another way, would get past the cache and cost a photo.
  const expected = n === null ? ["id", "w", "s"] : ["id", "n", "w", "s"];
  const plain =
    keys.length === expected.length &&
    expected.every((key) => keys.includes(key)) &&
    /^[1-9]\d{1,4}$/.test(w) &&
    (n === null || /^[1-9]$/.test(n));
  if (!plain || !id || !photoLinkOk(id, width, params.get("s") ?? "", index))
    return nothing(60);
  if (!googleReady()) return nothing(600);

  // Past the day's ceiling, lists show their next picture (or "No image
  // available") until tomorrow.
  const [today] = await db
    .select({
      n: sql<number>`coalesce(sum(${schema.leadsUsage.calls}), 0)::int`,
    })
    .from(schema.leadsUsage)
    .where(
      and(
        eq(schema.leadsUsage.day, dayKey(new Date())),
        eq(schema.leadsUsage.api, "places_photo"),
      ),
    );
  if ((today?.n ?? 0) >= PHOTOS_A_DAY) return nothing(600);

  try {
    const photo = (await placePhotos(id))[index];
    if (!photo) return nothing(86_400);
    // Counted against the market the place is in.
    const [market] = await db
      .select({ id: schema.leadsPlaces.marketId })
      .from(schema.leadsPlaces)
      .where(eq(schema.leadsPlaces.id, id))
      .limit(1);
    const [venue] = market
      ? []
      : await db
          .select({ id: schema.leadsEvents.marketId })
          .from(schema.leadsEvents)
          .where(or(eq(schema.leadsEvents.venuePlaceId, id)))
          .limit(1);
    const image = await photoImage(photo.name, width, {
      marketId: market?.id ?? venue?.id,
    });
    after(flushUsage);
    return new Response(image.body, {
      headers: {
        "Content-Type": image.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[leads] photo failed:", error);
    return nothing(600);
  }
}
