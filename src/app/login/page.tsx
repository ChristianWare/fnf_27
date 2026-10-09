import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Login from "@/components/LoginPage/Login/Login";
import { getSessionUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/users";

export const metadata: Metadata = {
  title: "Client login",
  description:
    "Sign in to your Fonts & Footers dashboard: your project, your growth and your plan.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Already signed in: straight to the dashboard, or the admin.
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  const { next } = await searchParams;
  return <Login next={typeof next === "string" ? next : undefined} />;
}
