// Cloudflare Turnstile: the "are you a person?" check on the contact and
// sign-up forms. Without TURNSTILE_SECRET_KEY (local development) it's
// skipped. Server only.

export async function humanCheck(token: string | undefined, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch (error) {
    console.error("[turnstile] check failed:", error);
    return false;
  }
}
