"use server";

// Admin actions for the build: the step tracker and launch, the blueprint,
// design options and documents, and the Growth page. Admins only.

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import type { User } from "@/lib/auth/users";
import { done, fail, type ActionResult } from "@/lib/actions";
import { addActivity, setFact } from "@/lib/data/write";
import { loadClient } from "@/lib/data/clients";
import { createId } from "@/lib/server/ids";
import { url } from "@/lib/server/config";
import { emailClient } from "@/lib/server/notify";
import {
  isOurUpload,
  uploadTicket,
  uploadsReady,
} from "@/lib/server/cloudinary";
import { firstOfMonth } from "@/lib/dashboard/billing";
import {
  domainOf,
  keyProblem,
  listSites,
  pickProperty,
  problemText,
} from "@/lib/growth/searchConsole";
import { cleanSiteName } from "@/lib/growth/plausible";
import { syncGrowth, syncReviews, syncVisits } from "@/lib/growth/sync";
import {
  findListings,
  googleReady,
  type Listing,
} from "@/lib/leads/apis/google";
import { flushUsage } from "@/lib/leads/usage";
import type {
  BlueprintPage,
  Growth,
  SectionStatus,
} from "@/lib/dashboard/types";

const s = schema;

type Admin = { ok: false; error: string } | { ok: true; user: User };

async function admin(): Promise<Admin> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN")
    return { ok: false, error: "Only admins can do that." };
  return { ok: true, user };
}

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
};

const first = (name: string) => name.split(" ")[0] || name;
const clean = (text: string, max = 5000) => (text ?? "").trim().slice(0, max);

/* ── The build, step by step ── */

const STEP_FACT: Record<string, string> = {
  agreement: "agreementSignedAt",
  setup: "setupFeePaidAt",
  questionnaire: "questionnaireSubmittedAt",
  assets: "assetsCompleteAt",
  blueprint: "blueprintApprovedAt",
  design: "designChosenAt",
  stripe: "stripeConnectedAt",
  rates: "ratesSetAt",
  drivers: "driversAddedAt",
  booking: "bookingLinkAddedAt",
  build: "previewReadyAt",
  preview: "previewApprovedAt",
  launch: "launchedAt",
};

export async function setBuildStep(
  clientId: string,
  stepId: string,
  isDone: boolean,
): Promise<ActionResult<{ at?: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const key = STEP_FACT[stepId];
  if (!key) return fail("That isn't a build step.");
  if (stepId === "launch" && isDone) return launchSite(clientId);

  const at = new Date().toISOString();
  const changed = await setFact(clientId, key, isDone ? at : null);
  if (changed && isDone && stepId === "build") {
    await addActivity(
      clientId,
      "build",
      "Your preview is ready",
      "/dashboard/website",
    );
    const client = await loadClient(clientId);
    await emailClient(clientId, "Your preview is ready", {
      eyebrow: "Your website",
      heading: `Your preview is ready, ${first(client?.contact.name ?? "")}`,
      paragraphs: [
        "Your new site is built. Click through every page on your private preview and tell us anything you'd change.",
      ],
      button: { label: "Open your preview", href: url("/dashboard/website") },
    });
  }
  refresh();
  return done({ at: isDone ? at : undefined });
}

export async function launchSite(
  clientId: string,
): Promise<ActionResult<{ at?: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(clientId);
  if (!client?.website) return fail("They don't have a website plan.");
  const at = new Date().toISOString();
  await setFact(clientId, "previewApprovedAt", at);
  const changed = await setFact(clientId, "launchedAt", at);
  if (changed) {
    await addActivity(
      clientId,
      "build",
      "Your site went live",
      client.website.liveUrl ?? "/dashboard",
    );
    await emailClient(clientId, `${client.business} is live`, {
      eyebrow: "Launch day",
      heading: "Your new site is live",
      paragraphs: [
        `${client.website.domain || "Your new site"} is up and taking bookings. From today your dashboard tracks your growth, and you can ask for changes anytime.`,
      ],
      button: client.website.liveUrl
        ? { label: "Visit your site", href: client.website.liveUrl }
        : { label: "Open your dashboard", href: url("/dashboard") },
      after: ["Thank you for building it with us."],
    });
  }
  refresh();
  return done({ at });
}

/* ── The blueprint ── */

const slug = (name: string) =>
  `/${name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;

async function ownPage(clientId: string, pageId: string) {
  const [page] = await db
    .select()
    .from(s.blueprintPages)
    .where(
      and(
        eq(s.blueprintPages.id, pageId),
        eq(s.blueprintPages.clientId, clientId),
      ),
    )
    .limit(1);
  return page;
}

async function ownSections(clientId: string, ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({ section: s.blueprintSections })
    .from(s.blueprintSections)
    .innerJoin(
      s.blueprintPages,
      eq(s.blueprintPages.id, s.blueprintSections.pageId),
    )
    .where(
      and(
        inArray(s.blueprintSections.id, ids),
        eq(s.blueprintPages.clientId, clientId),
      ),
    );
}

export async function startBlueprint(
  clientId: string,
  pages: { name: string; path: string; purpose: string; sections: string[] }[],
): Promise<ActionResult<BlueprintPage[]>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const [existing] = await db
    .select({ id: s.blueprintPages.id })
    .from(s.blueprintPages)
    .where(eq(s.blueprintPages.clientId, clientId))
    .limit(1);
  if (existing) return fail("Their blueprint is already started.");

  const made: BlueprintPage[] = [];
  await db.transaction(async (tx) => {
    for (const [i, p] of pages.slice(0, 30).entries()) {
      const pageId = createId();
      await tx.insert(s.blueprintPages).values({
        id: pageId,
        clientId,
        name: clean(p.name, 80),
        path: clean(p.path, 120) || "/",
        purpose: clean(p.purpose, 300),
        position: i,
      });
      const sections = p.sections.slice(0, 30).map((title, j) => ({
        id: createId(),
        pageId,
        title: clean(title, 120),
        position: j,
      }));
      if (sections.length)
        await tx.insert(s.blueprintSections).values(sections);
      made.push({
        id: pageId,
        name: clean(p.name, 80),
        path: clean(p.path, 120) || "/",
        purpose: clean(p.purpose, 300),
        sections: sections.map((x) => ({
          id: x.id,
          title: x.title,
          status: "DRAFT",
          copy: [],
          comments: [],
        })),
      });
    }
  });
  refresh();
  return done(made);
}

export async function addBlueprintPage(
  clientId: string,
  name: string,
): Promise<ActionResult<{ id: string; path: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const title = clean(name, 80);
  if (!title) return fail("Name the page.");
  const [max] = await db
    .select({
      n: sql<number>`coalesce(max(${s.blueprintPages.position}), -1)::int`,
    })
    .from(s.blueprintPages)
    .where(eq(s.blueprintPages.clientId, clientId));
  const id = createId();
  const path = slug(title);
  await db.insert(s.blueprintPages).values({
    id,
    clientId,
    name: title,
    path,
    position: (max?.n ?? -1) + 1,
  });
  refresh();
  return done({ id, path });
}

export async function addBlueprintSection(
  clientId: string,
  pageId: string,
  title: string,
): Promise<ActionResult<{ id: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const name = clean(title, 120);
  if (!name) return fail("Name the section.");
  if (!(await ownPage(clientId, pageId)))
    return fail("We couldn't find that page.");
  const [max] = await db
    .select({
      n: sql<number>`coalesce(max(${s.blueprintSections.position}), -1)::int`,
    })
    .from(s.blueprintSections)
    .where(eq(s.blueprintSections.pageId, pageId));
  const id = createId();
  await db.insert(s.blueprintSections).values({
    id,
    pageId,
    title: name,
    position: (max?.n ?? -1) + 1,
  });
  refresh();
  return done({ id });
}

export async function saveSectionCopy(
  clientId: string,
  sectionId: string,
  copy: string[],
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const [own] = await ownSections(clientId, [sectionId]);
  if (!own) return fail("We couldn't find that section.");
  await db
    .update(s.blueprintSections)
    .set({
      copy: copy
        .map((line) => clean(line, 4000))
        .filter(Boolean)
        .slice(0, 60),
      updatedAt: new Date(),
    })
    .where(eq(s.blueprintSections.id, sectionId));
  refresh();
  return done();
}

export async function setSectionStatus(
  clientId: string,
  sectionId: string,
  status: SectionStatus,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (!["DRAFT", "REVIEW", "APPROVED"].includes(status))
    return fail("That isn't a status.");
  const [own] = await ownSections(clientId, [sectionId]);
  if (!own) return fail("We couldn't find that section.");
  await db
    .update(s.blueprintSections)
    .set({ status, updatedAt: new Date() })
    .where(eq(s.blueprintSections.id, sectionId));
  refresh();
  return done();
}

export async function sendSectionsForReview(
  clientId: string,
  sectionIds: string[],
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const own = (await ownSections(clientId, sectionIds.slice(0, 200))).map(
    (x) => x.section,
  );
  if (!own.length) return fail("There's nothing to send.");
  await db
    .update(s.blueprintSections)
    .set({ status: "REVIEW", updatedAt: new Date() })
    .where(
      inArray(
        s.blueprintSections.id,
        own.map((x) => x.id),
      ),
    );
  const [page] = await db
    .select({ name: s.blueprintPages.name })
    .from(s.blueprintPages)
    .where(eq(s.blueprintPages.id, own[0].pageId))
    .limit(1);
  await addActivity(
    clientId,
    "build",
    `${own.length} blueprint section${own.length === 1 ? " is" : "s are"} ready for you`,
    "/dashboard/website/blueprint",
  );
  await emailClient(clientId, "Your blueprint is ready for you", {
    eyebrow: "Blueprint",
    heading: `${own.length} section${own.length === 1 ? "" : "s"} to read${page ? ` on ${page.name}` : ""}`,
    paragraphs: [
      "Read them through. Approve what's right, and tell us what isn't: we rewrite anything you comment on.",
    ],
    button: {
      label: "Review your blueprint",
      href: url("/dashboard/website/blueprint"),
    },
  });
  refresh();
  return done();
}

export async function studioComment(
  clientId: string,
  sectionId: string,
  text: string,
): Promise<ActionResult<{ id: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const body = clean(text, 4000);
  if (!body) return fail("Write your comment first.");
  const [own] = await ownSections(clientId, [sectionId]);
  if (!own) return fail("We couldn't find that section.");
  const id = createId();
  await db.insert(s.blueprintComments).values({
    id,
    sectionId,
    author: "STUDIO",
    name: a.user.name,
    text: body,
  });
  refresh();
  return done({ id });
}

/* ── Design options and documents ── */

const filesFolder = (clientId: string, kind: "designs" | "documents") =>
  `fnf/clients/${clientId}/${kind}`;

export async function adminUploadTicket(
  clientId: string,
  kind: "designs" | "documents",
) {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (!uploadsReady())
    return fail("Uploads aren't set up: add the CLOUDINARY_ keys.");
  if (kind !== "designs" && kind !== "documents")
    return fail("That isn't a folder.");
  return done(uploadTicket(filesFolder(clientId, kind)));
}

export async function sendDesigns(
  clientId: string,
  options: { name: string; url: string; publicId: string }[],
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const folder = filesFolder(clientId, "designs");
  const ok = options
    .slice(0, 3)
    .filter((o) => isOurUpload(o.url, o.publicId, folder));
  if (!ok.length) return fail("Upload the designs first.");
  const client = await loadClient(clientId);
  if (!client?.website) return fail("They don't have a website plan.");

  const now = new Date().toISOString();
  await db
    .update(s.websites)
    .set({
      designs: {
        readyAt: now,
        options: ok.map((o, i) => ({
          id: createId(),
          name: clean(o.name, 60) || `Option ${i + 1}`,
          mood: "",
          palette: [],
          type: "",
          notes: [],
          images: [o.url],
        })),
      },
      updatedAt: new Date(),
    })
    .where(eq(s.websites.clientId, clientId));
  await addActivity(
    clientId,
    "build",
    "Your design options are ready",
    "/dashboard/website/design",
  );
  await emailClient(clientId, "Your designs are ready", {
    eyebrow: "Design",
    heading: `${ok.length === 3 ? "Three" : ok.length} designs, made for ${client.business}`,
    paragraphs: [
      "Pick the one that feels most like you. We fine-tune the details in the build, and you'll see everything on your preview before launch.",
    ],
    button: {
      label: "Choose your design",
      href: url("/dashboard/website/design"),
    },
  });
  refresh();
  return done();
}

export async function sendDocument(
  clientId: string,
  input: {
    title: string;
    url: string;
    publicId: string;
    fileName: string;
    needsSignature: boolean;
  },
): Promise<ActionResult<{ id: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const title = clean(input.title, 160);
  if (!title) return fail("Give the document a title.");
  if (
    !isOurUpload(input.url, input.publicId, filesFolder(clientId, "documents"))
  )
    return fail("Upload the file first.");

  const id = createId();
  await db.insert(s.documents).values({
    id,
    clientId,
    title,
    summary: input.needsSignature
      ? "Please read and sign."
      : "For your records.",
    kind: "OTHER",
    status: input.needsSignature ? "AWAITING" : "INFO",
    fileUrl: input.url,
    fileName: clean(input.fileName, 200) || null,
  });
  await addActivity(
    clientId,
    "document",
    input.needsSignature
      ? `We sent ${title} for you to sign`
      : `We shared ${title}`,
    "/dashboard/website/documents",
  );
  await emailClient(
    clientId,
    input.needsSignature
      ? `Please sign: ${title}`
      : `A document for you: ${title}`,
    {
      eyebrow: "Documents",
      heading: title,
      paragraphs: [
        input.needsSignature
          ? "It's waiting in your dashboard. Read it through, type your name, and it's signed."
          : "It's in your dashboard under Documents, for your records. Nothing to sign.",
      ],
      button: {
        label: input.needsSignature ? "Read and sign" : "Open Documents",
        href: url("/dashboard/website/documents"),
      },
    },
  );
  refresh();
  return done({ id });
}

/* ── The Growth page ── */

async function growthOf(clientId: string) {
  const [row] = await db
    .select({
      growth: s.websites.growth,
      facts: s.websites.facts,
      startedAt: s.websites.startedAt,
    })
    .from(s.websites)
    .where(eq(s.websites.clientId, clientId))
    .limit(1);
  return row;
}

/** A blank Growth page: 12 months from the launch month. */
function blank(start: string): Growth {
  return {
    months: Array.from({ length: 12 }, (_, i) => ({
      month: firstOfMonth(start, i),
      target: 0,
    })),
    notes: [],
    habits: [],
  };
}

async function saveGrowth(clientId: string, change: (g: Growth) => Growth) {
  const row = await growthOf(clientId);
  if (!row) return false;
  const fresh = blank(row.facts.launchedAt ?? new Date().toISOString());
  const saved = row.growth;
  const base: Growth = {
    months:
      saved && Array.isArray(saved.months) && saved.months.length
        ? saved.months.map((m) => ({
            month: m.month,
            target: Number(m.target) || 0,
          }))
        : fresh.months,
    notes: saved?.notes ?? [],
    habits: saved?.habits ?? [],
    ...(saved?.habitsDone ? { habitsDone: saved.habitsDone } : {}),
  };
  await db
    .update(s.websites)
    .set({ growth: change(base), updatedAt: new Date() })
    .where(eq(s.websites.clientId, clientId));
  refresh();
  return true;
}

const whole = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));

export async function saveGrowthPlan(
  clientId: string,
  targets: number[],
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const ok = await saveGrowth(clientId, (g) => ({
    ...g,
    months: g.months.map((m, i) => ({
      month: m.month,
      target: targets[i] === undefined ? m.target : whole(targets[i]),
    })),
  }));
  return ok ? done() : fail("They don't have a website plan.");
}

export async function publishGrowthNotes(
  clientId: string,
  notes: string[],
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const list = notes
    .map((n) => clean(n, 400))
    .filter(Boolean)
    .slice(0, 8);
  const ok = await saveGrowth(clientId, (g) => ({ ...g, notes: list }));
  if (ok && list.length) {
    await addActivity(
      clientId,
      "growth",
      "New notes on your Growth page",
      "/dashboard/growth",
    );
  }
  return ok ? done() : fail("They don't have a website plan.");
}

export async function saveGrowthHabits(
  clientId: string,
  habits: string[],
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const list = habits
    .map((h) => clean(h, 160))
    .filter(Boolean)
    .slice(0, 8);
  const ok = await saveGrowth(clientId, (g) => ({
    ...g,
    habits: list.map((text, i) => {
      const before = g.habits.find((h) => h.text === text);
      return (
        before ?? {
          id: `h${i + 1}-${createId().slice(1, 7)}`,
          text,
          detail: "",
        }
      );
    }),
  }));
  return ok ? done() : fail("They don't have a website plan.");
}

/* ── Growth: where the numbers come from ── */

/**
 * Reads everything since launch again, now: from Google (Search Console
 * and their reviews), or from Plausible (all their visitors).
 */
export async function pullGrowth(
  clientId: string,
  from: "google" | "plausible" = "google",
): Promise<ActionResult<{ through?: string; days: number; site?: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (from === "plausible") {
    const visits = await syncVisits(clientId, { full: true });
    refresh();
    if (!visits.ok) return fail(visits.error);
    return done({
      through: visits.through,
      days: visits.days,
      site: visits.property,
    });
  }
  const { traffic, reviews } = await syncGrowth(clientId, { full: true });
  refresh();
  if (!traffic.ok) return fail(traffic.error);
  if (!reviews.ok) return fail(`Visitors are in. Reviews: ${reviews.error}`);
  return done({ through: traffic.through, days: traffic.days });
}

/**
 * Their site's name in Plausible (or none, to find it from their domain
 * again). Another site's numbers aren't theirs, so a change starts their
 * visitors again from launch.
 */
export async function setPlausibleSite(
  clientId: string,
  name: string | null,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const value = name?.trim() ? cleanSiteName(name) : null;
  if (value === undefined)
    return fail("Type the site's name as Plausible shows it: example.com.");
  const [row] = await db
    .select({ site: s.websites.plausibleSite })
    .from(s.websites)
    .where(eq(s.websites.clientId, clientId))
    .limit(1);
  if (!row) return fail("They don't have a website plan.");
  await db.transaction(async (tx) => {
    await tx
      .update(s.websites)
      .set({ plausibleSite: value, updatedAt: new Date() })
      .where(eq(s.websites.clientId, clientId));
    if (row.site !== value) {
      // The last pull was about the old name: forget how it went.
      await tx
        .update(s.websites)
        .set({ growthSync: sql`${s.websites.growthSync} - 'visits'` })
        .where(eq(s.websites.clientId, clientId));
      await tx.delete(s.visitDays).where(eq(s.visitDays.clientId, clientId));
      await tx
        .delete(s.visitChannels)
        .where(eq(s.visitChannels.clientId, clientId));
      await tx
        .delete(s.visitSources)
        .where(eq(s.visitSources.clientId, clientId));
      await tx.delete(s.visitPages).where(eq(s.visitPages.clientId, clientId));
    }
  });
  refresh();
  return done();
}

/** The Search Console properties the service account can see. */
export async function searchConsoleSites(
  clientId: string,
): Promise<ActionResult<{ sites: string[]; suggested?: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const problem = keyProblem();
  if (problem) return fail(problem);
  const [site] = await db
    .select({ domain: s.websites.domain, liveUrl: s.websites.liveUrl })
    .from(s.websites)
    .where(eq(s.websites.clientId, clientId))
    .limit(1);
  if (!site) return fail("They don't have a website plan.");
  try {
    const sites = await listSites();
    const domain = domainOf(site);
    return done({
      sites: sites.map((x) => x.siteUrl).sort(),
      suggested: domain ? pickProperty(sites, domain) : undefined,
    });
  } catch (error) {
    return fail(problemText(error));
  }
}

/** Uses this property for their visitors (or forgets it, to look again). */
export async function setSearchConsoleSite(
  clientId: string,
  site: string | null,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const value = site?.trim() || null;
  if (value && !/^(sc-domain:[a-z0-9.-]+|https?:\/\/\S+\/)$/i.test(value))
    return fail("That isn't a Search Console property.");
  const [row] = await db
    .select({ site: s.websites.searchConsoleSite })
    .from(s.websites)
    .where(eq(s.websites.clientId, clientId))
    .limit(1);
  if (!row) return fail("They don't have a website plan.");
  await db.transaction(async (tx) => {
    await tx
      .update(s.websites)
      .set({ searchConsoleSite: value, updatedAt: new Date() })
      .where(eq(s.websites.clientId, clientId));
    // Another property's numbers aren't theirs: start again from launch.
    if (row.site !== value) {
      await tx
        .delete(s.trafficDays)
        .where(eq(s.trafficDays.clientId, clientId));
      await tx
        .delete(s.trafficQueries)
        .where(eq(s.trafficQueries.clientId, clientId));
    }
  });
  refresh();
  return done();
}

/** Google listings matching a search, to pick theirs. */
export async function findGoogleListings(
  clientId: string,
  text: string,
): Promise<ActionResult<Listing[]>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const query = clean(text, 200);
  if (!query) return fail("Type their business name and city.");
  if (!googleReady()) return fail("GOOGLE_MAPS_SERVER_KEY isn't set.");
  try {
    const found = await findListings(query, { clientId });
    await flushUsage();
    return done(found);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

/** Their listing, for the reviews tile (or none). */
export async function setGoogleListing(
  clientId: string,
  placeId: string | null,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const value = placeId?.trim() || null;
  if (value && !/^[A-Za-z0-9_-]{10,300}$/.test(value))
    return fail("That isn't a Google listing.");
  await db
    .update(s.websites)
    .set({ googlePlaceId: value, updatedAt: new Date() })
    .where(eq(s.websites.clientId, clientId));
  await db.delete(s.reviewDays).where(eq(s.reviewDays.clientId, clientId));
  if (value) {
    const result = await syncReviews(clientId);
    await flushUsage();
    if (!result.ok) {
      refresh();
      return fail(result.error);
    }
  }
  refresh();
  return done();
}
