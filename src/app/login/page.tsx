import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthFrame, { DASHBOARD_NOTE } from "@/components/LoginPage/Login/Login";
import LoginForm from "@/components/LoginPage/Login/LoginForm";
import { getSessionUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/users";

export const metadata: Metadata = {
  title: "Client login",
  description:
    "Sign in to your Fonts & Footers dashboard: your project, your growth and your plan.",
  robots: { index: false, follow: false },
};

const one = (value?: string | string[]) =>
  typeof value === "string" ? value : undefined;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Already signed in: straight to the dashboard, or the admin.
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  const params = await searchParams;
  const notice =
    one(params.verified) === "1"
      ? {
          tone: "good" as const,
          text: "Your email is confirmed. Sign in to get started.",
        }
      : one(params.verify) === "expired"
        ? {
            tone: "bad" as const,
            text: "That link has expired. Sign in and we'll offer to send a new one.",
          }
        : undefined;

  return (
    <AuthFrame
      eyebrow='Client login'
      title='Welcome back'
      intro='Sign in to follow your build, see how your site is growing and manage your plan.'
      note={DASHBOARD_NOTE}
    >
      <LoginForm
        next={one(params.next)}
        email={one(params.email)}
        notice={notice}
      />
    </AuthFrame>
  );
}
