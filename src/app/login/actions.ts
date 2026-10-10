"use server";

// Signing in and out, signing up, confirming an email and choosing a new
// password. Every one of these is slowed down after a few tries.

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  SESSION_COOKIE,
  authConfigured,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";
import { VIEW_AS_COOKIE } from "@/lib/auth/dal";
import {
  accountForSignIn,
  checkPassword,
  clearAttempts,
  createToken,
  findUserByEmail,
  hashPassword,
  normalEmail,
  passwordProblem,
  tooMany,
  consumeToken,
} from "@/lib/auth/accounts";
import { homeFor, type Role } from "@/lib/auth/users";
import { addActivity } from "@/lib/data/write";
import { createId } from "@/lib/server/ids";
import { url } from "@/lib/server/config";
import { emailPerson } from "@/lib/server/notify";
import { humanCheck } from "@/lib/server/turnstile";
import { botReason, botText, STAMP_FIELD, TRAP_FIELD } from "@/lib/server/spam";
import { LEADS, PLANS } from "@/lib/dashboard/plans";

const SUPPORT = "hello@fontsandfooters.com";

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

async function startSession(userId: string) {
  const { token, expires } = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  await db
    .update(schema.users)
    .set({ lastActiveAt: new Date() })
    .where(eq(schema.users.id, userId));
}

// After signing in, only ever go back to a page this person may see:
// clients to their dashboard, admins to the admin.
const safeNext = (value: FormDataEntryValue | null, role: Role) => {
  const area = role === "ADMIN" ? "admin" : "dashboard";
  const pattern = new RegExp(`^/${area}(/[\\w\\-/]*)?(\\?[\\w\\-=&%.]*)?$`);
  return typeof value === "string" && pattern.test(value)
    ? value
    : homeFor({ role });
};

/* ── Sign in ── */

export type SignInState = {
  error?: string;
  email?: string;
  /** Signed up but hasn't clicked the link yet. */
  unverified?: boolean;
};

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = normalEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and your password.", email };
  }
  if (!authConfigured()) {
    return {
      error:
        "Sign-in isn't set up on this server yet: add AUTH_SECRET to the environment variables.",
      email,
    };
  }

  const ip = await clientIp();
  if (
    (await tooMany(`signin:${email}`, 8, 15)) ||
    (await tooMany(`signin-ip:${ip}`, 40, 15))
  ) {
    return {
      error:
        "Too many tries. Wait 15 minutes, or reset your password from the link below.",
      email,
    };
  }

  const row = await accountForSignIn(email);
  const ok = await checkPassword(row?.user.passwordHash, password);
  if (!row || !ok) {
    return {
      error:
        "That email and password don't match. Try again, or reset your password.",
      email,
    };
  }
  const { user, archivedAt } = row;
  if (user.role === "CLIENT" && archivedAt && archivedAt <= new Date()) {
    return {
      error: `This account is closed. If that's a mistake, email ${SUPPORT}.`,
      email,
    };
  }
  if (!user.emailVerifiedAt) {
    return {
      error:
        "Confirm your email first: click the link we sent you when you signed up.",
      email,
      unverified: true,
    };
  }

  await clearAttempts(`signin:${email}`);
  await startSession(user.id);
  redirect(safeNext(formData.get("next"), user.role));
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(VIEW_AS_COOKIE);
  redirect("/login");
}

/* ── Confirming an email ── */

async function sendVerification(userId: string, email: string, name: string) {
  const token = await createToken(userId, "VERIFY");
  await emailPerson(email, "Confirm your email for Fonts & Footers", {
    eyebrow: "One more step",
    heading: `Confirm your email, ${name.split(" ")[0] || "there"}`,
    paragraphs: [
      "Click the button to confirm this is your email. Then sign in to your dashboard.",
    ],
    button: {
      label: "Confirm my email",
      href: url(`/verify-email?token=${token}`),
    },
    after: [
      "The link works for 48 hours. If you didn't sign up, ignore this email and nothing happens.",
    ],
  });
}

export type ResendState = { sent?: boolean; error?: string };

export async function resendVerification(
  _previous: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const email = normalEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Enter your email." };
  if (await tooMany(`verify:${email}`, 3, 60)) {
    return {
      error:
        "We've sent a few already. Check your spam folder, or try again in an hour.",
    };
  }
  const user = await findUserByEmail(email);
  if (user && !user.emailVerifiedAt) {
    await sendVerification(user.id, user.email, user.name);
  }
  return { sent: true };
}

/* ── Signing up ── */

export type RegisterState = {
  error?: string;
  /** What they typed, to put back in the form. */
  values?: Record<string, string>;
};

const PLAN_CHOICES = ["FULL_PLATFORM", "WEBSITE_ONLY", "LEADS"] as const;
type PlanChoice = (typeof PLAN_CHOICES)[number];

const planLabel = (plan: PlanChoice) =>
  plan === "LEADS" ? LEADS.name : PLANS[plan].name;

export async function register(
  _previous: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  const values = {
    name: get("name").slice(0, 120),
    business: get("business").slice(0, 160),
    email: normalEmail(get("email")).slice(0, 200),
    phone: get("phone").slice(0, 40),
    city: get("city").slice(0, 120),
    website: get("website").slice(0, 300),
    message: get("message").slice(0, 2000),
    plan: get("plan"),
  };
  const password = String(formData.get("password") ?? "");
  const back = (error: string) => ({ error, values });

  if (values.name.length < 2) return back("Add your name.");
  if (values.business.length < 2) return back("Add your business name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    return back("That email doesn't look right.");
  if (values.city.length < 2)
    return back("Add the city you work from, e.g. Scottsdale, AZ.");
  if (!PLAN_CHOICES.includes(values.plan as PlanChoice))
    return back("Choose what you'd like to start with.");
  const weak = passwordProblem(password);
  if (weak) return back(weak);
  if (!authConfigured())
    return back("Sign-up isn't set up on this server yet.");

  // A bot in the trap field is sent to the "check your email" page like
  // anyone else, and nothing is made. A form posted in under a few
  // seconds, or left open all day, gets a plain answer and a second go.
  // (What they typed isn't judged here: a business can be called after
  // its website.)
  const bot = botReason({
    trap: get(TRAP_FIELD),
    stamp: get(STAMP_FIELD) || undefined,
    names: [],
    message: "",
  });
  if (bot === "trap") {
    console.warn(`[register] bot turned away: ${values.email}`);
    redirect(`/register/check-email?email=${encodeURIComponent(values.email)}`);
  }
  if (bot) return back(botText(bot));

  const ip = await clientIp();
  if (await tooMany(`register-ip:${ip}`, 6, 60)) {
    return back(
      `Too many sign-ups from here. Try again in an hour, or email ${SUPPORT}.`,
    );
  }
  const human = await humanCheck(
    String(formData.get("cf-turnstile-response") ?? ""),
    ip,
  );
  if (!human) return back("Please tick the box to show you're not a robot.");

  const plan = values.plan as PlanChoice;
  const existing = await findUserByEmail(values.email);
  if (existing) {
    if (!existing.emailVerifiedAt && existing.role === "CLIENT") {
      // Signed up before and never confirmed: send the link again.
      await sendVerification(existing.id, existing.email, existing.name);
      redirect(
        `/register/check-email?email=${encodeURIComponent(existing.email)}`,
      );
    }
    return back(
      "There's already an account with that email. Sign in, or reset your password.",
    );
  }

  const [cityName, state] = values.city.split(",").map((part) => part.trim());
  const clientId = createId();
  const userId = createId();
  const passwordHash = await hashPassword(password);
  const site = values.website
    ? /^https?:\/\//i.test(values.website)
      ? values.website
      : `https://${values.website}`
    : null;

  await db.transaction(async (tx) => {
    await tx.insert(schema.clients).values({
      id: clientId,
      business: values.business,
      city: cityName || values.city,
      state: state || null,
      phone: values.phone || null,
      websiteUrl: site,
      requestPlan: plan,
      requestMessage: values.message || null,
    });
    await tx.insert(schema.users).values({
      id: userId,
      name: values.name,
      email: values.email,
      passwordHash,
      phone: values.phone || null,
      title: "Owner",
      clientId,
    });
    await addActivity(
      clientId,
      plan === "LEADS" ? "leads" : "build",
      `You signed up for the ${planLabel(plan)}`,
      undefined,
      tx,
    );
  });

  await sendVerification(userId, values.email, values.name);
  redirect(`/register/check-email?email=${encodeURIComponent(values.email)}`);
}

/* ── Forgot password ── */

export type ForgotState = { sent?: boolean; error?: string; email?: string };

export async function forgotPassword(
  _previous: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = normalEmail(String(formData.get("email") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter the email you sign in with.", email };
  }
  const ip = await clientIp();
  if (
    (await tooMany(`reset:${email}`, 3, 60)) ||
    (await tooMany(`reset-ip:${ip}`, 12, 60))
  ) {
    return {
      error:
        "We've sent a few already. Check your spam folder, or try again in an hour.",
      email,
    };
  }

  const row = await accountForSignIn(email);
  const closed =
    row?.user.role === "CLIENT" &&
    row.archivedAt &&
    row.archivedAt <= new Date();
  if (row && !closed) {
    const token = await createToken(row.user.id, "RESET");
    await emailPerson(row.user.email, "Reset your Fonts & Footers password", {
      eyebrow: "Password",
      heading: "Choose a new password",
      paragraphs: [
        "Someone (hopefully you) asked to reset the password for your Fonts & Footers dashboard. Click the button to choose a new one.",
      ],
      button: {
        label: "Choose a new password",
        href: url(`/reset-password?token=${token}`),
      },
      after: [
        "The link works for one hour. If you didn't ask for this, ignore this email: your password stays as it is.",
      ],
    });
  }
  // The same answer either way, so this can't be used to find accounts.
  return { sent: true, email };
}

/* ── A new password, from a reset or an invite link ── */

export type PasswordState = { error?: string };

export async function setNewPassword(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const weak = passwordProblem(password);
  if (weak) return { error: weak };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const used = await consumeToken(token, ["RESET", "INVITE"]);
  if (!used) {
    return {
      error: "This link has expired or been used. Ask for a new one below.",
    };
  }

  const now = new Date();
  now.setMilliseconds(0);
  const [user] = await db
    .update(schema.users)
    .set({
      passwordHash: await hashPassword(password),
      // Getting the email proves the address.
      emailVerifiedAt: now,
      // Signs out every other session.
      sessionsValidAfter: now,
      updatedAt: now,
    })
    .where(eq(schema.users.id, used.userId))
    .returning();
  if (!user) return { error: "We couldn't find that account." };

  await clearAttempts(`signin:${user.email}`);
  await startSession(user.id);
  redirect(homeFor(user));
}
