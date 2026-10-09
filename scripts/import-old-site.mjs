// One-time import from the old site's tables (the ones Prisma made: "User",
// "ClientProfile", "Invoice"…) into the new tables. The old tables are then
// moved, untouched, into a schema called old_site, out of the way.
//
// It runs inside `npm run db:migrate -- --import-old-site`, in one
// transaction: it either all happens or none of it does. Run it on a copy
// of the live database (a Neon branch), never the live one while the old
// site is still using it.

import { randomBytes } from "node:crypto";

const OLD_TABLES = [
  "Account",
  "Session",
  "VerificationToken",
  "EmailVerificationToken",
  "PasswordResetToken",
  "StageChangeLog",
  "Questionnaire",
  "Document",
  "BrandAsset",
  "Subscription",
  "Invoice",
  "ChangeRequest",
  "SupportTicket",
  "SitemapComment",
  "SitemapSection",
  "SitemapPage",
  "LeadsSettings",
  "OutreachScript",
  "LeadActivity",
  "SavedLead",
  "HotLeadFeed",
  "WarmLeadFeed",
  "HotLeadAlert",
  "EventbriteEvent",
  "HotLead",
  "MonitoredHotLeadSource",
  "NewBusiness",
  "ScrapeJob",
  "MarketScrapeUsage",
  "PlaceTransportSignal",
  "ClientProfile",
  "User",
  "_prisma_migrations",
];

const OLD_ENUMS = [
  "Role",
  "OnboardingStage",
  "DocumentType",
  "DocumentStatus",
  "AssetLabel",
  "SubscriptionStatus",
  "InvoiceStatus",
  "ChangeRequestStatus",
  "SupportTicketStatus",
  "SitemapStatus",
  "ProductType",
  "LeadType",
  "ScrapeJobStatus",
  "LeadStatus",
  "ApolloConfidence",
  "ScriptFormat",
  "LeadActivityType",
  "HotLeadSource",
  "WarmLeadSignalType",
];

const STAGES = [
  "REGISTERED",
  "AGREEMENT_PENDING",
  "AGREEMENT_SIGNED",
  "QUESTIONNAIRE_PENDING",
  "QUESTIONNAIRE_SUBMITTED",
  "ASSETS_PENDING",
  "ASSETS_UPLOADED",
  "DESIGN_SELECTION",
  "DESIGN_REVIEW",
  "SITE_LIVE",
];

const STAGE_TEXT = {
  AGREEMENT_PENDING: ["document", "We sent your agreement"],
  AGREEMENT_SIGNED: ["document", "You signed your agreement"],
  QUESTIONNAIRE_SUBMITTED: ["build", "You sent your questionnaire"],
  ASSETS_UPLOADED: ["build", "You uploaded your brand assets"],
  DESIGN_SELECTION: ["build", "Your design options were ready"],
  DESIGN_REVIEW: ["build", "You chose your design"],
  SITE_LIVE: ["build", "Your site went live"],
};

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
export function createId() {
  const bytes = randomBytes(24);
  let id = "c";
  for (let i = 0; i < 24; i++) id += ALPHABET[bytes[i] % 36];
  return id;
}

const iso = (d) => (d ? new Date(d).toISOString() : null);

// The old site billed at midnight UTC on the 1st, which is 5pm the day
// before in Arizona. Those dates are filed on the 1st, midnight Arizona.
const onFirst = (d) => {
  if (!d) return null;
  const x = new Date(d);
  return x.getUTCDate() === 1 && x.getUTCHours() < 7
    ? new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), 1, 7))
    : x;
};
const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** True when the old site's tables are still here. */
export async function hasOldTables(client) {
  const { rows } = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = 'User'`,
  );
  return rows.length > 0;
}

async function all(client, sql, params = []) {
  return (await client.query(sql, params)).rows;
}

/** Prisma enum arrays come back as "{CLIENT,ADMIN}". */
const list = (v) =>
  Array.isArray(v)
    ? v
    : String(v ?? "")
        .replace(/[{}"]/g, "")
        .split(",")
        .filter(Boolean);

export async function importOldSite(client, log = console.log) {
  const now = new Date();
  const counts = {};
  const bump = (k, n = 1) => (counts[k] = (counts[k] ?? 0) + n);

  const users = await all(client, `select * from "User" order by "createdAt"`);
  const profiles = await all(
    client,
    `select * from "ClientProfile" order by "createdAt"`,
  );
  const subs = await all(client, `select * from "Subscription"`);
  const invoices = await all(
    client,
    `select * from "Invoice" order by "createdAt"`,
  );
  const docs = await all(
    client,
    `select * from "Document" order by "createdAt"`,
  );
  const brand = await all(
    client,
    `select * from "BrandAsset" order by "createdAt"`,
  );
  const quests = await all(client, `select * from "Questionnaire"`);
  const pages = await all(
    client,
    `select * from "SitemapPage" order by position, "createdAt"`,
  );
  const sections = await all(
    client,
    `select * from "SitemapSection" order by position, "createdAt"`,
  );
  const comments = await all(
    client,
    `select * from "SitemapComment" order by "createdAt"`,
  );
  const changes = await all(
    client,
    `select * from "ChangeRequest" order by "createdAt"`,
  );
  const tickets = await all(
    client,
    `select * from "SupportTicket" order by "createdAt"`,
  );
  const stageLog = await all(
    client,
    `select * from "StageChangeLog" order by "createdAt"`,
  );

  /* ── People ── */
  const isAdmin = (u) => list(u.roles).includes("ADMIN");
  const admins = users.filter(isAdmin);
  const ownerId = admins[0]?.id;
  const userById = new Map(users.map((u) => [u.id, u]));
  const seenEmails = new Set();

  // Clients: every profile that doesn't belong to an admin.
  const clientIds = new Set();
  for (const p of profiles) {
    const user = userById.get(p.userId);
    if (!user || isAdmin(user)) {
      log(`  skipped ${p.businessName}: it belongs to an admin account`);
      bump("skipped admin profiles");
      continue;
    }
    clientIds.add(p.id);
  }

  for (const p of profiles.filter((x) => clientIds.has(x.id))) {
    const user = userById.get(p.userId);
    const mySubs = subs.filter((s) => s.clientProfileId === p.id);
    const web = mySubs.find((s) => s.productType === "WEBSITE");
    const leads = mySubs.find((s) => s.productType === "LEADS");
    const myInvoices = invoices.filter((i) => i.clientProfileId === p.id);
    const myLog = stageLog.filter((l) => l.clientProfileId === p.id);
    const stage = STAGES.indexOf(p.onboardingStage);
    const reached = (name) => stage >= STAGES.indexOf(name);
    const stageAt = (name) =>
      myLog.find((l) => l.toStage === name)?.createdAt ?? null;

    const hasWebsite = Boolean(web) || p.setupFeePaid || stage > 0;
    const approvedAt = hasWebsite
      ? (myLog[0]?.createdAt ?? web?.createdAt ?? p.createdAt)
      : null;

    // Old sign-ups that never went anywhere: kept, but archived.
    const stale =
      !hasWebsite &&
      !leads &&
      myInvoices.length === 0 &&
      now - new Date(p.createdAt) > 60 * 86_400_000;

    let leadsStatus = "NONE";
    if (leads && ["ACTIVE", "PAST_DUE"].includes(leads.status)) {
      leadsStatus =
        leads.trialEndsAt && new Date(leads.trialEndsAt) > now
          ? "TRIAL"
          : leads.status === "PAST_DUE"
            ? "PAST_DUE"
            : "ACTIVE";
    }

    await client.query(
      `insert into clients (id, business, city, state, phone, website_url, signed_up_at, approved_at, archived_at,
        notes, stripe_customer_id, leads_status, leads_started_at, leads_trial_ends_at, leads_subscription_id, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        p.id,
        p.businessName,
        p.city,
        p.state,
        p.phone,
        p.website,
        iso(p.createdAt),
        iso(approvedAt),
        stale ? iso(now) : null,
        p.internalNotes,
        p.stripeCustomerId,
        leadsStatus,
        leads ? iso(leads.createdAt) : null,
        leads ? iso(leads.trialEndsAt) : null,
        leads?.stripeSubscriptionId ?? null,
        iso(p.createdAt),
        iso(p.updatedAt),
      ],
    );
    bump(stale ? "clients archived (old, unfinished sign-ups)" : "clients");

    if (hasWebsite) {
      const monthly =
        web?.monthlyAmountCents || web?.planAmountCents || p.monthlyAmountCents;
      const plan = monthly > 19900 ? "FULL_PLATFORM" : "WEBSITE_ONLY";
      const status =
        web?.status === "PAST_DUE"
          ? "PAST_DUE"
          : web?.status === "CANCELLED"
            ? "CANCELLED"
            : web?.cancelAtPeriodEnd
              ? "CANCELLING"
              : "ACTIVE";

      // The build, as dated facts.
      const live = p.onboardingStage === "SITE_LIVE";
      const launchedAt = live ? (stageAt("SITE_LIVE") ?? p.updatedAt) : null;
      const fallback = (name) =>
        reached(name) ? (stageAt(name) ?? launchedAt) : null;
      const agreement = docs.find(
        (d) =>
          d.clientProfileId === p.id &&
          d.type === "SERVICE_AGREEMENT" &&
          d.signedAt,
      );
      const paid = myInvoices.filter((i) => i.status === "PAID");
      const setupPaid =
        p.setupFeePaid || web?.setupFeePaid
          ? (paid.find((i) => /setup/i.test(i.description ?? ""))?.paidAt ??
            paid[0]?.paidAt ??
            web?.createdAt ??
            approvedAt)
          : null;
      const q = quests.find((x) => x.clientProfileId === p.id);
      const mySections = sections.filter((s) =>
        pages.some((pg) => pg.id === s.pageId && pg.clientProfileId === p.id),
      );
      const blueprintDone =
        mySections.length > 0 &&
        mySections.every((s) => s.status === "APPROVED")
          ? mySections.map((s) => s.updatedAt).sort((a, b) => b - a)[0]
          : null;
      const myDesigns = brand.filter(
        (b) => b.clientProfileId === p.id && b.label === "DESIGN_OPTION",
      );
      const chosen = myDesigns.find((b) => b.selected);

      const facts = {
        agreementSignedAt: agreement?.signedAt ?? fallback("AGREEMENT_SIGNED"),
        setupFeePaidAt: setupPaid ?? (live ? launchedAt : null),
        questionnaireSubmittedAt:
          q?.submittedAt ??
          (p.questionnaireSkipped
            ? approvedAt
            : fallback("QUESTIONNAIRE_SUBMITTED")),
        assetsCompleteAt: p.assetsSkipped
          ? approvedAt
          : fallback("ASSETS_UPLOADED"),
        blueprintApprovedAt: blueprintDone ?? (live ? launchedAt : null),
        designChosenAt: chosen?.updatedAt ?? fallback("DESIGN_REVIEW"),
        ...(plan === "FULL_PLATFORM"
          ? {
              stripeConnectedAt: launchedAt,
              ratesSetAt: launchedAt,
              driversAddedAt: launchedAt,
            }
          : { bookingLinkAddedAt: launchedAt }),
        previewReadyAt: live
          ? launchedAt
          : p.previewUrl && reached("DESIGN_REVIEW")
            ? stageAt("DESIGN_REVIEW")
            : null,
        previewApprovedAt: launchedAt,
        launchedAt,
      };
      const cleanFacts = Object.fromEntries(
        Object.entries(facts)
          .filter(([, v]) => v)
          .map(([k, v]) => [k, iso(v)]),
      );

      const designs = {
        ...(myDesigns.length ? { readyAt: iso(myDesigns[0].createdAt) } : {}),
        options: myDesigns.map((b) => ({
          id: b.id,
          name: b.templateName || b.fileName.replace(/\.[a-z0-9]+$/i, ""),
          mood: b.adminNote ?? "",
          palette: [],
          type: "",
          notes: b.clientNotes ? [b.clientNotes] : [],
          images: [b.fileUrl],
        })),
        ...(chosen
          ? { chosen: chosen.id, chosenAt: iso(chosen.updatedAt) }
          : {}),
      };

      await client.query(
        `insert into websites (client_id, plan, status, monthly_cents, setup_fee_cents, domain, live_url, preview_url,
          started_at, stripe_subscription_id, next_billing_at, facts, designs, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          p.id,
          plan,
          status,
          monthly,
          web?.setupFeeAmountCents ?? p.setupFeeAmountCents,
          host(p.liveUrl ?? p.website ?? ""),
          p.liveUrl,
          p.previewUrl,
          iso(approvedAt),
          web?.stripeSubscriptionId ?? p.stripeSubscriptionId ?? null,
          iso(onFirst(web?.currentPeriodEnd)),
          JSON.stringify(cleanFacts),
          JSON.stringify(designs),
          iso(p.createdAt),
          iso(now),
        ],
      );
      bump(
        `websites (${plan === "FULL_PLATFORM" ? "Full Platform" : "Website Only"})`,
      );
    }

    // Questionnaire: the old questions differ, so the old answers are kept
    // as they were, for reference.
    const q = quests.find((x) => x.clientProfileId === p.id);
    if (q) {
      await client.query(
        `insert into questionnaires (client_id, answers, legacy_answers, saved_at, submitted_at) values ($1,'{}',$2,$3,$4)`,
        [
          p.id,
          q.answers ? JSON.stringify(q.answers) : null,
          iso(q.lastSavedAt),
          iso(q.submittedAt),
        ],
      );
      bump("questionnaires");
    }

    // Activity, from the old stage log.
    for (const l of myLog) {
      const entry = STAGE_TEXT[l.toStage];
      if (!entry) continue;
      await client.query(
        `insert into activity (id, client_id, kind, text, created_at) values ($1,$2,$3,$4,$5)`,
        [createId(), p.id, entry[0], entry[1], iso(l.createdAt)],
      );
      bump("activity");
    }
  }

  // Users, after their clients exist.
  for (const u of users) {
    const email = String(u.email).trim().toLowerCase();
    if (seenEmails.has(email)) {
      log(`  skipped a second account for ${email}`);
      continue;
    }
    seenEmails.add(email);
    const profile = profiles.find(
      (p) => p.userId === u.id && clientIds.has(p.id),
    );
    // The old site only let verified emails sign in. Admins, and clients
    // who got past sign-up, were using it, so they count as verified too.
    const verified =
      u.emailVerified ??
      (u.password &&
      (isAdmin(u) || (profile && profile.onboardingStage !== "REGISTERED"))
        ? u.createdAt
        : null);
    await client.query(
      `insert into users (id, name, email, email_verified_at, password_hash, phone, role, is_owner, client_id, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        u.id,
        u.name ?? "",
        email,
        iso(verified),
        u.password,
        u.phone,
        isAdmin(u) ? "ADMIN" : "CLIENT",
        u.id === ownerId,
        profile?.id ?? null,
        iso(u.createdAt),
        iso(u.updatedAt),
      ],
    );
    bump(isAdmin(u) ? "admins" : "client logins");
  }

  const contactName = (profileId) => {
    const p = profiles.find((x) => x.id === profileId);
    return userById.get(p?.userId)?.name || p?.businessName || "Client";
  };
  const contactUserId = (profileId) =>
    profiles.find((x) => x.id === profileId)?.userId ?? null;

  /* ── Documents ── */
  for (const d of docs.filter((x) => clientIds.has(x.clientProfileId))) {
    await client.query(
      `insert into documents (id, client_id, title, summary, kind, status, file_url, file_name, sent_at, signed_at,
        signed_by, signed_ip, visible, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        d.id,
        d.clientProfileId,
        d.title,
        d.type === "SERVICE_AGREEMENT"
          ? "Your plan, the fees and what we build."
          : "",
        d.type === "SERVICE_AGREEMENT" ? "AGREEMENT" : "OTHER",
        d.status === "SIGNED"
          ? "SIGNED"
          : d.status === "PENDING_SIGNATURE"
            ? "AWAITING"
            : "INFO",
        d.fileUrl,
        d.fileName,
        iso(d.createdAt),
        iso(d.signedAt),
        d.signedAt ? contactName(d.clientProfileId) : null,
        d.signedByIp,
        d.visible,
        iso(d.createdAt),
      ],
    );
    bump("documents");
  }

  /* ── Brand assets (design options went to the website above) ── */
  const LABEL = {
    LOGO: "Logo",
    PHOTO: "Fleet photo",
    BRAND_GUIDE: "Brand guide",
    OTHER: "Other",
  };
  for (const b of brand.filter(
    (x) => clientIds.has(x.clientProfileId) && x.label !== "DESIGN_OPTION",
  )) {
    await client.query(
      `insert into assets (id, client_id, name, label, size_bytes, mime_type, url, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        b.id,
        b.clientProfileId,
        b.fileName,
        LABEL[b.label] ?? "Other",
        b.fileSize,
        b.mimeType,
        b.fileUrl,
        iso(b.createdAt),
      ],
    );
    bump("brand assets");
  }

  /* ── Blueprint ── */
  for (const pg of pages.filter((x) => clientIds.has(x.clientProfileId))) {
    const isHome = /^home$/i.test(pg.name.trim());
    await client.query(
      `insert into blueprint_pages (id, client_id, name, path, position, created_at) values ($1,$2,$3,$4,$5,$6)`,
      [
        pg.id,
        pg.clientProfileId,
        pg.name,
        isHome ? "/" : `/${slug(pg.name)}`,
        pg.position,
        iso(pg.createdAt),
      ],
    );
    bump("blueprint pages");
    for (const s of sections.filter((x) => x.pageId === pg.id)) {
      const copy = (s.copy ?? "")
        .split(/\n\s*\n/)
        .map((t) => t.trim())
        .filter(Boolean);
      await client.query(
        `insert into blueprint_sections (id, page_id, title, status, copy, position, updated_at) values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          s.id,
          pg.id,
          s.title,
          s.status,
          JSON.stringify(copy),
          s.position,
          iso(s.updatedAt),
        ],
      );
      bump("blueprint sections");
      for (const c of comments.filter((x) => x.sectionId === s.id)) {
        const studio = c.authorType !== "client";
        await client.query(
          `insert into blueprint_comments (id, section_id, author, name, text, created_at) values ($1,$2,$3,$4,$5,$6)`,
          [
            c.id,
            s.id,
            studio ? "STUDIO" : "CLIENT",
            studio
              ? (userById.get(ownerId)?.name ?? "Fonts & Footers")
              : contactName(pg.clientProfileId),
            c.text,
            iso(c.createdAt),
          ],
        );
        bump("blueprint comments");
      }
    }
  }

  /* ── Change requests ── */
  const numbers = new Map();
  for (const c of changes.filter((x) => clientIds.has(x.clientProfileId))) {
    const n = (numbers.get(c.clientProfileId) ?? 0) + 1;
    numbers.set(c.clientProfileId, n);
    await client.query(
      `insert into change_requests (id, client_id, number, title, area, details, status, reply, submitted_at, updated_at, completed_at)
       values ($1,$2,$3,$4,'Whole site',$5,$6,$7,$8,$9,$10)`,
      [
        c.id,
        c.clientProfileId,
        n,
        c.title,
        c.description,
        c.status,
        c.adminNotes,
        iso(c.createdAt),
        iso(c.updatedAt),
        iso(c.completedAt),
      ],
    );
    await client.query(
      `insert into activity (id, client_id, kind, text, created_at) values ($1,$2,'change',$3,$4)`,
      [
        createId(),
        c.clientProfileId,
        `You asked for: ${c.title}`,
        iso(c.createdAt),
      ],
    );
    bump("change requests");
  }

  /* ── Support tickets become conversations ── */
  for (const t of tickets.filter((x) => clientIds.has(x.clientProfileId))) {
    const status =
      t.status === "CLOSED" ? "CLOSED" : t.adminReply ? "ANSWERED" : "OPEN";
    await client.query(
      `insert into threads (id, client_id, subject, status, client_unread, created_at, updated_at) values ($1,$2,$3,$4,false,$5,$6)`,
      [
        t.id,
        t.clientProfileId,
        t.subject,
        status,
        iso(t.createdAt),
        iso(t.repliedAt ?? t.createdAt),
      ],
    );
    await client.query(
      `insert into messages (id, thread_id, author, user_id, name, text, created_at) values ($1,$2,'CLIENT',$3,$4,$5,$6)`,
      [
        createId(),
        t.id,
        contactUserId(t.clientProfileId),
        contactName(t.clientProfileId),
        t.message,
        iso(t.createdAt),
      ],
    );
    if (t.adminReply) {
      const by = userById.get(t.repliedById) ?? userById.get(ownerId);
      await client.query(
        `insert into messages (id, thread_id, author, user_id, name, text, created_at) values ($1,$2,'STUDIO',$3,$4,$5,$6)`,
        [
          createId(),
          t.id,
          by?.id ?? null,
          by?.name ?? "Fonts & Footers",
          t.adminReply,
          iso(t.repliedAt ?? t.updatedAt),
        ],
      );
    }
    bump("conversations");
  }

  /* ── Invoices ── */
  for (const i of invoices.filter((x) => clientIds.has(x.clientProfileId))) {
    // Drafts and voided ones come over as VOID: hidden, but their numbers
    // stay taken, so a number is never used twice.
    const status =
      i.status === "PAID" ? "PAID" : i.status === "OPEN" ? "DUE" : "VOID";
    const product = /setup/i.test(i.description ?? "")
      ? "SETUP"
      : i.productType === "LEADS"
        ? "LEADS"
        : "WEBSITE";
    // Monthly bills: on the 1st, Arizona time, and the period ends the day
    // before the next one starts.
    const day = (d) =>
      product === "SETUP" ? (d ? new Date(d) : null) : onFirst(d);
    const periodEnd = i.periodEnd
      ? new Date(day(i.periodEnd).getTime() - 86_400_000)
      : null;
    await client.query(
      `insert into invoices (id, client_id, number, stripe_invoice_id, description, amount_cents, status, issued_at,
        period_start, period_end, paid_at, product, emailed_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        i.id,
        i.clientProfileId,
        i.invoiceNumber,
        i.stripeInvoiceId,
        i.description ?? (product === "SETUP" ? "Setup fee" : "Monthly plan"),
        i.amountCents,
        status,
        iso(day(i.createdAt)),
        iso(day(i.periodStart)),
        iso(periodEnd),
        iso(day(i.paidAt)),
        product,
        iso(day(i.paidAt)),
        iso(i.createdAt),
      ],
    );
    if (status === "PAID") {
      await client.query(
        `insert into activity (id, client_id, kind, text, created_at) values ($1,$2,'invoice',$3,$4)`,
        [
          createId(),
          i.clientProfileId,
          `Paid ${i.invoiceNumber}: $${(i.amountCents / 100).toLocaleString("en-US")}`,
          iso(day(i.paidAt)),
        ],
      );
    }
    bump("invoices");
  }

  /* ── Out of the way: kept as they were, in their own schema ── */
  await client.query(`create schema if not exists old_site`);
  const present = new Set(
    (
      await all(
        client,
        `select table_name from information_schema.tables where table_schema = 'public'`,
      )
    ).map((r) => r.table_name),
  );
  for (const t of OLD_TABLES)
    if (present.has(t))
      await client.query(`alter table "${t}" set schema old_site`);
  const types = new Set(
    (
      await all(
        client,
        `select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public'`,
      )
    ).map((r) => r.typname),
  );
  for (const e of OLD_ENUMS)
    if (types.has(e))
      await client.query(`alter type "${e}" set schema old_site`);

  // The Leads Tool starts switched off for Full Platform clients, until
  // their market's first run is in (Admin → Leads Tool switches it on).
  await client.query(
    `update clients set leads_enabled = false
     where id in (select client_id from websites where plan = 'FULL_PLATFORM')`,
  );

  await client.query(
    `insert into app_settings (key, value) values ('imported_from_old_site', $1)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify({ at: now.toISOString(), counts })],
  );
  return counts;
}
