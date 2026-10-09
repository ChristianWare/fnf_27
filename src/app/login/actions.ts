"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  authConfigured,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";
import { VIEW_AS_COOKIE } from "@/lib/auth/dal";
import {
  SAMPLE_PASSWORD,
  findUserByEmail,
  homeFor,
  type User,
} from "@/lib/auth/users";

export type SignInState = { error?: string; email?: string };

// Compares two passwords in the same time whether they match or not.
const digest = (value: string) => createHash("sha256").update(value).digest();
const matches = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

// After signing in, only ever go back to a page this person may see:
// clients to their dashboard, admins to the admin.
const safeNext = (value: FormDataEntryValue | null, user: User) => {
  const area = user.role === "ADMIN" ? "admin" : "dashboard";
  const pattern = new RegExp(`^/${area}(/[\\w\\-/]*)?(\\?.*)?$`);
  return typeof value === "string" && pattern.test(value)
    ? value
    : homeFor(user);
};

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
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

  const user = findUserByEmail(email);
  // Check a password even when there's no account, so both take as long.
  const passwordOk = matches(password, user ? SAMPLE_PASSWORD : "\u0000");
  if (!user || !passwordOk) {
    return {
      error:
        "That email and password don't match. Try again, or email hello@fontsandfooters.com.",
      email,
    };
  }

  const { token, expires } = await signSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  redirect(safeNext(formData.get("next"), user));
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(VIEW_AS_COOKIE);
  redirect("/login");
}
