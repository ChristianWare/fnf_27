import type { Metadata } from "next";
import AuthFrame, { DASHBOARD_NOTE } from "@/components/LoginPage/Login/Login";
import { EMAIL_NAMES, checkLink } from "@/lib/server/unsubscribe";
import UnsubscribeForm from "./UnsubscribeForm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v?: string | string[]) => (typeof v === "string" ? v : "");
  const u = one(params.u);
  const k = one(params.k);
  const s = one(params.s);
  const ok = checkLink(u, k, s);

  return (
    <AuthFrame
      eyebrow='Emails'
      title={ok ? "Unsubscribe" : "This link doesn't work"}
      intro={
        ok
          ? `Stop getting emails about ${EMAIL_NAMES[k]}? Everything else, like billing and account emails, still comes through.`
          : "Choose which emails you get from your profile instead."
      }
      note={DASHBOARD_NOTE}
    >
      {ok && <UnsubscribeForm u={u} k={k} s={s} what={EMAIL_NAMES[k]} />}
    </AuthFrame>
  );
}
